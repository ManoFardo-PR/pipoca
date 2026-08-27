# D7 — e2e portáteis: sem caminhos da máquina do autor

**Unidade de deploy:** nenhuma (testes). **Depende de:** nada. **Desbloqueia:** D8.

## Objetivo
Os 3 runners com navegador rodam em qualquer máquina (e no CI) sem editar o arquivo.

## Por quê (evidência)
- 7 caminhos absolutos `C:/Users/mfard/...`:
  `tests/e2e/run-linha-verde-canonico.mjs:22` (comentário), `:48`
  (`…/npm-cache/_npx/705bc6b22212b352/node_modules/playwright-core`), `:92`
  (`…/ms-playwright/chromium-1223/chrome-win64/chrome.exe`); `run-admin.mjs:44,78`;
  `run-geracao2-canonico.mjs:53,87`. Sobrescrevíveis por `PW_CORE`/`PW_CHROME` (`:46-49,90-92`).
  Nesta máquina funcionam (175 checks verdes); em outra quebram em silêncio.
- `run-reordenar-miolo.mjs` não usa navegador (`:6,18,33`).
- `playwright-core` não está em `devDependencies` (`package.json:22-24`); os runners fazem
  `createRequire(import.meta.url)(PW_CORE)` (`:45-49`).
- Padrão de boot já correto: `spawn("node", ["server.js"])` com `PORT` (`:86`), `esperarPorta`
  (`:60-74`), `PIPOCA_CONFIG` injetado (`:97-99`).

## Escopo (arquivos)
- `tests/e2e/run-linha-verde-canonico.mjs:40-93`, `run-admin.mjs:34-80`, `run-geracao2-canonico.mjs:45-90`.
- Novo `tests/e2e/_harness.mjs` (boot compartilhado) — opcional mas elimina 3 cópias.
- `package.json` (`devDependencies`: `playwright-core`; script `e2e:install`).

## Passos
1. `_harness.mjs`: resolver `playwright-core` por `import("playwright-core")` normal
   (devDependency) com fallback a `process.env.PW_CORE`; executável: `PW_CHROME` se definido,
   senão `chromium.executablePath()` do próprio pacote (após `npx playwright-core install chromium`),
   senão erro claro ("rode `npm run e2e:install`").
2. Os 3 runners importam o harness (`bootServer`, `abrirApp`, `assert`) — sem caminhos literais.
3. `package.json`: `"e2e:install": "playwright-core install chromium"`, `playwright-core` em
   `devDependencies` com versão fixada; `post-merge.sh` (D6) pode chamar o install.
4. Atualizar o cabeçalho "CUIDADO" dos runners (`:20-23`).

## Critérios de aceite
- `grep -rn "C:/Users" tests/` → 0.
- Os 4 runners verdes nesta máquina **e** num clone limpo (ou no CI de D8).

## Verificação
```
npm run e2e:install
node tests/e2e/run-linha-verde-canonico.mjs && node tests/e2e/run-admin.mjs && node tests/e2e/run-geracao2-canonico.mjs && node tests/e2e/run-reordenar-miolo.mjs
```

## Riscos e cuidados
- `node_modules/` passa a existir de verdade (hoje só `typescript`) — `.gitignore` já cobre.
- Versão do Chromium muda o render (screenshots de prova podem diferir em pixels) — irrelevante
  para os asserts por texto.

## Decisões do dono (default)
- Harness compartilhado (default: **sim**).
