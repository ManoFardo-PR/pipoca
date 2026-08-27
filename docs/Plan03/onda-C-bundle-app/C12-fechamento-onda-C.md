# C12 — Fechamento da Onda C: build do app, e2e, screenshots, catálogo

**Unidade de deploy:** BUNDLE app. **Depende de:** C1–C11 mergeadas na branch da onda.

## Objetivo
Um único `build:app` com toda a fonte da onda, prova de regressão completa, prova visual e
registro no catálogo.

## Passos (ordem importa)
1. `git rev-parse --abbrev-ref HEAD` = `onda-C-bundle-app`; `git status --porcelain` limpo.
2. Build e checagem:
   ```
   bun x tsc --noEmit
   bun run build:app
   git status --porcelain            # deve listar pipoca.bundle.js + fontes desta subtarefa
   ```
   (`build:admin` só se algo em `src/core`/`src/backend` mudou — C1 e C4 mudam `src/core`:
   **sim, rebuildar o admin também** para não repetir o PS-05.)
3. Testes:
   ```
   npm test
   node tests/e2e/run-reordenar-miolo.mjs
   node tests/e2e/run-linha-verde-canonico.mjs
   node tests/e2e/run-admin.mjs
   node tests/e2e/run-geracao2-canonico.mjs
   ```
4. Prova visual: harness de screenshots (`onda-B-cru-ux/00-onda-B.md`) para T2, T3 (0/1/5
   histórias), Perfis picker, T11, T12, T14 (cenários liberados), T15, T16, T9 — 1280 e 390.
   Sonda de alvos: nada < 48px nas telas da criança, nada < 44px nas adultas.
5. Commit: fontes + `pipoca.bundle.js` (+ `pipoca.admin.bundle.js`) no MESMO commit; mensagem
   `feat(ux): estante de historias, avatars por emoji e superficie do cuidador (varredura C)`.
6. Atualizar `docs/auditorias/varredura-2026-08-26.md`: marcar ML-1 (UI), ML-3 (já em B), ML-4,
   UI-A20/A23/A25/A26/A28 e UI-C14/C55 como resolvidos (data + commit).

## Critérios de aceite
- "Definição de pronto" de `00-onda-C.md` inteira.
- `git log -1 -- pipoca.bundle.js` = `git log -1 -- src/core src/app/bridge.ts`.

## Riscos e cuidados
- Bundle e fonte em commits separados é exatamente o drift do PS-05 — não fazer.
- Sessões paralelas: conferir a branch no output de cada comando git.
