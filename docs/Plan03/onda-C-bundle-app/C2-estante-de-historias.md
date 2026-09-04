# C2 — Estante de histórias digna (ML-1, parte UI)

> Status: concluída (2026-09-01 · 0d799da)
**Unidade de deploy:** CRU (`.dc.html`, `estado.js`) + BUNDLE se C1 (bridge).
**Depende de:** C1. **Desbloqueia:** C3.

## Objetivo
A criança encontra suas histórias num lugar visível, com título inteiro, agrupadas por dia,
sem cartões duplicados, e relê num leitor acessível.

## Por quê (evidência)
- Única listagem do app: bloco "Minhas histórias" no pé da T3
  (`src/telas/Tela3SelecaoCenario.dc.html:75-98`; carrossel `overflow-x:auto` :82; cartão 200px
  :84-91; vazio "Suas histórias terminadas vão morar aqui ✨" :95-97). Medido a 1280×800: o
  título começa em **y=668 de 800**, `docH=800` (sem scroll) — a estante vive nos últimos
  ~130px; cartões ~200×55 com título truncado ("A luzinha do …"). É literalmente um rodapé
  (ML-1, UI-C56).
- Coração 🤍/💛 medido em **34×34px** (`:90`, `padding:4px`), dentro de outro alvo clicável
  (`:84` é `<div role="button">` sem `tabindex`, com `<button>` aninhado — inválido) (UI-C14).
- No celular (390): o 2º cartão é cortado sem pista de scroll; `probes.json` → `overflowX:false`
  (o corte é interno) (UI-C55).
- `LeitorHistoria.dc.html`: 1 `aria-label` (fechar :23, ✕ 38px), sem `role="dialog"`/foco/Esc
  (UI-C45); parágrafos em :80-83 (`h.paragrafos` ou split); coração :57-66 → `App.favoritarHistoria`
  (`estado.js:1229-1246`).
- Produção: histórias existem (5) e a gravação funciona (e2e 80/80) — o problema é exibição.

## Escopo (arquivos)
- `src/telas/Tela3SelecaoCenario.dc.html:75-98,105-132,191-203,262-271`.
- `src/telas/LeitorHistoria.dc.html` (106 linhas).
- Se tela dedicada: `src/telas/MinhasHistorias.dc.html` (nova), `src/telas/Shell.dc.html:36-51,164-181`
  (registrar o número; **não** em `SUPERFICIES_ADULTAS`, `estado.js:68`), botão de entrada na T3.

## Passos
1. Decidir forma (abaixo). **Default: seção promovida na T3** com cartões maiores (≥120px de
   altura, título inteiro em 2 linhas, emoji, "hoje/ontem"), em grade responsiva (`auto-fill,
   minmax(220px,1fr)`), e a T3 passa a rolar verticalmente (hoje `docH=800` fixo) — a galeria
   de cenários fica acima, a estante abaixo, com título "Minhas histórias" e contagem.
2. Usar `Canon.historias.apenasCompletas` + `agruparPorDia` (C1) em `_carregarHistorias`
   (`:111-125`); manter a chave de re-render (`:122`).
3. Cartão como `<button>` único (sem botão aninhado); coração como botão irmão ≥48px com
   `aria-pressed` e `aria-label="Guardar para sempre"`.
4. Celular: grade em 1 coluna (sem carrossel) ou carrossel com `scroll-snap` e sombra de borda.
5. `LeitorHistoria`: `role="dialog" aria-modal aria-labelledby`, foco no título ao abrir, Esc
   fecha, foco volta ao cartão; ✕ ≥48px; texto do corpo em `--pip-fonte-leitura` com a escala de
   B2; botão "Ouvir" opcional reusando `Canon.tts`.
6. Se tela dedicada: rota nova no Shell + botão "📚 Minhas histórias" na T3 (alvo ≥48px) +
   voltar → T3; a seção da T3 vira "últimas 3 + ver todas".

## Critérios de aceite
- Com 4 rodadas lidas + 1 completa: a estante mostra 1 cartão (ou 1 + "rascunhos").
- Título inteiro visível; cartão ≥120px; coração ≥48px; leitor com dialog acessível.
- Screenshot 1280×800: estante começa acima de y=600 ou a página rola; 390×844: nada cortado.
- e2e linha-verde seção "Histórias salvas" verde (asserts: cartão listado, tap abre o leitor,
  💛 grava favorita) — ajustar seletores se o markup mudar.

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs
```
Screenshots T3 com 0, 1 e 5 histórias (1280 e 390).

## Riscos e cuidados
- `Tela3:191-203` recarrega via `App.subscribe` quando `tela===3` — manter o gatilho na tela nova.
- Não mexer na poda/retenção nem no `LeitorHistoria` como fonte de verdade do texto
  (`h.paragrafos` primeiro, split como fallback).

## Decisões do dono (default)
- Seção promovida na T3 (default) vs tela dedicada.
- Intermediárias: somem (default) ou "rascunhos".
