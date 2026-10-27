const SITE_ORIGIN = "https://zecasemedo-hash.github.io";

function cors(origin) {
  const allowed = origin === SITE_ORIGIN + "/lux-acompanhantes-" || origin === SITE_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : SITE_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Vary": "Origin"
  };
}
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}
function safeText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, service: "Lux Acompanhantes API", database: Boolean(env.DB) }, 200, headers);
    }
    if (!env.DB) return json({ error: "Base de dados não configurada." }, 503, headers);

    if (url.pathname === "/api/listings" && request.method === "GET") {
      const city = safeText(url.searchParams.get("city"), 60);
      const q = safeText(url.searchParams.get("q"), 100);
      let query = "SELECT id, public_name, city, description, created_at FROM listings WHERE status = 'published'";
      const binds = [];
      if (city) { query += " AND city = ?"; binds.push(city); }
      if (q) { query += " AND (public_name LIKE ? OR description LIKE ?)"; binds.push("%" + q + "%", "%" + q + "%"); }
      query += " ORDER BY created_at DESC LIMIT 100";
      const result = await env.DB.prepare(query).bind(...binds).all();
      return json({ listings: result.results || [] }, 200, headers);
    }

    if (url.pathname === "/api/listings" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "JSON inválido." }, 400, headers); }
      const name = safeText(body.publicName, 60);
      const city = safeText(body.city, 60);
      const description = safeText(body.description, 500);
      if (!name || !city || !description) return json({ error: "Preenche nome, região e descrição." }, 400, headers);
      if (body.ageConfirmed !== true || body.authorizedToPublish !== true) {
        return json({ error: "É necessário confirmar idade adulta e autorização para publicar." }, 400, headers);
      }
      // All submissions remain pending until a human moderator approves them.
      const id = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO listings (id, public_name, city, description, status, age_confirmed, authorized_to_publish, created_at) VALUES (?, ?, ?, ?, 'pending', 1, 1, datetime('now'))"
      ).bind(id, name, city, description).run();
      return json({ ok: true, id, status: "pending", message: "Anúncio recebido para moderação." }, 201, headers);
    }

    if (url.pathname === "/api/admin/pending" && request.method === "GET") {
      if (!env.ADMIN_TOKEN || request.headers.get("Authorization") !== "Bearer " + env.ADMIN_TOKEN) {
        return json({ error: "Não autorizado." }, 401, headers);
      }
      const result = await env.DB.prepare(
        "SELECT id, public_name, city, description, created_at FROM listings WHERE status = 'pending' ORDER BY created_at ASC LIMIT 200"
      ).all();
      return json({ listings: result.results || [] }, 200, headers);
    }

    if (url.pathname.startsWith("/api/admin/listings/") && request.method === "POST") {
      if (!env.ADMIN_TOKEN || request.headers.get("Authorization") !== "Bearer " + env.ADMIN_TOKEN) {
        return json({ error: "Não autorizado." }, 401, headers);
      }
      const id = decodeURIComponent(url.pathname.split("/").pop() || "");
      let body;
      try { body = await request.json(); } catch { return json({ error: "JSON inválido." }, 400, headers); }
      const action = body.action;
      if (!id || !["publish", "reject"].includes(action)) return json({ error: "Ação inválida." }, 400, headers);
      const status = action === "publish" ? "published" : "rejected";
      const result = await env.DB.prepare("UPDATE listings SET status = ? WHERE id = ? AND status = 'pending'").bind(status, id).run();
      if (!result.meta || result.meta.changes === 0) return json({ error: "Anúncio pendente não encontrado." }, 404, headers);
      return json({ ok: true, id, status }, 200, headers);
    }

    return json({ error: "Não encontrado." }, 404, headers);
  }
};