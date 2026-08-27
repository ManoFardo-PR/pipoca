# B5 — Saídas da criança: trocar de leitor, chegar ao pote, ajustes em toda tela (ML-3)

**Unidade de deploy:** CRU (`src/telas/Tela2/3/6/7*.dc.html`, `src/app/estado.js`).
**Depende de:** nada. **Desbloqueia:** B6.

## Objetivo
Da tela de cenários (T3) a criança consegue trocar de leitor (voltar à T2) e ver o próprio
pote (T7) sem passar pelo portão parental; o painel "Do meu jeito" abre também na T2 e na
T6; o pedido de gênero aparece no lugar certo.

## Por quê (evidência)
- **Trocar de criança hoje = 7 passos**: T3–T7 ⚙ → PainelA11y "🔒 Sou o adulto"
  (`PainelA11y.dc.html:111-115` → `App.abrirPortao()`) → T1 PIN → `_irParaPosPin` (`estado.js:183-187`,
  → T8) → "↩ Painel" (`PainelEvolucao:241`) → T11 → Perfis → "Usar este" (`Perfis.dc.html:239-246`,
  **não navega**) → "↩ Para a criança" (`PainelCuidador:106` → `aoVoltarParaCrianca`, `estado.js:538-550`,
  que cai em T2 porque o perfil mudou, `:148-153`). Nenhuma tela infantil tem botão para a T2;
  a T3 não tem sequer "voltar" (grep por `voltar|←` em `Tela3SelecaoCenario.dc.html`: 0).
- **Pote inalcançável da T3**: T7 só tem entrada por `Tela6Recompensa.dc.html:62` ("🫙 Ver meu pote")
  e `:63` (se convergiu). Saídas da T3 (inventário completo): ⚙ (`:33`), card destaque (`:46`),
  4 cards (`:62`), cartão de história (`:84` → overlay), coração (`:90`). O cabeçalho mostra
  avatar/saudação (`:15-19`) e saldo de vaga-lumes (`:22-25`) — **não clicáveis** (sonda: 8 alvos
  na T3, saldo fora).
- ⚙ "Do meu jeito" abre de T3/T4/T5/T7 apenas (`Tela3:188`, `Tela4:240`, `Tela5:366`, `Tela7:174`);
  T6 (`Tela6Recompensa.dc.html:22-67`) não tem ← nem ⚙ — a única tela sem nenhuma saída lateral
  (UI-C35); T2 tem só "⚙ Sou o cuidador" (`Tela2:49`).
- `PedirGenero` é disparado pelo estado ao ativar perfil sem gênero (`estado.js:460,471`) e
  aparece sobre a T7 no screenshot (UI-C38) — fora de contexto.
- API pronta: `setState({tela:n})` respeita a guarda KIDMODE (`estado.js:130-142`);
  `selecionarPerfil(p, telaDestino)` aceita destino (`:452-455`); T2 é, por design, o "login
  visual sem senha" (`Tela2EntradaCrianca.dc.html:1-10`) — voltar a ela não fura o KIDMODE
  (`SUPERFICIES_ADULTAS = [8,10..16]`, `estado.js:68`).

## Escopo (arquivos)
- `src/telas/Tela3SelecaoCenario.dc.html:13-35` (cabeçalho: avatar `:15`, saldo `:22-25`, ⚙ `:33`).
- `src/telas/Tela7PoteCardapio.dc.html:156-170` (`continuar`, `brincarDeNovo` — saídas já existem).
- `src/telas/Tela6Recompensa.dc.html:22-67` (adicionar ⚙).
- `src/telas/Tela2EntradaCrianca.dc.html:49` (adicionar ⚙ "Do meu jeito" ao lado de "Sou o cuidador").
- `src/app/estado.js:452-478` (`selecionarPerfil`), `:460,471` (`pedirGenero`).

## Passos
1. T3: avatar + nome viram `<button aria-label="Trocar quem está lendo">` → `App.setState({tela:2})`
   (alvo ≥48px). Manter a saudação como texto do botão.
2. T3: saldo 🟡 vira `<button aria-label="Ver meu pote de vaga-lumes">` → `App.setState({tela:7})`.
   A T7 já volta à T3 por "🌱 Brincar de novo" (`:165-170`) e à T4 por `continuar` (`:156-161`) —
   conferir que `continuar` faz sentido quando não há composição em curso (se `state.comp` for
   nulo, esconder "continuar" ou levá-lo à T3).
3. T6 e T2: adicionar ⚙ "Do meu jeito" → `App.setState({showA11y:true})` (mesmo handler das outras).
4. `PedirGenero`: disparar na chegada à T3 (após `selecionarPerfil`), não em qualquer tela —
   ajustar o gatilho em `estado.js:460,471` para só abrir quando `tela === 3` (ou na própria T2
   ao tocar o avatar, decisão abaixo).
5. Nada de portão nos passos 1-3 (T2 é livre por design).

## Critérios de aceite
- Da T3: 1 toque para a T2; 1 toque para a T7; ⚙ em todas as telas T2-T7.
- Guarda KIDMODE intocada: `setState({tela:11})` sem portão ainda redireciona para 2.
- `PedirGenero` nunca aparece sobre T4-T7.

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs    # adicionar asserts: T3 tem "trocar leitor" e "pote"
node tests/e2e/run-geracao2-canonico.mjs       # overlay PedirGenero (ajustar a tela em que é esperado)
```

## Riscos e cuidados
- `run-geracao2-canonico.mjs` testa o overlay PedirGenero ("visível", "Depois fecha", "pergunta de
  novo") — se mudar o gatilho, ajustar a tela em que o teste espera o overlay.
- Trocar de leitor no meio de uma composição descarta o `comp` (`selecionarPerfil` zera slices,
  `estado.js:464-474`) — comportamento já existente; opcional: confirmar "trocar mesmo?" se
  `state.comp` existir.

## Decisões do dono (default)
- Trocar de leitor exige portão? (default: **não**).
- Onde o gênero é pedido: na chegada à T3 (default) ou já na T2 ao escolher o avatar.
