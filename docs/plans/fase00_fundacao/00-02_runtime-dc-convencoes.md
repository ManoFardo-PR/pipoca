# fase00 · 00-02 · Convenções do dc-runtime

> Doc de planejamento. Segue o gabarito de [[_TEMPLATE]]. Idioma: PT-BR. Codifica como todo `.dc.html` é
> escrito para que o `support.js` gerado renderize. Fonte: o runtime real e o protótipo `Pipoca.dc.html`.

## Identidade
- id: `fase00-00-02`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Fixar as regras de autoria de componentes `.dc.html` (template, ciclo de vida, eventos, props, refs imperativos)
extraídas do `support.js` real, para que telas e componentes das fases seguintes sigam um padrão único.

## Pré-requisitos / Depende de
`[[fase00-00-01]]`

## Arquivos afetados
- `src/telas/*.dc.html` (convenção aplicada a todas as telas).
- `src/componentes/*.dc.html` (convenção aplicada à folha — ver [[fase00-00-04]]).
- Nenhum arquivo gerado é editado: `support.js` permanece intocado.

## Nomes & variáveis
- `class Component extends DCLogic` — a classe única por arquivo `.dc.html` (do protótipo `Pipoca.dc.html`).
- `state = { ... }` — estado local do componente (no protótipo: `screen`, `ob`, `fireflies`, `strip`, `tray`,
  `a11y`, `gateStage`...). Será reorganizado em [[fase00-00-06]].
- `renderVals()` — retorna o objeto plano `{ chave: valor }` que preenche os "holes" do template.
- `setState(patch)` / `setState(fn)` — atualização de estado (assíncrona, dispara re-render).
- `componentDidMount()`, `componentDidUpdate()`, `componentWillUnmount()` — ciclo de vida (no protótipo:
  `_fit`/`resize` no mount, `_renderAvatars` no mount/update, `removeEventListener` no unmount).
- `this.props.x` — props lidas do atributo `data-props` (no protótipo: `heroDefault`, `childNameDefault`).
- `ref="{{ algoRef }}"` + `this._inject(el, html)` — padrão de subárvore imperativa (no protótipo:
  `refScaler`, `heroSceneRef`, `childAvatarRef`, `av.svgRef`, `_inject`).

## Interfaces / contratos
- Este doc é a versão executável de [[_contratos/convencoes-dc-runtime]]; não cria tipos TS.
- Tags e diretivas do runtime: `<x-dc>`, `<script type="text/x-dc" data-dc-script>`, `<sc-if>`, `<sc-for>`,
  `{{ }}`, `<x-import>`.

## Regras de negócio
1. **Um componente = um arquivo `.dc.html`**, `PascalCase`, contendo exatamente um `<x-dc>…</x-dc>` (template) e
   um `<script type="text/x-dc" data-dc-script>` com `class Component extends DCLogic { ... }`.
2. **`renderVals()` é a única ponte template↔lógica.** Retorna objeto plano; os "holes" do template referenciam
   chaves desse objeto. Nada de manipular o DOM do template fora dos refs imperativos.
3. **Interpolação** `{{ expressao }}` aceita caminhos, comparações (`===`/`!==`/`==`/`!=`), negação `!` e
   literais. Sem lógica complexa no template — derive em `renderVals()` (no protótipo, ex.: `storyMsgStyle`,
   `readBtnStyle` já vêm prontos como strings).
4. **Condicional** `<sc-if value="{{ cond }}" hint-placeholder-val="{{ true|false }}"> … </sc-if>`.
5. **Lista** `<sc-for list="{{ lista }}" as="item" hint-placeholder-count="N"> … {{ item.x }} … </sc-for>`.
   Atenção (do protótipo): estilos por-item dentro de `sc-for` não re-renderizam sozinhos — quando o estilo
   depende do estado, exponha "holes" escalares explícitos (padrão `navScalars`/`navS1..navS7`).
6. **Componente externo** `<x-import from="./Caminho.js" component="Nome"> … </x-import>`.
7. **Eventos DOM em camelCase via hole:** `onClick="{{ handler }}"`, `onInput`, `onDrop`, `onDragOver`, etc. Os
   handlers das telas devem mapear para as ações canônicas de [[_contratos/eventos-acoes]].
8. **Props via `data-props`** (schema de editor) e lidas como `this.props.x`.
9. **SVG/HTML grande NUNCA entra por `{{ }}`.** Use `ref` + `this._inject(el, html)` (regra do protótipo: "SVG
   stays out of template holes"). `_inject` deve ser idempotente (no protótipo cacheia via `el._k !== html`).

## Passos de implementação
1. Escrever um esqueleto de referência `.dc.html` (template + `class Component extends DCLogic` + `renderVals()`)
   como modelo para [[fase00-00-04]] e [[fase00-00-05]].
2. Documentar o ciclo de vida e quando usar cada hook (mount: listeners/fit; update: re-injetar refs; unmount:
   limpar listeners).
3. Padronizar o helper `_inject(el, html)` idempotente (cache por conteúdo) reaproveitando o do protótipo.
4. Padronizar o padrão de "holes escalares" para estilos dependentes de estado dentro de listas.
5. Mapear os nomes de eventos camelCase do runtime ↔ ações canônicas de [[_contratos/eventos-acoes]].
6. Registrar a regra "support.js é gerado" e o comando de build (de [[fase00-00-01]]).

## Estados / edge-cases
- **Hole referenciado mas ausente em `renderVals()`:** valor `undefined` no template → garantir que toda chave
  usada no `<x-dc>` exista no objeto retornado.
- **Estilo de item em `sc-for` que não atualiza:** sintoma da regra 5 → mover para hole escalar.
- **`_inject` re-renderizando a cada update:** custo/flicker → manter o cache por conteúdo (`el._k`).
- **Listener vazando:** esquecer `componentWillUnmount` → memory leak (no protótipo, o `resize`).
- **Subárvore SVG vazia:** ref ainda não montado quando `_inject` é chamado → checar `if (el)` antes.

## Critérios de aceitação / verificação
- [ ] Existe um esqueleto `.dc.html` de referência que renderiza com o `support.js` gerado.
- [ ] Toda chave usada em `{{ }}`/`<sc-if>`/`<sc-for>` do esqueleto está presente em `renderVals()`.
- [ ] Handlers do esqueleto usam camelCase e apontam para nomes de [[_contratos/eventos-acoes]].
- [ ] SVG é injetado só via `ref` + `_inject` idempotente; nenhum SVG em `{{ }}`.
- [ ] Listeners adicionados no mount são removidos no unmount.

## Relações com outros docs
- Depende de: `[[fase00-00-01]]`
- É consumido por: `[[fase00-00-04]]` (folha de componentes), `[[fase00-00-05]]` (app shell), e todas as telas
  da `fase01` (T2–T7, A11Y).
- Contratos: `[[_contratos/convencoes-dc-runtime]]`, `[[_contratos/eventos-acoes]]`.
