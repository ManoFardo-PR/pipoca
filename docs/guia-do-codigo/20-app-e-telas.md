# 20 · app e telas

← [Mapa geral](00-MAPA-GERAL.md) · [Glossário](90-GLOSSARIO.md)

A interface da criança e do cuidador. Mora em [`src/app/`](../../src/app/),
[`src/telas/`](../../src/telas/) e [`src/componentes/`](../../src/componentes/).

## Como o app sobe (boot)

[`index.html`](../../index.html) é servido em `/app` por [`server.js`](../../server.js).
A cadeia de boot:

```
index.html
   → support.js            (runtime do dc-runtime)
   → src/core/roteador.js   (window.PipocaRoteador — navegação canônica)
   → pipoca.config.js       (config pública do backend, SEM segredo)
   → pipoca.bundle.js       (bundle gerado de src/app/bridge.ts)
   → src/app/estado.js      (window.PipocaApp — estado + navegação)
   → monta <dc-import name="Shell">   (a tela raiz)
```

As telas `.dc.html` são buscadas sob demanda como componentes irmãos, resolvidos
por [`server.js`](../../server.js).

## A fronteira da família: a ponte para o core

- [`bridge.ts`](../../src/app/bridge.ts) — bundlada por `bun run build:app` em
  [`pipoca.bundle.js`](../../pipoca.bundle.js). Importa todos os módulos canônicos do
  core e os expõe como `window.PipocaCanonico` (composição, geração, estado, economia,
  história, backend, flags, tts/asr, telemetria, agregados). É aqui que fica a costura
  com a edge: `geracao.realizadorRemoto` sai do backend keyless.
- [`estado.js`](../../src/app/estado.js) — `window.PipocaApp`, o cérebro de estado e
  navegação que as telas leem/escrevem. Também tece a _prévia_ determinística do portão
  (Motor A+ v3) mostrada enquanto o texto realizado corre em paralelo.

> Regra de ouro: as telas falam com `window.PipocaApp`; a lógica fala com
> `window.PipocaCanonico.*` (core puro). Para IA paga, vai pelo backend keyless →
> edge (ver [40 · backend e edge](40-backend-e-edge.md)). **O bundle da criança não
> carrega nenhum código de admin.**

## Telas (`src/telas/*.dc.html`) — o fluxo da criança/cuidador

`Shell` (layout raiz) · `PortaoParental` (T1, _portão_ por PIN) ·
`Tela2EntradaCrianca` · `Tela3SelecaoCenario` · `Tela4Heroi` · `Tela5Portao` ·
`Tela6Recompensa` · `Tela7PoteCardapio` · `Onboarding` · `LoginFamilia` ·
`PainelCuidador` · `PainelEvolucao` · `PainelA11y` · `Limites` · `Regras` ·
`Perfis` · `PedirGenero` · `ContaCuidador` · `Privacidade` · `IaToggle` ·
`LeitorHistoria` (o leitor onde a história é exibida).

> `.dc.html` são **dados/DOM** — não recebem cabeçalho de código. São listados aqui.

Ativos não-tela (recebem cabeçalho):
- [`avatares.ts`](../../src/telas/avatares.ts) — dados dos avatares.
- [`cenas.ts`](../../src/telas/cenas.ts) — dados das cenas.

## Componentes de UI (`src/componentes/*.dc.html`)

`Botao` · `CartaoHistoria` · `ChipObjeto` · `BarraLeitura` · `Vagalume`
(o vaga-lume da economia) · `EsqueletoRef` · `ModalCuidador`. Todos `.dc.html`
(dados/DOM, sem cabeçalho).

## Como rodar
`bun run build:app` gera o bundle; `bun run serve` sobe o servidor local. O fluxo é
coberto pelos runners e2e — ver [50 · testes](50-testes.md) (`test:e2e:canonico`).
