# B4 — PainelA11y: tokens, núcleo canônico, alvos grandes, semântica de switch e dialog

**Unidade de deploy:** CRU (`src/telas/PainelA11y.dc.html`; `Shell.dc.html` se mudar o gatilho).
**Depende de:** B1, B2, B3. **Desbloqueia:** —.

## Objetivo
O painel "Do meu jeito" — a superfície de acessibilidade da criança — precisa ser ele
próprio acessível: usar os tokens (e portanto responder aos ajustes), ter alvos que uma
criança com dificuldade motora acerta, e anunciar estado ao leitor de tela.

## Por quê (evidência)
- `PainelA11y.dc.html`: **0 `aria-`** no arquivo; 41 `style=` inline com hex crus (`#fffdf7`,
  `#3a4f63`, `#e8965a`, `#6f9b4f`, `#d6c6ab`, `#3f6f9e`, `#f1e7d4` em `:81,87`) e `'Baloo 2',cursive`
  literal — o único componente que não consegue herdar os ajustes que ele mesmo liga (UI-C33).
- Toggles (`:36,44,52,60`) são `<button>` com `<div>` de knob: sem `role="switch"`, sem
  `aria-checked`, sem nome acessível (UI-C46); medidos em **50×28px** (UI-C13) — 60% do mínimo.
- Botões de escala A/A+/A++ (`:21-26`) sem `aria-pressed`; backdrop `<div onClick>` (`:10`); sem
  `role="dialog"`, `aria-modal`, foco inicial, trap ou Esc (UI-C45); ✕ de 38px (UI-C15).
- Existe um núcleo canônico `Canon.a11y` (`src/app/bridge.ts:245`: `estiloLeitura`,
  `paletaContraste`, `transicao`, `animacaoCena`) que o painel **não consome** — ele escreve
  direto em `App.estado.a11y` (`:95-101`).
- Gatilhos: abre de T3/T4/T5/T7 (`Tela3:188`, `Tela4:240`, `Tela5:366`, `Tela7:174`), nunca de
  T2 nem T6 — B5 adiciona os gatilhos; aqui só o painel.
- "🔒 Sou o adulto" (`:68`, `:111-115`) é hoje o único caminho para o portão parental a partir
  das telas da criança — manter.

## Escopo (arquivos)
- `src/telas/PainelA11y.dc.html` (inteiro, 136 linhas).
- `src/telas/Shell.dc.html:58,153` (montagem sob `showA11y`) — só se precisar de foco/retorno.

## Passos
1. Trocar hex/fontes por `var(--pip-*)` (paleta de B2, tipografia de B2, raios/sombras existentes).
2. Toggles: `<button role="switch" aria-checked="{{ ligado }}" aria-labelledby="…">` com
   `min-height:48px` e knob decorativo `aria-hidden`; escala A/A+/A++ com `aria-pressed`.
3. Dialog: raiz com `role="dialog" aria-modal="true" aria-labelledby="titulo"`; ao abrir, foco no
   título ou no primeiro controle; Esc fecha; ao fechar, devolver o foco ao ⚙ que abriu
   (guardar `document.activeElement` no `componentDidMount`); trap simples (Tab cíclico).
   Referência interna: `src/telas/PortaoParental.dc.html:25,35,43,50` (padrão-ouro).
4. ✕ com ≥48px e `aria-label="Fechar"`.
5. Consumir `Canon.a11y` para derivar o preview do painel (ex.: `estiloLeitura` para a amostra
   de texto) — ou, no mínimo, ler os tokens em vez de recalcular estilos inline (`:81-88`).
6. Descrições dos toggles em `--pip-texto-suave` (contraste), tamanho ≥13.5px.

## Critérios de aceite
- Leitor de tela anuncia "Alto contraste, interruptor, ativado/desativado".
- Sonda de alvos: nenhum controle do painel < 48px.
- Esc fecha; foco volta ao ⚙; Tab não escapa para o fundo enquanto aberto.
- `grep -c "#" src/telas/PainelA11y.dc.html` (hex) → ~0.

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs   # abre/fecha o painel na T3
```
Screenshot do overlay a 1280×800 e 390×844.

## Riscos e cuidados
- O e2e pode localizar os toggles por texto — conferir seletores em `run-linha-verde-canonico.mjs`.
- `Shell.dc.html:116` re-renderiza no subscribe — não perder o foco a cada `setState({})`.

## Decisões do dono (default)
- Manter o botão "Sou o adulto" dentro do painel (default: **sim**, até B5 dar caminho próprio na T2).
