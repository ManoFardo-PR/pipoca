---
name: Onboarding / fluxo do cuidador (pós-monolito)
description: Fluxo de criação de perfil agora composto via telas canônicas (não mais inline no monolito). PIN → Onboarding (T10) → T2.
---

## Fluxo atual
Sem perfil, T2 mostra "Oi! 👋 Peça pra um cuidador criar o seu perfil". O botão
"Configurar com o cuidador" → T1 (PortaoParental, PIN). Após PIN aceito,
`PipocaApp._irParaPosPin()` decide: `_perfis.length === 0` → T10 (Onboarding),
senão → T2.

## Onde vive
O cérebro do app no browser é `window.PipocaApp` (src/app/estado.js): estado +
navegação. Perfis persistem em localStorage chave `'pipoca.perfis.v1'`. O PIN do
cuidador é criado no 1º uso e depois verificado (acesso.ts via PipocaCanonico). As
telas canônicas vivem em `src/telas/` e são compostas pelo `Shell.dc.html`.

**Why:** O antigo monolito index.html embutia o onboarding inline; foi aposentado
em favor de um entry fino + Shell que compõe telas via `<dc-import>`. Quem procurar
"onboarding inline" no monolito não vai mais achar — agora é tela canônica.

**How to apply:** Para novos overlays do cuidador, criar tela canônica e montá-la
no Shell com `<sc-if value="{{ showX }}"><dc-import name="X"></dc-import></sc-if>`,
expondo `showX` no estado de PipocaApp (mesmo padrão do PainelA11y).
