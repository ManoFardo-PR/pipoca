# fase05 · 05-03 · Motor B via Provedor de IA

> 🟢 **STATUS · 2026-07-02 · IMPLEMENTADO (MVP local)** — a geração vive no aquecimento do `src/motores/motor_ia.ts`: prompt do 05-02 → `ProvedorIA.gerar(prompt, schema do Trecho)` (provedor já embrulhado em guardrails na composição) → validação/coerção pelo motor; erro/timeout/recusa não entram no cache e o miss degrada para Motor A. Saída sempre é Trecho válido ou ocorre degradação; nenhuma tela muda.

## Identidade
- id: `fase05-05-03`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: f2

## Objetivo
Conectar o Motor B ao Provedor de IA, gerando `Trecho` válido por schema e degradando para Motor A em falha.

## Pré-requisitos / Depende de
- `[[fase05-05-01]]` — o Motor B (contrato).
- `[[fase05-05-04]]` — o `ProvedorIA`.

## Arquivos afetados
- `src/motores/motor_ia.ts` (editar) — chamada ao `ProvedorIA`.

## Nomes & variáveis
- `gerarTrecho(historia, objetoId, nivel, modo)` → `ProvedorIA.gerar(prompt, schemaTrecho)`.
- `schemaTrecho` — JSON schema de `Trecho`.

## Interfaces / contratos
- `ProvedorIA`, `MotorNarrativa`, `Trecho`, `Nivel`, `ModoDesfecho` ([[_contratos/tipos-core]]).

## Regras de negócio
1. `MB --> AIPROV`: geração restrita por JSON schema (Trecho válido).
2. **Degradação:** erro/timeout/recusa → Motor A ([[fase05-05-08]]).
3. **Sem efeitos no motor:** `ts`/aleatório ficam fora.

## Passos de implementação
1. Montar o prompt com `AIMODEL` ([[fase05-05-02]]).
2. Chamar `ProvedorIA.gerar(prompt, schemaTrecho)`.
3. Validar a saída como `Trecho`; em falha, degradar.

## Estados / edge-cases
- saída inválida → revalida/degrada.
- timeout → Motor A.

## Critérios de aceitação / verificação
- [ ] Saída é sempre um `Trecho` válido ou ocorre degradação.
- [ ] Nenhuma tela muda ao usar Motor B.

## Relações com outros docs
- Depende de: `[[fase05-05-01]]`, `[[fase05-05-04]]`
- É consumido por: `[[fase05-05-08]]`
- Reconcilia / conserta: —
