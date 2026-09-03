# 50 · testes (e2e + fumaça)

← [Mapa geral](00-MAPA-GERAL.md) · [Glossário](90-GLOSSARIO.md)

Três camadas, **todas offline** (nenhuma gasta API paga): unitários, fumaça de
presença e e2e de navegador. Moram junto do código (`*.test.ts`) e em
[`tests/`](../../tests/).

## Camada 1 · Testes unitários (`*.test.ts`)

Rodam sem rede (injetam provedores/transportes fake). O comando `bun run test`
encadeia estas 10 suítes, nesta ordem (D4: `ia.test.ts` saiu com a Geração 1;
o teste do experimento de fichas saiu com a pasta de experimentos):

1. [`src/core/composicao.test.ts`](../../src/core/composicao.test.ts) — Motor A+ v3.
2. [`src/core/fichas/fichas.test.ts`](../../src/core/fichas/fichas.test.ts) — contrato de fichas.
3. [`src/core/compositor/compositor.test.ts`](../../src/core/compositor/compositor.test.ts) — compor → Pacote.
4. [`src/core/realizador/realizador.test.ts`](../../src/core/realizador/realizador.test.ts) — prompt, validador, cascata (provedores FAKE), golden do prompt.
5. [`src/core/geracao/geracao.test.ts`](../../src/core/geracao/geracao.test.ts) — a costura ponta-a-ponta.
6. [`src/core/persistencia/persistencia.test.ts`](../../src/core/persistencia/persistencia.test.ts) — repositório.
7. [`src/core/parciais.test.ts`](../../src/core/parciais.test.ts) — parciais do motor.
8. [`src/backend/backend.test.ts`](../../src/backend/backend.test.ts) — clientes keyless (assere: sem chave de provedor no corpo), sync/fila remota.
9. [`src/admin/admin.test.ts`](../../src/admin/admin.test.ts) — plataforma do operador.
10. [`tests/fumaca-presenca-v3.ts`](../../tests/fumaca-presenca-v3.ts) — a fumaça (camada 2, abaixo).

> **Cabeçalho conciso**: cada `*.test.ts` leva só uma linha do que cobre + o comando
> `bun run <caminho>`. Não têm o template grande.

## Camada 2 · Fumaça de presença (offline, sem custo)

- [`tests/fumaca-presenca-v3.ts`](../../tests/fumaca-presenca-v3.ts) — monta 30 arranjos
  × 4 níveis × 2 modos pela mecânica real de composição sobre `docs/quintal.v3.json` e
  checa: texto não-vazio, replay determinístico e presença do protagonista ≥ 60%.
- Roda por: `bun run test:presenca` (e também dentro de `bun run test`).

## Camada 3 · E2E de navegador (Playwright, offline)

Cada runner sobe [`server.js`](../../server.js) e injeta `window.PIPOCA_CONFIG =
{ provedor: "local" }` antes do boot, forçando o backend local — nenhuma chamada
paga. O Chromium vem do `playwright-core` (devDependency; `npm run e2e:install`)
via [`tests/e2e/_harness.mjs`](../../tests/e2e/_harness.mjs) — não há
`playwright.config.ts` (os runners não usam `@playwright/test`; D4/D7).

| Runner | Comando | Cobre |
|---|---|---|
| [`run-linha-verde-canonico.mjs`](../../tests/e2e/run-linha-verde-canonico.mjs) | `bun run test:e2e:canonico` (ou `test:e2e`) | o fluxo canônico da criança |
| [`run-admin.mjs`](../../tests/e2e/run-admin.mjs) | `bun run test:e2e:admin` | a plataforma do operador |
| [`run-geracao2-canonico.mjs`](../../tests/e2e/run-geracao2-canonico.mjs) | `bun run test:e2e:geracao2` | a geração 2 (realizador FAKE injetado) |
| [`run-reordenar-miolo.mjs`](../../tests/e2e/run-reordenar-miolo.mjs) | `bun run test:e2e:reordenar` | reordenar o miolo da história |

> Os runners `.mjs` e a fumaça `.ts` **não** são `*.test.ts` — levam o cabeçalho
> completo (template grande), não o conciso.

## Onde vive o "veredito" nos testes
O validador canônico é [`src/core/realizador/validador.ts`](../../src/core/realizador/validador.ts)
(`pass = motivos.length === 0`); a edge tem um espelho compacto em
[`functions/realizador/index.ts`](../../functions/realizador/index.ts). É exercitado
pelo `realizador.test.ts`, pela e2e da geração 2 e pelo smoke pago (ver
[60 · scripts](60-scripts.md)).
