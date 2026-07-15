# 50 · testes (e2e + fumaça)

← [Mapa geral](00-MAPA-GERAL.md) · [Glossário](90-GLOSSARIO.md)

Três camadas, **todas offline** (nenhuma gasta API paga): unitários, fumaça de
presença e e2e de navegador. Moram junto do código (`*.test.ts`) e em
[`tests/`](../../tests/).

## Camada 1 · Testes unitários (`*.test.ts`)

Rodam sem rede (injetam provedores/transportes fake). O comando `bun run test`
encadeia estas 12 suítes, nesta ordem:

1. [`src/core/composicao.test.ts`](../../src/core/composicao.test.ts) — Motor A+ v3.
2. [`src/core/fichas/fichas.test.ts`](../../src/core/fichas/fichas.test.ts) — contrato de fichas.
3. [`src/core/compositor/compositor.test.ts`](../../src/core/compositor/compositor.test.ts) — compor → Pacote.
4. [`src/core/realizador/realizador.test.ts`](../../src/core/realizador/realizador.test.ts) — prompt, validador, cascata (provedores FAKE), golden do prompt.
5. [`src/core/geracao/geracao.test.ts`](../../src/core/geracao/geracao.test.ts) — a costura ponta-a-ponta.
6. [`src/core/persistencia/persistencia.test.ts`](../../src/core/persistencia/persistencia.test.ts) — repositório.
7. [`src/core/parciais.test.ts`](../../src/core/parciais.test.ts) — parciais do motor.
8. [`src/ia/ia.test.ts`](../../src/ia/ia.test.ts) — orquestração keyless (assere: nenhuma chave no cliente).
9. [`src/backend/backend.test.ts`](../../src/backend/backend.test.ts) — clientes keyless (assere: sem chave de provedor no corpo).
10. [`src/admin/admin.test.ts`](../../src/admin/admin.test.ts) — plataforma do operador.
11. [`experimentos/fichas-para-historias/fichas-experimento.test.ts`](../../experimentos/fichas-para-historias/fichas-experimento.test.ts) — o experimento fichas (parte offline).
12. [`tests/fumaca-presenca-v3.ts`](../../tests/fumaca-presenca-v3.ts) — a fumaça (camada 2, abaixo).

> **Cabeçalho conciso**: cada `*.test.ts` leva só uma linha do que cobre + o comando
> `bun run <caminho>`. Não têm o template grande.

Fora do `bun run test` (rodados à mão, também offline): os testes do experimento
_beats-para-paragrafos_ — [`gerar-historias.test.ts`](../../experimentos/beats-para-paragrafos/gerar-historias.test.ts)
e [`avaliar/avaliar-pares.test.ts`](../../experimentos/beats-para-paragrafos/avaliar/avaliar-pares.test.ts).

## Camada 2 · Fumaça de presença (offline, sem custo)

- [`tests/fumaca-presenca-v3.ts`](../../tests/fumaca-presenca-v3.ts) — monta 30 arranjos
  × 4 níveis × 2 modos pela mecânica real de composição sobre `docs/quintal.v3.json` e
  checa: texto não-vazio, replay determinístico e presença do protagonista ≥ 60%.
- Roda por: `bun run test:presenca` (e também dentro de `bun run test`).

## Camada 3 · E2E de navegador (Playwright, offline)

Cada runner sobe [`server.js`](../../server.js) e injeta `window.PIPOCA_CONFIG =
{ provedor: "local" }` antes do boot, forçando o backend local — nenhuma chamada
paga. Config em [`playwright.config.ts`](../../playwright.config.ts).

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
[60 · scripts e experimentos](60-scripts-e-experimentos.md)).
