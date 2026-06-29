# fase00 · 00-09 · Estado da história (HIST)

## Identidade
- id: `fase00-00-09`
- nó(s) da arquitetura: HIST
- tela(s) do brief: —
- classe: mvp

## Objetivo
Definir o estado da história — os objetos commitados em ordem — como única fonte de verdade que alimenta o `MotorNarrativa`.

## Pré-requisitos / Depende de
- `[[fase00-00-06]]` — `EstadoApp`, do qual `historia` é um ramo.

## Arquivos afetados
- `src/core/historia.ts` (criar) — `HistoriaState` + operações (adicionar, reordenar, devolver, reset).

## Nomes & variáveis
- `HistoriaState` — `{ cenarioId: string; objetos: string[]; aberta: boolean }`.
- `objetos` — ids EM ORDEM; é o argumento `historia` passado ao motor.
- `bandeja` (derivada) — objetos do cenário ainda não commitados.
- mapeia `strip`/`tray` do protótipo: `strip` ordenado ↔ `objetos` (após o portão); `tray` ↔ `bandeja`.

## Interfaces / contratos
- `HistoriaState`, `MotorNarrativa`, `Trecho` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Ordem é verdade:** `objetos` está sempre na ordem em que entraram na história.
2. **Commit pós-portão (regra de ouro):** um objeto só entra em `objetos` após ser lido no portão ([[fase01-01-08]]).
3. **Puzzle:** a montagem/ordenação acontece na tira (ver [[fase00-00-20]]); o commit é o passo seguinte.
4. **`aberta`** vira `false` ao alcançar o desfecho.

## Passos de implementação
1. Definir `HistoriaState` e estado inicial (`objetos: []`, `aberta: true`).
2. `adicionarObjeto(id)` — empurra após sucesso no portão; deriva `storyLines` via motor.
3. `reordenar`/`devolver` — operações da tira antes do commit.
4. `reset(cenarioId)` — começa uma nova história.

## Estados / edge-cases
- história vazia → só `abertura(nivel)` aparece.
- tentar commitar sem leitura → bloqueado (regra de ouro).
- desfecho alcançado → `aberta:false`.

## Critérios de aceitação / verificação
- [ ] `objetos` reflete a ordem real e gera os `storyLines` corretos via [[fase00-00-16]].
- [ ] Nenhum objeto entra sem passar pelo portão.
- [ ] As fixtures de [[fase00-00-21]] (vagalume→frasco→vento etc.) reconstroem a história.

## Relações com outros docs
- Depende de: `[[fase00-00-06]]`
- É consumido por: `[[fase01-01-03]]`, `[[fase01-01-05]]`, `[[fase01-01-10]]`, `[[fase03-03-01]]`
- Reconcilia / conserta: `[[fase00-00-20]]`
