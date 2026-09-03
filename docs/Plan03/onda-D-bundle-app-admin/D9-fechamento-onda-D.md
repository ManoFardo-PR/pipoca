# D9 — Fechamento da Onda D: build dos 2 bundles, e2e, catálogo

> Status: em andamento (2026-09-03)
**Unidade de deploy:** BUNDLE app + admin. **Depende de:** D1–D8 mergeadas na branch da onda.

## Objetivo
Rebuild dos dois bundles com toda a fonte da onda (fecha o PS-05 de vez), prova completa,
CI verde e registro.

## Passos (ordem importa)
1. `git rev-parse --abbrev-ref HEAD` = `onda-D-bundle-app-admin`; `git status --porcelain` limpo.
2. Build e checagem:
   ```
   bun x tsc --noEmit
   bun run build:all                 # app + admin
   git status --porcelain            # pipoca.bundle.js + pipoca.admin.bundle.js + fontes
   grep -c "criarAuthFirebase\|RepositorioFirebase\|criarOrquestrador" pipoca.bundle.js pipoca.admin.bundle.js   # 0
   ```
3. Testes: `npm test` + os 4 runners (portáteis após D7).
4. CI (D8) verde no push da branch.
5. Commit: fontes + os 2 bundles no MESMO commit; mensagem
   `chore(faxina+sync): leitura hibrida do espelho, retry no push, remocao de mortos, CI (varredura D)`.
6. Atualizar `docs/auditorias/varredura-2026-08-26.md`: marcar PS-05, PS-06, PS-07, PS-08, PS-09,
   PS-10, PS-11, DM-A, DM-B (firebase, .agents) como resolvidos (data + commit).

## Critérios de aceite
- "Definição de pronto" de `00-onda-D.md` inteira.
- `git log -1 -- pipoca.admin.bundle.js` = `git log -1 -- src/core src/backend`.

## Riscos e cuidados
- Bundle e fonte em commits separados é o PS-05 — não fazer; o `check:bundles` do CI pega.
- Sessões paralelas: conferir a branch no output de cada comando git.
