# fase05 · 05-01 · Motor B · geração IA ao vivo

## Identidade
- id: `fase05-05-01`
- nó(s) da arquitetura: MB
- tela(s) do brief: —
- classe: f2

## Objetivo
Entregar a classe `MotorIA` que implementa `MotorNarrativa` com as **mesmas assinaturas** do Motor A, para que a fábrica de motor troque o motor de forma transparente sem que nenhuma tela mude.

## Pré-requisitos / Depende de
- `[[fase00-00-16]]`
- `[[fase02-02-08]]`

## Arquivos afetados
- `src/motores/MotorIA.ts` (criar — classe `MotorIA implements MotorNarrativa`)
- `src/motores/index.ts` (editar — exportar `MotorIA` ao lado de `MotorGrafoAutoral`)
- `docs/plans/_contratos/glossario.md` (referência — nó MB já mapeado a este doc)

## Nomes & variáveis
- `MotorIA` — classe nova, nó MB. Espelha `MotorGrafoAutoral` (nó MA, congelado em `motor_a.ts`).
- `MotorNarrativa` — interface de [[_contratos/tipos-core]] que `MotorIA` implementa.
- `Trecho` — retorno de todos os métodos (`{ texto, ehFinal, objetoId? }`), de [[_contratos/tipos-core]].
- `Nivel`, `ModoDesfecho` — tipos de [[_contratos/tipos-core]].
- `Modos.iaLigada` — flag de [[_contratos/tipos-core]] que governa se MB pode rodar para a criança.
- `historia: string[]` — ids dos objetos commitados, EM ORDEM (= `HistoriaState.objetos`).
- `this.provedor` — referência a `ProvedorIA` (injetada no construtor; ver [[fase05-05-04]]).
- `this.grafo` — `GrafoAutoral` do cenário (espelha tom/níveis no prompt; ver [[fase05-05-02]]).
- `this.modoDesfecho` — `ModoDesfecho` em vigor (lido de `Modos.desfecho` na fábrica).
- Construtor: `constructor(provedor: ProvedorIA, grafo: GrafoAutoral, modoDesfecho: ModoDesfecho)`.

## Interfaces / contratos
- `MotorNarrativa` ([[_contratos/tipos-core]]) — interface implementada:
  ```ts
  abertura(nivel: Nivel): Trecho;
  aoAdicionarObjeto(historia: string[], objetoId: string, nivel: Nivel): Trecho;
  desfecho(historia: string[], modo: ModoDesfecho, nivel: Nivel): Trecho;
  ```
- `Trecho` ([[_contratos/tipos-core]]) — `{ texto: string; ehFinal: boolean; objetoId?: string }`.
- `ProvedorIA` ([[_contratos/tipos-core]]) — `gerar(prompt, schema, opts?): Promise<Trecho>` (ver [[fase05-05-04]]).
- Schema de saída do `Trecho`: `pipoca.trecho-ia.v1` ([[_contratos/schemas-json]] / [[fase05-05-03]]).

## Regras de negócio
1. **Mesma interface, motores intercambiáveis**: `MotorIA` expõe `abertura`/`aoAdicionarObjeto`/`desfecho` com assinaturas idênticas a `MotorGrafoAutoral`. Nenhuma tela importa `MotorIA` — só `MotorNarrativa` (ver [[_contratos/lei-do-contrato]]).
2. **MB só fica ativo quando `Modos.iaLigada === true`**. A escolha MA↔MB acontece **apenas** na fábrica ([[fase00-00-19]]); no MVP `iaLigada=false` e o motor é sempre A.
3. **A mecânica da tira/puzzle não muda**: a criança ainda ordena os objetos e lê no portão; MB apenas **gera o fragmento sob demanda** em vez de buscá-lo no grafo. A regra de ouro permanece (cada fragmento novo é lido antes de soltar o próximo objeto).
4. **`historia` é a única fonte de verdade**: MB recebe `historia: string[]` (= `HistoriaState.objetos`), não inventa estado paralelo.
5. **Pureza da borda**: timestamps/aleatoriedade ficam fora de `MotorIA` (entram pela borda; ver [[_contratos/lei-do-contrato]] e [[fase05-05-03]]). A latência da rede é tratada no provedor, não no motor.
6. **Degradação segura**: erro/timeout/refusal do provedor → degrada para Motor A ([[fase00-00-17]]). A regra concreta vive em [[fase05-05-03]] e [[fase05-05-08]].
7. **`ehFinal`** é `true` somente no `desfecho`; `abertura` e `aoAdicionarObjeto` retornam `ehFinal=false`.
8. **`objetoId`** ecoa o objeto recém-colocado em `aoAdicionarObjeto` (igual ao Motor A).

## Passos de implementação
1. Criar `src/motores/MotorIA.ts` com `export class MotorIA implements MotorNarrativa`.
2. No construtor, guardar `provedor`, `grafo` e `modoDesfecho`.
3. Implementar `abertura(nivel)`: montar prompt de abertura ([[fase05-05-02]]) e retornar o `Trecho` gerado (delegação para o provedor via [[fase05-05-03]]); `ehFinal=false`.
4. Implementar `aoAdicionarObjeto(historia, objetoId, nivel)`: montar prompt com `historia` + objeto + nível; retornar `Trecho` com `objetoId` ecoado, `ehFinal=false`.
5. Implementar `desfecho(historia, modo, nivel)`: montar prompt de desfecho conforme `modo` (`convergente`/`aberto`); retornar `Trecho` com `ehFinal=true`.
6. Em todos os três métodos, encadear a degradação para Motor A em caso de falha (delegação a [[fase05-05-03]]).
7. Exportar `MotorIA` em `src/motores/index.ts`.
8. Não acoplar nenhuma tela a esta classe (auditado por [[_contratos/lei-do-contrato]]).

## Estados / edge-cases
- Vazio (`historia=[]`): `aoAdicionarObjeto` ainda funciona (primeiro objeto).
- `iaLigada=false`: a fábrica nem instancia MB; nenhuma chamada chega aqui.
- Objeto inexistente no grafo: degrada para Motor A (que retorna `Trecho` vazio seguro).
- IA refusal/timeout/inseguro → Motor A (ver [[fase05-05-03]], [[fase05-05-08]]).
- `modo="aberto"` sem ramo: cair em `convergente` (mesma degradação semântica do Motor A).

## Critérios de aceitação / verificação
- [ ] `MotorIA implements MotorNarrativa` compila sem alargar/renomear assinaturas.
- [ ] Trocar `MotorGrafoAutoral` por `MotorIA` na fábrica não altera nenhum arquivo de tela.
- [ ] Os três métodos retornam `Trecho` válido (campos `texto`, `ehFinal`, `objetoId?`).
- [ ] `abertura`/`aoAdicionarObjeto` têm `ehFinal=false`; `desfecho` tem `ehFinal=true`.
- [ ] Com falha simulada do provedor, a saída coincide com a do Motor A nas fixtures de [[fase00-00-21]].
- [ ] Nenhuma tela importa `MotorIA` (lint da lei do seam verde — [[_contratos/lei-do-contrato]]).

## Relações com outros docs
- Depende de: `[[fase00-00-16]]`, `[[fase02-02-08]]`
- É consumido por: `[[fase00-00-19]]` (fábrica de motor), `[[fase05-05-02]]`, `[[fase05-05-03]]`
- Consome: `[[fase00-00-17]]` (degradação para Motor A), `[[fase05-05-04]]` (provedor)
- Lei do seam: `[[_contratos/lei-do-contrato]]`
