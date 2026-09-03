---
name: Composição — prévia no portão, aplicar só na confirmação
description: Por que o move autoral (R1 ordenar / R2–4 compor: inserir + reordenar miolo) não pode mutar comp em T4; regra preview-vs-commit e travamento das pontas.
---

# Portão da composição: prévia sem efeito, aplicar só ao confirmar

Na linha verde v2 (T2→T7), quando a criança toca "Ler em voz alta" em T4, **não**
altere `state.comp` ainda. Monte um `gatePendente` (`{tipo:"r1",ordem}` ou
`{tipo:"insere",objetoId,slot}`), gere o texto do portão com uma **prévia pura**
(`preverComposicao` → aplica o move numa cópia, sem `setState`) e navegue para T5.
A mutação real (`aplicarComposicao`) acontece **só** no `_commit` de T5, junto do
crédito de vagalumes e do `abrirProximaRodadaComposicao`.

**Why:** se T4 consome a rodada antes da confirmação, tocar "voltar" em T5
(`voltarCena`→T4) deixa a composição já avançada mas a UI de T4 espera rascunho
novo (arranjo em R1, obj+slot em R2–4) → tela travada / dead-end. Prévia sem
efeito torna o "voltar" sem perdas.

**How to apply:** qualquer novo passo que leia no portão deve seguir preview→commit.
T5 é idempotente (`this._committed`) e limpa `gatePendente` tanto no commit quanto
no voltar. Não reintroduza `ordenarR1Composicao`/`inserirComposicao` diretos na UI.

## R2–4: reordenar o miolo (compor)

Nas rodadas 2+ a criança reordena TODO o miolo (peças já colocadas + a nova) e as
duas pontas ficam travadas como âncora. Isso é um move `{tipo:"compor",objetoId,
ordemMiolo:[ids]}` — a UI guarda um rascunho local do miolo e só aplica no commit.

**Why:** produto decidiu (usuário) travar AS DUAS pontas e liberar só o meio; travar
por número fixo quebraria cenários com outra config.

**How to apply:** âncoras são sempre `linha[0]`/`linha[len-1]`, decididas por
`pontasTravadas` (deriva do `trava_pontas` do admin no grafo), NUNCA por índice
fixo na tela. `podeCompor`/`compor` validam permutação do miolo + peça do banco.
