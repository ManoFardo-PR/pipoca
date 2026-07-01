---
name: Composição — prévia no portão, aplicar só na confirmação
description: Por que o move autoral (R1 ordenar / R2–4 inserir) não pode mutar comp em T4; regra preview-vs-commit da linha verde.
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
