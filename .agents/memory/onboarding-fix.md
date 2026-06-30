---
name: Onboarding inline — correção do fluxo truncado
description: O monolito index.html não tinha como criar perfis. Solução: onboarding inline como overlay sc-if, igual ao painel A11y. Canonical Onboarding.dc.html ainda não está migrado.
---

## O problema
`_t1Submeter` após PIN → `_irPara(2)`. Mas sem perfil criado, T2 mostrava sempre "Oi! 👋" em loop infinito. O `Onboarding.dc.html` em `src/telas/` existe mas não estava conectado ao monolito.

## A solução (index.html)
1. Estado: `showOnboarding: false, _ob: { nome, idade, nivel, avatarId, salvando, erro }`
2. HTML: overlay `<sc-if value="{{ showOnboarding }}">` com z-index:60, formulário completo (nome, idade, nível, avatar)
3. `_irParaPosPin()`: após PIN aceito, se `_perfis.length === 0` → `showOnboarding = true`
4. `_obSalvar()`: persiste em `localStorage('pipoca.perfis.v1')`, atualiza `_perfis`, fecha overlay, vai para T2
5. `window.PipocaApp.aoVoltarParaCrianca()`: fecha overlay e vai para T2 (seam para o Onboarding.dc.html canônico)

**Why:** O monolito é um único DCLogic; adicionar overlay inline é o padrão usado pelo painel A11y — rápido e sem necessidade de migração multi-arquivo.

**How to apply:** Se adicionar outros overlays do cuidador (ex: editar perfil), seguir o mesmo padrão showX / _x state / sc-if overlay z-index:60+.

## Fluxo corrigido
T2 "Oi! 👋" → T1 PIN → Onboarding overlay → T2 com avatar → T3 → T4 → T5 → T6 → T7
