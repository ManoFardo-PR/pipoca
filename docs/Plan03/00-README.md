# Plan03 — Execução por ondas da varredura de 26/08/2026

Origem: `docs/auditorias/varredura-2026-08-26.md` (catálogo) e a lista de 13 grupos de
justificativa-fim. Aqui cada **onda** vira uma pasta e cada **subtarefa** vira um `.md`
autocontido: quem pegar um arquivo consegue executar e concluir a subtarefa sem abrir o
catálogo. Nenhuma subtarefa foi executada ao criar este plano.

**Como executar:** ver `01-PLANO-DE-EXECUCAO.md` (folha de decisões, sequência/paralelismo,
gates, git/deploy/rollback, protocolo de sessão, estimativas, riscos).

## Mapa das ondas

| Onda | Pasta | Grupos | Unidade de deploy | Subtarefas |
|---|---|---|---|---|
| A | `onda-A-seguranca/` | G1 consentimento e cota de IA | BUNDLE app + EDGE ×2 + SQL | A1–A5 |
| B | `onda-B-cru-ux/` | G2 tokens/a11y · G5 navegação da criança · G6 mecânica T4/T5/T7 · G9 admin/server | CRU (commit = deploy) | B1–B11 |
| C | `onda-C-bundle-app/` | G3 estante de histórias · G7 avatars · G8 superfície do cuidador | BUNDLE app | C1–C12 |
| D | `onda-D-bundle-app-admin/` | G4 sync remoto · G12 faxina · G13 pipeline/CI | BUNDLE app + admin | D1–D9 |
| E | `onda-E-edge-dados/` | G10 edges/pacote (ML-5) · G11 cenários como dado (ML-2) | BUNDLE app + EDGE + dados | E1–E6 |

Ordem recomendada: **A → B → C → D → E**. B é independente de A (pode rodar em paralelo em
branch própria). E depende de A (E1-E3) e de C (E5 depende de C5 se `cenas` for tratado lá).

## Unidades de deploy (o que decide onde cada coisa entra)

- **CRU** — servidos sem build pelo `server.js`: `src/telas/*.dc.html`, `src/componentes/*.dc.html`,
  `src/admin/**/*.dc.html`, `src/tokens.css`, `index.html`, `admin.html`, `landing.html`,
  `server.js`, `src/app/estado.js`, `src/admin/estadoAdmin.js`, `src/core/roteador.js`,
  `pipoca.config.js`, `docs/**/*.json` (grafo e fichas). **Commit = deploy.**
- **BUNDLE app** — `bun run build:app` (`src/app/bridge.ts` → `pipoca.bundle.js`): tudo em
  `src/core/**`, `src/backend/**`, `src/servicos/**`, `src/app/bridge.ts`.
- **BUNDLE admin** — `bun run build:admin` (`src/admin/bridge_admin.ts` → `pipoca.admin.bundle.js`):
  `src/admin/*.ts` + o mesmo `src/core`/`src/backend` (compartilhado — mexeu neles, rebuilda os dois).
- **EDGE** — `functions/<nome>/index.ts` → `deploy_edge_function` (MCP) ou `supabase functions deploy`.
- **SQL** — `apply_migration` (MCP) no projeto `bamlljvllcxdnsheatqv`; guardar o arquivo em
  `src/backend/migrations/AAAA-MM-DD_nome.sql` com o MESMO nome da versão aplicada.

## Regras do jogo (valem para todas as subtarefas)

1. **Git:** sempre `git rev-parse --abbrev-ref HEAD` antes de qualquer comando; refs explícitas;
   nunca `reset --hard`/`checkout` destrutivo (há sessões/worktrees paralelos disputando o HEAD).
   Uma branch por onda (`onda-A-seguranca` etc.), PR por subtarefa ou por grupo.
2. **Bundles:** um único `build:*` ao FINAL da onda (subtarefa de fechamento), e o bundle
   commitado no mesmo commit da fonte. Nunca commitar fonte sem bundle quando a unidade é BUNDLE.
3. **Verificação mínima antes de qualquer merge:** `bun x tsc --noEmit` · `npm test` ·
   `node tests/e2e/run-linha-verde-canonico.mjs` · `run-reordenar-miolo.mjs` · `run-admin.mjs` ·
   `run-geracao2-canonico.mjs` (175 checks, todos verdes hoje — é a régua).
4. **Supabase:** MCP só-leitura por padrão (`get_advisors`, `list_*`, `execute_sql` SELECT);
   `apply_migration`/`deploy_edge_function` só na subtarefa que os declara, após o dono liberar.
5. **Decisões do dono:** cada subtarefa lista as suas com um **default recomendado**; se o dono
   não se manifestar, executar o default e registrar no PR.
6. **Screenshots de prova:** o harness de captura da varredura está descrito em
   `onda-B-cru-ux/00-onda-B.md` (reaproveitar para antes/depois).
7. **Não reabrir o que já foi resolvido** (faxina, SQL de init-plan, docroot, Google nativo,
   D-09/D-10) — a varredura verificou que estão ok.

## Formato de cada subtarefa

`Objetivo` · `Por quê (evidência)` · `Escopo (arquivos:linhas)` · `Passos` ·
`Critérios de aceite` · `Verificação (comandos)` · `Riscos e cuidados` ·
`Decisões do dono (default)` · `Depende de / Desbloqueia` · `Unidade de deploy`.
