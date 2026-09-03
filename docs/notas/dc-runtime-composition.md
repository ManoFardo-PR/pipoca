---
name: dc-runtime composição de telas (support.js)
description: Como compor componentes DC neste runtime — só via <dc-import name="X">. Tags PascalCase NÃO funcionam. Causa de tela branca.
---

## A regra
Neste `support.js` (dc-runtime sem etapa de build), um componente DC só é montado
com `<dc-import name="NomeDoComponente"></dc-import>`. Tags PascalCase como
`<Shell/>` ou `<Tela2EntradaCrianca/>` **não** são reconhecidas — o walker
(`walk()` em support.js) só trata `sc-if`, `sc-for`, `x-import`, `sc-helmet` e
`dc-import`; qualquer outra tag cai em `walkElement` e vira um elemento HTML
desconhecido vazio (ex.: `<shell>`), renderizando NADA → **tela branca**.

**Why:** O parser (`parseDcDocument`/`parseDcText`) devolve o template cru, sem
reescrever PascalCase para `dc-import`. Não existe build step (o comentário no
próprio support.js diz "until dc-runtime regains a build step"). Vários comentários
nas telas afirmavam que `<TelaX/>` auto-busca o irmão — isso é FALSO neste runtime.

**How to apply:** Para compor telas/itens, sempre `<dc-import name="X" prop="{{ v }}">`.
- Props passam como atributos normais (menos `name`/`component`/`style`).
- O irmão é buscado em `./X.dc.html` relativo à URL da página; o `server.js`
  resolve em `DC_DIRS = ["src/telas","src/componentes","."]`.
- Use tags de fechamento explícitas (`<dc-import ...></dc-import>`), não
  auto-fechamento, pois o HTML parser ignora o `/` de tags não-void.
- Há error boundary por componente (`.sc-logic-error` / `state.__err`): uma tela
  que lança erro mostra um badge de erro, não apaga a árvore inteira.

## Posicionamento + escalonador (transform)
O Shell escala a "moldura do tablet" com `transform: scale(...)` num div com
`overflow:hidden`. Um ancestral com `transform` vira o **bloco de contenção** de
descendentes `position:fixed`. Então modais `position:fixed` (ex.: PortaoParental)
DEVEM ficar FORA do escalonador (na raiz do Shell), senão são escalados e cortados.
Overlays `position:absolute` que devem ficar dentro da moldura (ex.: PainelA11y)
ficam dentro do div de tela.
