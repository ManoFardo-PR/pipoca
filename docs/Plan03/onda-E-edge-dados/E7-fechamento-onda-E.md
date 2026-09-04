# E7 — Fechamento da Onda E: build, paridade, e2e, prova das edges, catálogo

> Status: concluída (2026-09-04 · 38d09f9)
**Unidade de deploy:** BUNDLE app (+ EDGE já redeployada em E3). **Depende de:** E1–E6
mergeadas na branch da onda.

## Objetivo
Levar a onda a produção com um único `build:app`, paridade cliente↔edge verificada, e2e
completo, prova de que a edge `proxy-ia` foi aposentada e o catálogo atualizado.

## Passos (ordem importa)
1. `git rev-parse --abbrev-ref HEAD` = `onda-E-edge-dados`; `git status --porcelain` limpo.
2. Paridade e build:
   ```
   bun x tsc --noEmit
   npm run check:paridade            # E2
   npm run lint:conteudo             # E6
   bun run build:app
   git status --porcelain            # pipoca.bundle.js + fontes desta subtarefa
   ```
   (`build:admin` só se E1/E2 tocaram `src/core` de forma que o admin consuma — `src/core/compositor`
   entra no bundle do admin via `validar_grafo`? conferir com `grep -c sentimento pipoca.admin.bundle.js`
   após `build:admin`; na dúvida, `build:all`.)
3. Testes: `npm test` + os 4 runners.
4. Prova das edges (read-only, MCP): `list_edge_functions` sem `proxy-ia`; `realizador` com versão
   incrementada; uma geração real (se houver config) devolvendo `origem.fonte:"llm"` com o corpo
   do request = `{pacote, tenantId?}` (log da edge ou `page.on("request")` no e2e).
5. Screenshots T3 (galeria honesta, 1280 e 390) com o harness.
6. Commit: fontes + bundle no MESMO commit; mensagem
   `feat(ia+conteudo): pacote v1.1, prompt na edge, manifesto de cenarios (varredura E)`.
7. Merge em `28_08_26` (`git checkout 28_08_26 && git merge --no-ff onda-E-edge-dados`), conferindo
   a branch no output.
8. Atualizar `docs/auditorias/varredura-2026-08-26.md`: marcar ML-2, ML-5, DM-B (guardrails,
   proxy-ia), DM-D, UI-C04/C05/C54 como resolvidos (data + commit).

## Critérios de aceite
- "Definição de pronto" de `00-onda-E.md` inteira.
- `node scripts/plan03.mjs gate E` sem check automático pendente.
- `git log -1 -- pipoca.bundle.js` = `git log -1 -- src/core src/backend src/app/bridge.ts`.

## Riscos e cuidados
- E3 fez o redeploy em 2 passos; confirmar que o segundo passo (rejeitar `prompt`) já aconteceu
  antes de mergear o bundle que não envia `prompt`.
- Sessões paralelas: conferir a branch no output de cada comando git.
