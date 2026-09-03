---
name: Deploy real no Supabase (pipoca)
description: Como publicar edge functions e rodar SQL no projeto Supabase real, e as pegadinhas de provedor de IA encontradas na validação de ponta a ponta.
---

# Deploy real no Supabase

Projeto real: ref `bamlljvllcxdnsheatqv` (pipoca, sa-east-1). URL/anon key públicas em `pipoca.config.js`.

**Como publicar (sem CLI do Supabase):** usar a Management API com o secret `SUPABASE_ACCESS_TOKEN` (Replit Secrets):
- SQL: `POST https://api.supabase.com/v1/projects/{ref}/database/query` com `{"query":"..."}`.
- Edge function: `POST .../functions/deploy?slug=<nome>` multipart com `metadata={"entrypoint_path":"index.ts","name":"<nome>","verify_jwt":true}` + `file=@index.ts`.
- Service role key: `GET .../api-keys?reveal=true` (nunca imprimir).
**Why:** não há CLI instalada nem workflow de deploy no repo; a Management API cobre tudo.
**How to apply:** qualquer mudança em `functions/*/index.ts` só vale em produção depois de redeployar por essa rota — o código do repo NÃO sincroniza sozinho (o proxy-ia ficou 2 versões atrás do repo e isso mascarou bugs).

**Bearer de operador para smoke:** `POST /auth/v1/admin/generate_link` (magiclink, service role) → `POST /auth/v1/verify` com `token_hash` + anon key → access_token. Não altera a senha do operador.

# Pegadinhas de provedor de IA (2026-07)

- Gemini: `generationConfig.responseSchema` REJEITA `additionalProperties` (400 INVALID_ARGUMENT). O proxy-ia saneia via `sanearSchemaGemini`; qualquer novo caminho Gemini precisa da mesma disciplina.
- Gemini: `gemini-2.5-flash` responde 404 "no longer available to new users" para contas novas — usar `gemini-flash-latest` (alias estável) na config. A config da plataforma (`config_ia` tenant `plataforma`) foi apontada para `gemini` + `gemini-flash-latest`.
- Teste de conexão (listar modelos) passa mesmo com billing esgotado — "testar OK" NÃO garante que a geração funciona (429/400 de créditos só aparecem no generate).
- Cascata do proxy-ia: se o primário falha (não-semChave) e o fallback está sem chave, o erro final vira 503 `nao_configurado` (semChave do fallback vence) — pode mascarar um 502 do primário ao diagnosticar.
