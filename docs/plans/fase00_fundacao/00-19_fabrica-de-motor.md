# fase00 · 00-19 · Fábrica de motor

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/motores/fabrica.ts` (`criarMotor`→`{motor,ordem}`, fallback Motor B). Nota: **não instanciada no runtime** — `index.html` usa motor inline (Marco 1). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase00-00-19`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Centralizar a escolha do motor (A no MVP, B quando autorizado) e expor às telas um par `{ motor, ordem }`, preservando a lei do seam.

## Pré-requisitos / Depende de
- `[[fase00-00-16]]` — a interface `MotorNarrativa`.
- `[[fase00-00-17]]` — Motor A (padrão MVP).
- `[[fase00-00-18]]` — o `ValidadorOrdem` que acompanha o motor.
- `[[fase00-00-11]]` — `Modos.iaLigada` decide A vs B.

## Arquivos afetados
- `src/motores/fabrica.ts` (criar) — `criarMotor(cenario, modos)`.

## Nomes & variáveis
- `criarMotor(cenario: Cenario, modos: Modos): { motor: MotorNarrativa; ordem: ValidadorOrdem }`.
- `modos.iaLigada` — quando `true` e provedor disponível, retorna Motor B ([[fase05-05-01]]); senão Motor A.

## Interfaces / contratos
- `MotorNarrativa`, `ValidadorOrdem`, `Modos`, `Cenario` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Único ponto de troca MA↔MB** — nenhuma tela escolhe motor.
2. **Default seguro:** MVP sempre Motor A; `iaLigada` é `false` por padrão ([[fase02-02-08]]).
3. **`ordem` sempre presente:** o `ValidadorOrdem` acompanha qualquer motor (o puzzle vale para A e B).
4. **Degradação:** se Motor B falha/recusa em runtime, cai para Motor A ([[fase05-05-08]]).

## Passos de implementação
1. Implementar `criarMotor` retornando `{ motor: new MotorGrafoAutoral(grafo), ordem: criarValidador(cenario) }` no MVP.
2. Adicionar o ramo `if (modos.iaLigada && provedorOk) motor = criarMotorIA(...)` (Fase 2).
3. As telas recebem `{ motor, ordem }` por injeção (props/contexto CORE), nunca importam classes concretas.

## Estados / edge-cases
- `iaLigada` true mas sem provedor configurado ([[fase04-04-05]]) → Motor A com aviso.
- cenário sem objetos → motor válido, tira vazia.

## Critérios de aceitação / verificação
- [ ] No MVP, `criarMotor(...).motor instanceof` Motor A.
- [ ] Trocar `modos.iaLigada` muda o motor sem alterar nenhuma tela.
- [ ] `ordem` é um `ValidadorOrdem` funcional ([[fase00-00-18]]).

## Relações com outros docs
- Depende de: `[[fase00-00-16]]`, `[[fase00-00-17]]`, `[[fase00-00-18]]`, `[[fase00-00-11]]`
- É consumido por: `[[fase01-01-03]]`, `[[fase01-01-05]]`, `[[fase01-01-06]]`, `[[fase05-05-01]]`
- Reconcilia / conserta: `[[fase00-00-20]]`
