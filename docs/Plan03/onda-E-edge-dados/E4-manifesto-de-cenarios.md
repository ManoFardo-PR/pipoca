# E4 — Manifesto de cenários: um id, fetches derivados, galeria alimentada por dado (ML-2)

**Unidade de deploy:** CRU (`docs/*.json`, `estado.js`, `Tela3`) + BUNDLE (`src/core/cardapio.ts`
se `CENARIOS_PADRAO` mudar). **Depende de:** nada. **Desbloqueia:** E5, E6.

## Objetivo
Adicionar um cenário = registrar no manifesto + escrever grafo/fichas/SVG; o app descobre
os cenários pelo manifesto, com um único vocabulário de id.

## Por quê (evidência)
- Fetches hard-coded do Quintal: `src/app/estado.js:752-763` (`_initComposicao`,
  `fetch("./docs/quintal.v3.json")`) e `:781-794` (`_initFichas`: `objetos.v1.json`,
  **`relacoes.quintal.v1.json`**, `cenarios.v1.json`); `_cenarioV2` é único.
- Dois vocabulários de id: a galeria usa keys de imagem (`quintal`, `quarto`, `floresta`, `espaco`,
  `fundomar` — `Tela3SelecaoCenario.dc.html:243-248` `gridDados`) e o motor usa o id canônico
  (`quintal_anoitecer` — `docs/quintal.v3.json`, `docs/fichas/cenarios.v1.json`,
  `src/core/cardapio.ts:61` `CENARIOS_PADRAO`); `Tela3:250` compara `liberados.indexOf(d.key)` —
  um cenário liberado por id canônico nunca casaria; `Tela3:258` `escolherCenario(d.key)` gravaria
  `historia.cenarioId = "quarto"`, mas `App.iniciarComposicao()` (`estado.js:977-1003`) sempre usa
  `_cenarioV2` (o quintal).
- Dados por cenário hoje: grafo v3 (`docs/quintal.v3.json`: moldura, 4 rodadas, 7 objetos com
  `conta`/`tempera`/`registro`), fichas (`objetos.v1.json` global; `relacoes.<cenario>.v1.json`
  por cenário — 11 objeto×objeto + 7 objeto×cenário; `cenarios.v1.json` mapa por id), SVG
  (`cenas.ts`/`Tela3:134-143`). Tipos: `src/core/fichas/tipos.ts:37-99`.
- Âncoras do validador por objeto duplicadas repo↔edge (`validador.ts:56-66` ↔
  `functions/realizador/index.ts:206-214`) — objeto novo exige atualizar as duas (E2 verifica).
- Lints existentes: `src/core/fichas/lint_fichas.ts`, `src/core/lint_grafo.ts`, `src/admin/validar_grafo.ts:145,194`.

## Escopo (arquivos)
- Novo `docs/cenarios.index.json` (`{ esquema: "pipoca.cenarios-index.v1", cenarios: [ { id,
  nome, descricao, grafo: "./docs/quintal.v3.json", relacoes: "./docs/fichas/relacoes.quintal.v1.json",
  svg: "quintal", disponivel: true } … ] }`).
- `src/app/estado.js:752-794` (carregar o manifesto; carregar grafo+relações do cenário ativo;
  cache por id); `:977-1003` (`iniciarComposicao` usa o cenário escolhido).
- `src/telas/Tela3SelecaoCenario.dc.html:241-260` (galeria a partir do manifesto; comparar por id
  canônico; `escolherCenario(id)`).
- `src/core/cardapio.ts:61` (`CENARIOS_PADRAO` continua `["quintal_anoitecer"]`).
- `src/core/fichas/tipos.ts` (tipo do manifesto) + lint do manifesto (E6).

## Passos
1. Escrever o manifesto com os 5 cenários (1 disponível + 4 `disponivel:false` com nome/descrição
   de hoje).
2. `estado.js`: `_initCenarios()` busca o manifesto; `_initComposicao(id)`/`_initFichas(id)`
   recebem o id e resolvem os arquivos; o boot carrega o cenário padrão; `escolherCenario(id)`
   carrega (ou pega do cache) e só então `iniciarComposicao`. Fallback: manifesto ausente ⇒
   comportamento atual (quintal fixo).
3. T3: `gridDados` derivado do manifesto (nome, descrição, svgKey, disponível); comparação de
   liberação por id canônico (`Canon.cardapio.normalizarCenariosLiberados`); C7 já grava ids
   canônicos.
4. `objetos.v1.json` continua global (decisão); `relacoes.<id>.v1.json` por cenário.
5. Teste: fixture de um segundo cenário mínimo (copiando o quintal com outro id) → aparece na
   galeria quando `disponivel:true` e liberado; e2e linha-verde (`cenarioV2 === "quintal_anoitecer"`)
   continua verde por default.

## Critérios de aceite
- Zero `fetch("./docs/quintal…")`/`relacoes.quintal` literais em `estado.js`.
- Um único vocabulário de id em galeria, liberação e motor.
- Cenário de fixture aparece só por manifesto + liberação.

## Verificação
```
npm test
node tests/e2e/run-linha-verde-canonico.mjs   # "grafo v3 do Quintal fetchado e ativo (cenarioV2)"
node tests/e2e/run-geracao2-canonico.mjs
```

## Riscos e cuidados
- O e2e lê `docs/quintal.v3.json` do disco para prova de vida (`run-linha-verde-canonico.mjs:15`) —
  manter o arquivo no lugar.
- `server.js` allowlist: garantir que `docs/cenarios.index.json` é servível (a allowlist já libera
  `docs/**/*.json`? conferir `server.js:45-62`; se não, adicionar).

## Decisões do dono (default)
- Objetos globais vs por cenário (default: **globais**, com `relacoes` por cenário).
- Autoria à mão em JSON (default) vs via admin `Conteudo` (`conteudo`=0 em prod).
