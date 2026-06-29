# fase00 · 00-17 · Motor A · Grafo Autoral (MA)

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/motores/motor_a.ts` (`MotorGrafoAutoral`: `abertura`/`aoAdicionarObjeto`/`desfecho`/`avaliaCondicao` tem:/nao_tem:); coberto por `motor.test.ts`. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase00-00-17`
- nó(s) da arquitetura: MA
- tela(s) do brief: —
- classe: mvp

## Objetivo
Implementar `MotorNarrativa` lendo o grafo autoral — sem IA e sem ASR — a fatia verde do diagrama.

## Pré-requisitos / Depende de
- `[[fase00-00-16]]` — a interface `MotorNarrativa` que esta classe implementa.
- `[[fase00-00-13]]` — o schema `pipoca.grafo-autoral.v1` que ela consome.

## Arquivos afetados
- `src/motores/motor_a.ts` (mover/editar) — a classe `MotorGrafoAutoral` já existe em [motor_a.ts](../../../motor_a.ts); este passo a aloja em `src/motores/` e a faz importar o contrato.
- `src/dados/quintal_grafo.json` (mover) — o grafo de [docs/quintal_grafo.json](../../quintal_grafo.json).

## Nomes & variáveis
- `MotorGrafoAutoral implements MotorNarrativa` — recebe `GrafoAutoral` no construtor; indexa `objetos` por id (`objIndex`).
- `avaliaCondicao(cond, historia)` — interpreta `"tem:ID"` / `"nao_tem:ID"`.
- `cen: Cenario` — o cenário ativo.

## Interfaces / contratos
- `MotorNarrativa`, `Trecho`, `GrafoAutoral`, `Cenario`, `Objeto`, `Fragmento4`, `Regra`, `DesfechoAberto` ([[_contratos/tipos-core]]).
- Schema `pipoca.grafo-autoral.v1` ([[_contratos/schemas-json]]).

## Regras de negócio
1. **Primeira regra que bate vence**, senão usa o `gatilho` do objeto.
2. **Desfecho:** `aberto` procura `se_terminou_com` = último objeto; se não houver ramo, cai no `convergente` (degradação segura).
3. **regra_de_ouro:** todo fragmento novo é lido no portão antes de soltar o próximo objeto.
4. **Conserto "conteúdo hardcoded → grafo":** este motor é a fonte do texto das telas; aposenta `_cards`/`_gateWords` literais do protótipo.
5. **Sem IA/ASR.**

## Passos de implementação
1. Mover `motor_a.ts` → `src/motores/motor_a.ts`; importar o contrato de [[fase00-00-16]].
2. Garantir `tsconfig` com `resolveJsonModule`/`esModuleInterop` ([[fase00-00-01]]) para importar o grafo.
3. Suportar o campo opcional `cenario.ordem_canonica` (lido por [[fase00-00-18]], não pelo motor de texto).
4. Manter `abertura`/`aoAdicionarObjeto`/`desfecho` puros.

## Estados / edge-cases
- `objetoId` inexistente → `Trecho` vazio.
- condição com operador desconhecido → falsa (regra não satisfeita).
- nível inexistente → não ocorre (tipo `Nivel` fechado).

## Critérios de aceitação / verificação
- [ ] As duas trajetórias de [[fase00-00-21]] produzem os textos esperados (convergente e aberto).
- [ ] `aoAdicionarObjeto(["vagalume"],"frasco","n3")` usa a regra `tem:vagalume`.
- [ ] `desfecho([...],"aberto",...)` sem ramo cai no convergente.

## Relações com outros docs
- Depende de: `[[fase00-00-16]]`, `[[fase00-00-13]]`
- É consumido por: `[[fase00-00-19]]` (fábrica), `[[fase00-00-21]]`, `[[fase05-05-08]]` (degradação do GUARD), `[[fase04-04-04]]` (validação de conteúdo)
- Reconcilia / conserta: `[[fase00-00-20]]`
