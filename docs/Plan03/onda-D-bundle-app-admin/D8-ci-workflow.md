# D8 — CI mínimo: typecheck → testes → build → bundle-check → e2e → paridade

> Status: concluída (2026-09-03 · f9c3f2b)
**Unidade de deploy:** CRU (`.github/workflows/ci.yml`). **Depende de:** D7 (e2e portáteis).
**Desbloqueia:** D9; E2 (script de paridade roda aqui).

## Objetivo
Toda PR/push prova por máquina o que a varredura provou à mão: typecheck limpo, 143 unit,
175 e2e, bundles em dia com a fonte, e cliente↔edge sem deriva.

## Por quê (evidência)
- Sem CI, lint, formatter ou hooks (PS-08); bundles buildados à mão e commitados
  (`package.json:7-8`); consequência visível: `pipoca.admin.bundle.js` 12 dias atrás de
  `src/core`/`src/backend` (commits `e0bdcd2`, `e2cbe4d` — PS-05).
- Deriva cliente↔edge já aconteceu (`MODELO_PADRAO`, PS-12) e há 10 tabelas duplicadas (DM-D).
- Toolchain: bun (`bun x tsc --noEmit`, `npm test` = 11 suítes bun), e2e por node (`tests/e2e/run-*.mjs`).

## Escopo (arquivos)
- `.github/workflows/ci.yml` (novo).
- `package.json` (scripts `build:all`, `check:bundles`, `check:paridade`).
- `scripts/paridade-edge.mjs` (criado em E2; aqui só o passo do CI, que pode ficar `continue-on-error`
  até E2 existir).

## Passos
1. `package.json`:
   - `"build:all": "bun run build:app && bun run build:admin"`
   - `"check:bundles": "bun run build:all && git diff --exit-code -- pipoca.bundle.js pipoca.admin.bundle.js"`
   - `"check:paridade": "node scripts/paridade-edge.mjs"` (E2).
2. `ci.yml` (ubuntu-latest): `actions/checkout` → `oven-sh/setup-bun` → `actions/setup-node` →
   `bun install` (se houver deps) → `bun x tsc --noEmit` → `npm test` → `npm run check:bundles`
   → `npm run e2e:install` → os 4 runners → `npm run check:paridade`.
3. Proteção de branch (decisão do dono): exigir CI verde para merge em `main` e `28_08_26`.
4. Hook local opcional (`.githooks/pre-push` = `tsc` + `npm test`; `git config core.hooksPath .githooks`).

## Critérios de aceite
- Workflow verde na branch da onda.
- Um commit de fonte sem rebuild faz `check:bundles` falhar (testar de propósito uma vez).

## Verificação
- Abrir PR da onda e observar o workflow; `gh run list`/`gh run view`.

## Riscos e cuidados
- `bun build` pode produzir bundle byte-diferente entre versões do bun — fixar a versão do bun no
  workflow (`bun-version`) igual à local (`bun --version`).
- e2e no CI precisa do Chromium (`e2e:install`) e de porta livre — os runners já usam 5137.
- Secrets: nenhum (e2e roda com `provedor:"local"`; nada toca o Supabase).

## Decisões do dono (default)
- Bloquear merge sem CI verde (default: **sim**).
- Hook local (default: **não** — o CI basta).
