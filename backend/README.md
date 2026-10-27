# Lux Acompanhantes — API inicial (Cloudflare Workers + D1)

Este backend é um esqueleto funcional de anúncios com moderação obrigatória. Ainda não está publicado nem ligado ao site. Não aceita fotografias, não faz verificação documental de idade/identidade e a confirmação no formulário não substitui essa verificação.

## 1. Criar base de dados D1
No Cloudflare, criar uma base D1 chamada `lux-listings`. Executar `schema.sql` no editor SQL da base de dados.

## 2. Criar Worker
Criar um Worker separado chamado `lux-acompanhantes-api` (não alterar o Worker do ROBOT HQ). Colar o conteúdo de `worker.js`.

Adicionar binding D1:
- Variable name: `DB`
- Database: `lux-listings`

Adicionar secret:
- Name: `ADMIN_TOKEN`
- Value: uma chave aleatória forte, guardada em segurança e nunca colocada no HTML nem no GitHub.

## 3. Rotas
- `GET /api/health` — estado do serviço
- `GET /api/listings` — anúncios aprovados
- `POST /api/listings` — envia anúncio para moderação
- `GET /api/admin/pending` — lista pendentes (token obrigatório)
- `POST /api/admin/listings/{id}` com `{"action":"publish"}` ou `{"action":"reject"}` — moderação (token obrigatório)

## 4. Antes de aceitar anúncios reais
Implementar processo robusto de verificação de idade e identidade, consentimento documentado e autorização de imagens, denúncias e remoção rápida, política de privacidade/RGPD, termos, limites anti-spam e auditoria de moderação. Não guardar documentos de identificação nesta base de dados. Confirmar com advogado e fornecedor de pagamentos que o modelo é permitido. O token de administração não deve ser partilhado nem exposto no navegador.

## Limitação atual
A API só fica online depois de criar a D1, configurar o binding e publicar o Worker. O site GitHub Pages não pode criar uma base de dados sozinho.