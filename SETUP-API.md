# Lux Acompanhantes — API de anúncios pendentes

Este repositório usa GitHub Pages para a interface estática. Para anúncios partilhados e aprovação segura é necessário publicar a API em Cloudflare Workers e criar uma base de dados Cloudflare D1.

## Ficheiros
- `worker.js`: API para criar anúncios pendentes, listar anúncios aprovados e administrar estados.
- `schema.sql`: esquema D1.

## Antes de usar em produção
1. Criar uma base de dados D1 e executar `schema.sql`.
2. Publicar `worker.js` como Worker.
3. Associar a base de dados com o binding **DB**.
4. Definir o segredo **ADMIN_TOKEN** com um token aleatório longo e privado.
5. Definir `ALLOWED_ORIGIN` como `https://zecasemedo-hash.github.io`.
6. Testar `/api/health`, criar um anúncio de teste e confirmar que só aparece depois de aprovação autenticada.
7. Criar uma página de administração com login seguro antes de usar o endpoint administrativo.

## API
- `GET /api/health`
- `GET /api/profiles` — só anúncios aprovados e dentro do prazo
- `POST /api/profiles` — cria anúncio pendente
- `GET /api/admin/profiles` — requer `Authorization: Bearer <ADMIN_TOKEN>`
- `PATCH /api/admin/profiles/:id` — requer token; para aprovar, enviar `{"status":"approved","paymentReceived":true,"plan":"standard|featured|premium"}`

## Planos previstos
- Destaque: 9,90 € / 7 dias
- Premium: 24,90 € / 30 dias

Os valores e prazos são regras de produto propostas, não um sistema de pagamento. O recebimento em mão deve ser confirmado manualmente. Não recolher dados de cartões nem armazenar o token no código público do site.

## Limitação atual
O frontend `index.html` ainda não está ligado a esta API. A API não está publicada nem configurada por este commit. Não anunciar o site como tendo anúncios partilhados até concluir a configuração, ligar o frontend, implementar autenticação de administração e testar a publicação.
