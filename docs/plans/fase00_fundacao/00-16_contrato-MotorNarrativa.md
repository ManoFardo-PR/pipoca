# fase00 · 00-16 · Contrato de Narrativa (CN)

## Identidade
- id: `fase00-00-16`
- nó(s) da arquitetura: CN
- tela(s) do brief: —
- classe: pivot

## Objetivo
Definir o eixo 1 do sistema — a interface `MotorNarrativa` que isola as telas do "como" da história (grafo hoje, IA amanhã).

## Pré-requisitos / Depende de
- `[[fase00-00-13]]` — o schema do grafo de onde sai o `Trecho`.
- `[[fase00-00-15]]` — o `Nivel` que seleciona a variação de texto.

## Arquivos afetados
- `src/motores/contrato.ts` (criar) — exporta `MotorNarrativa`, `Trecho` (e re-exporta `Nivel`/`ModoDesfecho`). É a fronteira pública. Hoje os tipos vivem em [motor_a.ts](../../../motor_a.ts); este passo os promove a módulo de contrato.

## Nomes & variáveis
- `MotorNarrativa` — interface com `abertura(nivel)`, `aoAdicionarObjeto(historia, objetoId, nivel)`, `desfecho(historia, modo, nivel)`.
- `Trecho` — `{ texto: string; ehFinal: boolean; objetoId?: string }`.
- `historia: string[]` — ids dos objetos commitados EM ORDEM (vem de `HistoriaState.objetos`).

## Interfaces / contratos
- `MotorNarrativa`, `Trecho`, `Nivel`, `ModoDesfecho` ([[_contratos/tipos-core]]) — verbatim de `motor_a.ts`, sem renomear.

## Regras de negócio
1. **Lei do seam** ([[_contratos/lei-do-contrato]]): telas e CORE falam só com `MotorNarrativa` (e `ValidadorOrdem`); ninguém importa `MotorGrafoAutoral`/`MotorIA`.
2. **Função pura:** o motor não tem estado, UI nem `Date.now()`; recebe `historia` e devolve `Trecho`.
3. **Pivot:** é o ponto onde MA (MVP) e MB (Fase 2) são intercambiáveis sem mudar tela.
4. **Texto por nível:** todo `Trecho` já vem no `Nivel` pedido.

## Passos de implementação
1. Extrair os tipos `MotorNarrativa`/`Trecho` de `motor_a.ts` para `src/motores/contrato.ts`.
2. Fazer `motor_a.ts` importar o contrato (em vez de redeclarar) — sem mudar a forma.
3. Documentar a regra do seam no topo do arquivo.

## Estados / edge-cases
- `aoAdicionarObjeto` com `objetoId` inexistente → `Trecho` vazio com `ehFinal:false` (degradação segura — definido em [[fase00-00-17]]).
- `desfecho` modo `aberto` sem ramo → cai no `convergente`.

## Critérios de aceitação / verificação
- [ ] `src/motores/contrato.ts` exporta `MotorNarrativa` e `Trecho` idênticos a `motor_a.ts`.
- [ ] Nenhuma tela importa um motor concreto (auditoria do checker).
- [ ] As fixtures de [[fase00-00-21]] passam usando só o contrato.

## Relações com outros docs
- Depende de: `[[fase00-00-13]]`, `[[fase00-00-15]]`
- É consumido por: `[[fase00-00-17]]`, `[[fase00-00-19]]`, `[[fase01-01-03]]`, `[[fase01-01-06]]`, `[[fase05-05-01]]`
- Reconcilia / conserta: `[[fase00-00-20]]` (a tira/puzzle prevê o trecho via `aoAdicionarObjeto`)
