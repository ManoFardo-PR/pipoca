# D5 — Aposentar o ramo Firebase, migrar `.agents/` para `docs/`, corrigir o guia do código

**Unidade de deploy:** BUNDLE app + admin (`src/backend/{backend,config}.ts`) + CRU (docs).
**Depende de:** D4 (mesma faxina). **Desbloqueia:** —.

## Objetivo
Com o Firestore abandonado por decisão, o repo deixa de carregar stubs, ramo de dispatch,
tipo, testes e doc de paridade do Firebase; o conhecimento útil de `.agents/memory` vira doc;
o guia do código para de apontar para o que não existe.

## Por quê (evidência)
- **Ramo firebase** (inalcançável por config real — `pipoca.config.js:17-21` hardcoda
  `provedor:"supabase"`; e2e injetam `local`/`supabase`): imports `src/backend/backend.ts:55-56`;
  fábrica stub `:183-188` (`criarBackendFirebase` → "Backend Firebase não configurado neste build.");
  branch `:269` (`if (cfg.provedor === "firebase")`); tipo/normalização `src/backend/config.ts:25,34,59-62`;
  stubs `src/backend/adaptadores/{auth_firebase,repo_firebase}.ts` (97 L);
  `src/backend/adaptadores/rules_firebase.txt` (55 L, zero refs de código); testes
  `src/backend/backend.test.ts:98,134,139,140` ("firebase é stub honesto"); doc
  `docs/plans/fase06_backend/PARIDADE.md:14` e `06-04_multitenant-rls-e-regras.md:20`. Compilado
  nos 2 bundles (`criarAuthFirebase` 2×, `RepositorioFirebase` 3×/3×). Comentário de contexto na
  migração de 26/08 (`…cascade-cota.sql:5`): "decidiu-se ficar no Postgres/Supabase".
- **`.agents/`** (7 arquivos): `agent_assets_metadata.toml` (índice do Replit) e `memory/*.md`
  (`roteamento-landing.md` é a **única** explicação escrita de por que `server.js` serve
  `landing.html` em `/` e mapeia `/app`; `dc-runtime-composition.md`, `supabase-deploy-real.md`,
  `telas-responsivas.md`, `onboarding-fix.md`, `composicao-portao-preview.md`). Zero refs de código.
- **Guia** (`docs/guia-do-codigo/`, doc vivo): 18 refs a `experimentos/` (não existe:
  `00-MAPA-GERAL.md:25,49,67,68`, `50-testes.md:24,31,32`, `60-scripts-e-experimentos.md:14-69`,
  `40-backend-e-edge.md:24`), 2 a `old/` (vazia: `10-core.md:65`, `00-MAPA-GERAL.md:33`),
  adaptadores firebase como "plugáveis" (`40-backend-e-edge.md:53-54`), `playwright.config.ts`
  (`50-testes.md:45`). Os 46 hits em `docs/plans*` são histórico — **não corrigir**.

## Escopo (arquivos)
- `src/backend/backend.ts:14,40,55-56,183-188,269`; `src/backend/config.ts:25,34,59-62`;
  `src/backend/adaptadores/{auth_firebase.ts,repo_firebase.ts,rules_firebase.txt}`;
  `src/backend/backend.test.ts:98,134,139,140`; `src/backend/auth.ts:13`, `migracao.ts:6,24`,
  `src/core/persistencia/index.ts:14` (comentários).
- `.agents/memory/*.md` → `docs/guia-do-codigo/` ou `docs/notas/`.
- `docs/guia-do-codigo/*.md`; `docs/plans/fase06_backend/PARIDADE.md` (nota de aposentadoria).

## Passos
1. Remover imports, fábrica, branch e tipo `"firebase"`; `ProvedorBackend` fica `"supabase" | "local"`;
   `normalizarConfigBackend` trata valor desconhecido como `local` (fail-closed) — conferir o
   teste de config existente.
2. `git rm` dos 2 stubs e do `rules_firebase.txt`; apagar as 4 asserções (ou trocar por "provedor
   desconhecido cai em local"); comentários residuais.
3. `PARIDADE.md`: parágrafo "aposentado em <data>: decisão de ficar no Supabase" no lugar da
   referência ao template.
4. `.agents/memory/*.md`: mover o conteúdo útil para `docs/guia-do-codigo/` (ex.: roteamento da
   landing → `20-app-e-telas.md`; deploy real do Supabase → `40-backend-e-edge.md`); apagar
   `.agents/` (ou mantê-lo só com o `.toml` se o Replit exigir — verificar se o Replit recria).
5. Guia: apagar/atualizar as 18+2 referências; `60-scripts-e-experimentos.md` vira
   `60-scripts.md` (só `scripts/`); remover `playwright.config.ts` de `50-testes.md`; anotar que os
   adaptadores são `local`/`supabase`.
6. `bun x tsc --noEmit`; `npm test`.

## Critérios de aceite
- `grep -rin "firebase\|firestore" src/ pipoca.config.js` → 0 (comentário de contexto no SQL pode ficar).
- `grep -rn "experimentos/\|old/" docs/guia-do-codigo/` → 0.
- Bundles rebuildados (D9) sem `criarAuthFirebase`/`RepositorioFirebase`.

## Verificação
```
bun x tsc --noEmit && npm test
node tests/e2e/run-admin.mjs && node tests/e2e/run-linha-verde-canonico.mjs
```

## Riscos e cuidados
- `config.ts:59-62` — um `provedor:"firebase"` vindo de config antiga deve cair em `local`, não
  lançar.
- `.agents/` pode ser recriado pelo Replit — se sim, adicionar ao `.gitignore` (D6).

## Decisões do dono (default)
- Apagar `.agents/` após migrar (default: **sim**).
