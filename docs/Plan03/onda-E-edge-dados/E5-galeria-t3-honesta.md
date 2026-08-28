# E5 — Galeria da T3 honesta: "Em breve" que se explica, pílula que é botão, retrato que cabe, SVG sem cópia

> Status: pendente

**Unidade de deploy:** CRU (`src/telas/Tela3SelecaoCenario.dc.html`). **Depende de:** E4
(galeria por manifesto), C5 (`Canon.cenas`, se exposto). **Desbloqueia:** —.

## Objetivo
Os 4 cartões "Em breve" deixam de ser armadilhas mudas; o único elemento com cara de botão
é um botão; a T3 cabe num celular; a ilustração vem de um lugar só.

## Por quê (evidência)
- "Em breve" são `<button>` reais **sem `disabled`**, `cursor:not-allowed` e `opacidade:.72`
  (quase imperceptível), `pick: () => {}` (`Tela3SelecaoCenario.dc.html:62,255-258`) — 4 dos 5
  alvos grandes da tela principal não fazem nada, sem som, sacudida ou mensagem; leitor de tela
  os anuncia como botões habilitados (UI-C04).
- "Brincar aqui →" é um `<span>` com cara de pílula (`:54`) dentro do `<button>` que envolve o
  cartão inteiro (`:46`) — a affordance está no elemento decorativo (UI-C05).
- Celular (390×844): grade `1fr 1fr` fixa (`:60`) e `display:flex` sem wrap (`:43`, hero `flex:1.35`
  `:46`) espremem os cartões a ~90px: "O Quart[o]", "A Flore[sta]", "Fund/o do/Mar", selo "Em
  breve" quebrado sobre a ilustração; a pílula colide com o texto do hero (UI-C54). Zero media
  queries no repo.
- SVGs: `src/telas/cenas.ts:27+` (5 cenas, sem importador) e cópia inline `Tela3:134-143` (`_scene`);
  os 5 SVGs injetados via `innerHTML` sem `role`/`aria-hidden`/título.
- Metadados da galeria em `Tela3:243-248` (`gridDados`) — E4 passa a derivá-los do manifesto.

## Escopo (arquivos)
- `src/telas/Tela3SelecaoCenario.dc.html:36-72,134-143,241-260`.

## Passos
1. "Em breve": `disabled` real + `aria-disabled` + selo legível (≥12px, contraste de B2) + ao
   toque (em `pointerdown` no wrapper, já que `disabled` bloqueia o click) um `role="status"`
   "Esse lugar ainda está sendo escrito — em breve!" com sacudida leve (`--pip-mov`).
   Se C7 estiver ativo e o cenário estiver **disponível mas não liberado**, mensagem diferente
   ("Peça para um adulto liberar este lugar").
2. Hero: a pílula "Brincar aqui →" vira o `<button>` (ou o cartão inteiro perde o visual de botão
   e a pílula é o alvo) — uma affordance só; alvo ≥48px.
3. Retrato: `@media (max-width: 700px)` — hero em coluna, grade em 1 coluna (ou 2 com `minmax(150px,1fr)`),
   texto do hero fora da ilustração; a página rola (C2 já liberou o scroll da T3).
4. SVG: consumir `Canon.cenas` (se C5 expôs) e apagar `_scene` inline; cada SVG com
   `role="img"` + `aria-label` (nome do cenário) ou `aria-hidden` quando o texto já descreve.
5. `gridDados` do manifesto (E4).

## Critérios de aceite
- Tocar "Em breve" produz feedback visível e falado; leitor de tela anuncia "indisponível".
- Sonda de alvos: pílula ≥48px; cartões continuam ≥222px.
- Screenshot 390×844: nomes inteiros, selo legível, nada colidindo.
- `grep -n "_scene" src/telas/Tela3SelecaoCenario.dc.html` → 0 (se C5 expôs `Canon.cenas`).

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs   # MARCADOR T3: /história acontece hoje|Favorito de hoje|Quintal/
```
Screenshots T3 1280 e 390.

## Riscos e cuidados
- `disabled` em `<button>` cancela eventos de ponteiro — o feedback precisa vir de um wrapper.
- Não remover "Favorito de hoje"/"Quintal" do texto (MARCADOR do e2e).

## Decisões do dono (default)
- Texto do "Em breve" ao toque (default: o do passo 1).
