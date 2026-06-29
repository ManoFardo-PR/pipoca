# Contrato · Convenções do dc-runtime (.dc.html)

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/componentes/EsqueletoRef.dc.html` + todos os `.dc.html` seguem template `<x-dc>`+`renderVals()`; nomes canônicos da folha presentes. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

> Como todo componente de tela/UI é escrito, para que o [support.js](../../../support.js) (o dc-runtime
> gerado) renderize. Estas regras vêm do funcionamento real do runtime e do protótipo
> [Pipoca.dc.html](../../../Pipoca.dc.html).

## Estrutura de um componente
- Arquivo `PascalCase.dc.html`. Telas em `src/telas/`; componentes reutilizáveis em `src/componentes/`.
- Contém um bloco `<x-dc>…</x-dc>` (template) e **um** `<script type="text/x-dc" data-dc-script>` com
  `class Component extends DCLogic { ... }`.
- A lógica expõe os "holes" do template via `renderVals()` (retorna um objeto plano: `{ chave: valor }`).
- Ciclo de vida disponível: `componentDidMount()`, `componentDidUpdate()`, `componentWillUnmount()`,
  `setState(patch)` / `setState(fn)`.

## Sintaxe de template (do runtime)
- Interpolação: `{{ expressao }}` (caminhos, comparações `===`/`!==`/`==`/`!=`, `!`, literais).
- Condicional: `<sc-if value="{{ cond }}" hint-placeholder-val="{{ true|false }}"> … </sc-if>`.
- Lista: `<sc-for list="{{ lista }}" as="item" hint-placeholder-count="N"> … {{ item.x }} … </sc-for>`.
- Componente externo: `<x-import from="./Caminho.js" component="Nome"> … </x-import>` (carrega JS/JSX).
- Eventos DOM em camelCase via hole: `onClick="{{ handler }}"`, `onInput`, `onDrop`, `onDragOver`, etc.

## Props
- Declaradas no atributo `data-props` (schema de editor), ex. no protótipo: `heroDefault`, `childNameDefault`.
- Lidas como `this.props.x` na lógica.

## Subárvores imperativas (SVG, avatares, cenas)
- **Nunca** injete HTML/SVG grande por `{{ }}`. Use `ref="{{ algoRef }}"` + `this._inject(el, html)`
  (padrão do protótipo: "SVG stays out of template holes"). Ex.: `heroSceneRef`, `childAvatarRef`, `av.svgRef`.

## Acessibilidade transversal
- Toda tela de leitura lê `A11yPrefs` ([[tipos-core]]) para fonte (Atkinson se `dyslexia`), `letter-spacing`,
  destaque silábico (`syllable`), contraste e `reduceMotion`. Ver [[../fase01/01-13_a11y-aplicacao-transversal]].

## Build / runtime
- O runtime `support.js` é **gerado** (`cd dc-runtime && bun run build`) — não editar à mão.
- Convenções de pastas e build em [[../fase00/00-01_estrutura-repo-e-build]]; regras detalhadas do runtime em
  [[../fase00/00-02_runtime-dc-convencoes]].

## Nomes canônicos de componentes da folha (ver [[../fase00/00-04_folha-de-componentes]])
`Botao.dc.html` · `CartaoHistoria.dc.html` · `Vagalume.dc.html` (token) · `ChipObjeto.dc.html` ·
`BarraLeitura.dc.html` · `ModalCuidador.dc.html`.
