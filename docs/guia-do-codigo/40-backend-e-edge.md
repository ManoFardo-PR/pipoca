# 40 · backend e edge

← [Mapa geral](00-MAPA-GERAL.md) · [Glossário](90-GLOSSARIO.md)

Duas metades: os **clientes keyless** no dispositivo ([`src/backend/`](../../src/backend/))
e as **3 Edge Functions** no servidor ([`functions/`](../../functions/)). A linha que
as separa é a fronteira mais importante do sistema.

## A fronteira da credencial (a lei)

> **As 4 chaves de provedor pago vivem SÓ nas edges. O cliente é keyless.
> "Grep de chave em `src/` = zero."**

- As chaves `ANTHROPIC_API_KEY` · `OPENAI_API_KEY` · `GEMINI_API_KEY` ·
  `DEEPSEEK_API_KEY` são lidas **apenas dentro das edges**, via `Deno.env.get(...)`
  (secrets do ambiente da função). Deploy com `verify_jwt`: a plataforma rejeita
  requisição sem bearer válido.
- O cliente manda só o **bearer do usuário + a anon key pública** (RLS protege).
  [`pipoca.config.js`](../../pipoca.config.js) carrega apenas a anon key — nenhum
  segredo. A única `apiKey` em `src/` que parece "chave" é a anon key pública do
  Supabase.
- O único `apiKey`/`x-goog-api-key` em `src/` está em
  [`src/core/realizador/provedor_realizador.ts`](../../src/core/realizador/provedor_realizador.ts),
  e **chega por parâmetro** (contexto de edge), nunca lido do cliente.
- Testes trancam a invariante (a suíte de `src/backend/` asserta que não há
  chave/autorização de provedor no cliente).

## As 3 edges (`functions/*/index.ts`, Deno, fora do `tsc` do app)

| Edge | O que faz | Falha (não-200) vira… |
|---|---|---|
| [`proxy-ia/index.ts`](../../functions/proxy-ia/index.ts) | **Geração 1** keyless: o servidor escolhe provedor/modelo pela `config_ia` do tenant, checa cota/custo em `uso_ia` ANTES de chamar, roda guardrails de entrada/saída, chama o LLM pago e devolve `{texto, ehFinal}`. | degradação no cliente para o _simulado_ / Motor A |
| [`realizador/index.ts`](../../functions/realizador/index.ts) | **Geração 2** (irmã da proxy-ia): recebe um _Pacote_ + prompt e roda a _cascata_ INTEIRA no servidor (retry/fallback entre provedores) numa viagem de rede, valida fidelidade (→ _veredito_) e devolve o texto realizado. | _fallback_ A+ v3 **local** no dispositivo |
| [`admin-chaves-ia/index.ts`](../../functions/admin-chaves-ia/index.ts) | Gestão **write-only** das chaves de provedor (`{acao: "status"\|"salvar"\|"testar"}`); guarda as chaves em tabela deny-all `chaves_ia`. | — (resposta **sempre mascarada** `"****ab12"`; a chave nunca volta ao cliente) |

> O _fallback_ A+ v3 **não** vive na edge — roda no dispositivo, então independe da
> rede. A criança nunca vê erro: qualquer não-200 vira fallback local.

## Os clientes keyless + a plataforma (`src/backend/`)

- [`proxy_realizador.ts`](../../src/backend/proxy_realizador.ts) — cliente keyless da edge `realizador` (geração 2).
  O cliente da edge `proxy-ia` (geração 1) saiu no D4; a própria edge se aposenta em E3.
- [`espelho_admin.ts`](../../src/backend/espelho_admin.ts) — espelho remoto **admin-only**
  (chama a edge `admin-chaves-ia` via `statusChavesIa`/`salvarChaveIa`/`testarChaveIa`);
  importado só por [`bridge_admin.ts`](../../src/admin/bridge_admin.ts).
- [`backend.ts`](../../src/backend/backend.ts) — a fachada do backend.
- [`config.ts`](../../src/backend/config.ts) · [`tenant.ts`](../../src/backend/tenant.ts) ·
  [`sync.ts`](../../src/backend/sync.ts) · [`auth.ts`](../../src/backend/auth.ts) ·
  [`flags_globais.ts`](../../src/backend/flags_globais.ts) ·
  [`limites_familia.ts`](../../src/backend/limites_familia.ts) ·
  [`migracao.ts`](../../src/backend/migracao.ts).
- Adaptadores [`adaptadores/`](../../src/backend/adaptadores/) — repositórios e auth
  plugáveis: `repo_local.ts`, `repo_supabase.ts`, `repo_sincronizado.ts`,
  `fila_remota.ts`, `auth_supabase.ts`. Os provedores são `local` e `supabase`
  (o ramo firebase foi aposentado no D5 — decisão de ficar no Supabase;
  registro em [PARIDADE.md](../plans/fase06_backend/PARIDADE.md)).
- Como publicar edges/SQL no projeto real (Management API) e as pegadinhas de
  provedor: [docs/notas/supabase-deploy-real.md](../notas/supabase-deploy-real.md).

## Dados (sem cabeçalho de código)

- SQL em [`src/backend/adaptadores/`](../../src/backend/adaptadores/):
  `rls_supabase.sql` (políticas RLS) e as migrações `migracao_2026-07-06_admin_remoto.sql`,
  `migracao_2026-07-06_historias_freemium.sql`, `migracao_2026-07-12_config_plataforma.sql`.

## Como rodar
Os clientes entram nos bundles (`build:app`/`build:admin`) e são cobertos por
`bun run test`. As edges são deployadas na plataforma Supabase (Deno); o smoke de
produção que as exercita de verdade está em [60 · scripts](60-scripts.md)
(⚠️ gasta API paga).
