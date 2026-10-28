/**
 * Lux Acompanhantes API — Cloudflare Worker + D1
 * Required Worker secret: ADMIN_TOKEN (long random value)
 * Required binding: DB (Cloudflare D1 database)
 * Optional variable: ALLOWED_ORIGIN (exact GitHub Pages URL)
 */
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
function cors(response, origin, allowed) {
  const h = new Headers(response.headers);
  if (origin && allowed && origin === allowed) {
    h.set("access-control-allow-origin", origin);
    h.set("vary", "Origin");
    h.set("access-control-allow-methods", "GET, POST, PATCH, OPTIONS");
    h.set("access-control-allow-headers", "Content-Type, Authorization");
  }
  return new Response(response.body, { status: response.status, headers: h });
}
function okOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN || "https://zecasemedo-hash.github.io";
  return { origin, allowed, ok: !origin || origin === allowed };
}
function isAdmin(request, env) {
  const token = env.ADMIN_TOKEN;
  const auth = request.headers.get("Authorization") || "";
  return !!token && auth === "Bearer " + token;
}
function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export default {
  async fetch(request, env) {
    const { origin, allowed, ok } = okOrigin(request, env);
    if (!ok) return cors(json({ error: "Origem não autorizada." }, 403), origin, allowed);
    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }), origin, allowed);
    }
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        return cors(json({ ok: true, service: "lux-api" }), origin, allowed);
      }
      if (url.pathname === "/api/profiles" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT id, public_name AS name, region AS city, description, whatsapp, photo_url AS photo, plan, created_at AS createdAt, expires_at AS expiresAt FROM profiles WHERE status = 'approved' AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY is_featured DESC, created_at DESC"
        ).all();
        return cors(json({ profiles: results || [] }), origin, allowed);
      }
      if (url.pathname === "/api/profiles" && request.method === "POST") {
        const body = await request.json();
        const name = cleanText(body.name, 60);
        const city = cleanText(body.city, 40);
        const description = cleanText(body.description, 600);
        const whatsapp = cleanText(body.whatsapp, 20).replace(/[^0-9]/g, "");
        const photoUrl = cleanText(body.photoUrl, 500);
        const plan = body.plan === "premium" ? "premium" : body.plan === "featured" ? "featured" : "standard";
        const regions = ["Lisboa","Porto","Setúbal","Faro","Coimbra","Braga","Leiria","Aveiro","Évora","Madeira","Açores"];
        if (name.length < 2 || !regions.includes(city) || description.length < 10) {
          return cors(json({ error: "Verifique o nome, a região e a descrição." }, 400), origin, allowed);
        }
        if (whatsapp && whatsapp.length < 9) return cors(json({ error: "Número de contacto inválido." }, 400), origin, allowed);
        if (photoUrl && !/^https:\/\//i.test(photoUrl)) return cors(json({ error: "A fotografia tem de usar HTTPS." }, 400), origin, allowed);
        const id = crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO profiles (id, public_name, region, description, whatsapp, photo_url, plan, status, payment_received, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, datetime('now'))"
        ).bind(id, name, city, description, whatsapp, photoUrl, plan).run();
        return cors(json({ ok: true, id, status: "pending", message: "Pedido recebido. O anúncio só será publicado depois da aprovação." }, 201), origin, allowed);
      }
      if (url.pathname === "/api/admin/profiles" && request.method === "GET") {
        if (!isAdmin(request, env)) return cors(json({ error: "Não autorizado." }, 401), origin, allowed);
        const { results } = await env.DB.prepare(
          "SELECT id, public_name AS name, region AS city, description, whatsapp, photo_url AS photo, plan, status, payment_received AS paymentReceived, created_at AS createdAt, expires_at AS expiresAt FROM profiles ORDER BY created_at DESC"
        ).all();
        return cors(json({ profiles: results || [] }), origin, allowed);
      }
      const match = url.pathname.match(/^\/api\/admin\/profiles\/([a-f0-9-]+)$/i);
      if (match && request.method === "PATCH") {
        if (!isAdmin(request, env)) return cors(json({ error: "Não autorizado." }, 401), origin, allowed);
        const body = await request.json();
        const status = body.status;
        const paymentReceived = body.paymentReceived === true ? 1 : body.paymentReceived === false ? 0 : null;
        if (!["pending", "approved", "rejected", "paused"].includes(status)) {
          return cors(json({ error: "Estado inválido." }, 400), origin, allowed);
        }
        if (status === "approved" && body.paymentReceived !== true) {
          return cors(json({ error: "Confirme o pagamento antes de aprovar." }, 400), origin, allowed);
        }
        const days = status === "approved" && body.plan === "premium" ? 30 : status === "approved" && body.plan === "featured" ? 7 : null;
        const expirySql = days ? "datetime('now', ?)" : "NULL";
        const expiryArg = days ? "+" + days + " days" : null;
        if (days) {
          await env.DB.prepare("UPDATE profiles SET status = ?, payment_received = ?, expires_at = " + expirySql + ", updated_at = datetime('now') WHERE id = ?")
            .bind(status, paymentReceived ?? 0, expiryArg, match[1]).run();
        } else {
          await env.DB.prepare("UPDATE profiles SET status = ?, payment_received = COALESCE(?, payment_received), updated_at = datetime('now') WHERE id = ?")
            .bind(status, paymentReceived, match[1]).run();
        }
        return cors(json({ ok: true, id: match[1], status }), origin, allowed);
      }
      return cors(json({ error: "Não encontrado." }, 404), origin, allowed);
    } catch (error) {
      return cors(json({ error: "Erro interno. Verifique a configuração da API e da base de dados." }, 500), origin, allowed);
    }
  }
};