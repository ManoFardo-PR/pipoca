# fase00 · 00-20 · RECONCILIAÇÃO da mecânica da tira

## Identidade
- id: `fase00-00-20`
- nó(s) da arquitetura: —
- tela(s) do brief: 4
- classe: —

## Objetivo
Resolver o descasamento entre o quebra-cabeça de ordenar cards (protótipo) e o modelo adicionar-objeto→ler→destravar (motor), **mantendo o quebra-cabeça** e fazendo o grafo/motor se adaptarem a ele.

## Pré-requisitos / Depende de
- `[[fase00-00-09]]` — `HistoriaState` (a ordem da história).
- `[[fase00-00-16]]` — `MotorNarrativa` (texto graph-driven).
- `[[fase00-00-17]]` — Motor A (fonte dos fragmentos).
- `[[fase00-00-18]]` — `ValidadorOrdem` (a ordem certa sai do grafo).

## Arquivos afetados
- `src/core/historia.ts` (editar) — operações de tira/strip/bandeja sobre `HistoriaState`.
- `src/telas/Tela4Heroi.dc.html` (editar) — bandeja + tira.
- referência cruzada para os docs do conjunto-tira (abaixo).

## Nomes & variáveis
- **Mantidos do protótipo:** `strip` (slots ordenáveis), `tray`/bandeja, `_placeInSlot`, `_returnToTray`, `_autoPlace`, `_checkStory`, `storyMsg`.
- **Aposentados:** o array fixo `_order()` (passa a vir de `ValidadorOrdem.ordemCanonica()`); os textos literais `_cards`/`_gateWords` (passam a vir do grafo via `MotorNarrativa`).
- Ações canônicas: `escolherObjeto`, `colocarNaTira`, `devolverParaBandeja`, `validarTira`, `lerEmVozAlta` ([[_contratos/eventos-acoes]]).

## Interfaces / contratos
- `HistoriaState`, `MotorNarrativa`, `Trecho`, `ValidadorOrdem`, `Nivel` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **A tira (quebra-cabeça) é a mecânica canônica.** A criança ordena objetos no `strip`; `_checkStory` chama `validarTira()` (→ `ValidadorOrdem`).
2. **Conteúdo graph-driven:** o texto de cada card e do portão sai de `MotorNarrativa.aoAdicionarObjeto(historiaParcial, id, nivel)` no `Nivel` do perfil — não mais hardcoded.
3. **Ordem do grafo:** a ordem certa vem de `ValidadorOrdem` (`ordem_canonica` ou topológica), perdoadora; nunca de `_order()` fixo.
4. **Seam intacto:** a fábrica ([[fase00-00-19]]) devolve `{ motor, ordem }`; telas não importam motor concreto.
5. **Regra de ouro:** tira válida → `lerEmVozAlta` → portão lê o trecho palavra a palavra → sucesso → +vaga-lumes (ECON) e **destrava** um novo objeto/card → loop até desfecho (`convergente`/`aberto` por `Modos.desfecho`).
6. **Acolhedor:** mensagens "Quase! Arraste os quadros…"; nunca X vermelho.

## Passos de implementação
1. Reapontar `_order()` para `ValidadorOrdem.ordemCanonica()`.
2. Substituir o texto literal dos cards/portão por chamadas a `MotorNarrativa`.
3. Manter os handlers de arrastar/soltar; `_checkStory` delega a `validarTira()`.
4. No sucesso do portão, commitar o objeto em `HistoriaState.objetos` e destravar o próximo.

## Estados / edge-cases
- tira incompleta/fora de ordem → `dica` acolhedora (sem bloqueio punitivo).
- objeto sem ramo de regra → usa `gatilho`.
- desfecho `aberto` sem ramo → cai no `convergente`.

## Critérios de aceitação / verificação
- [ ] Nenhum texto de história fica hardcoded na Tela 4/5 (vem do grafo).
- [ ] `_order()` não é mais um array literal.
- [ ] Os docs do conjunto-tira linkam este doc (auditoria do checker).
- [ ] O loop ordenar→ler→destravar funciona com as fixtures de [[fase00-00-21]].

## Relações com outros docs
- Depende de: `[[fase00-00-09]]`, `[[fase00-00-16]]`, `[[fase00-00-17]]`, `[[fase00-00-18]]`
- É consumido por (conjunto-tira que deve linkar este doc): `[[fase00-00-09]]`, `[[fase00-00-16]]`, `[[fase00-00-17]]`, `[[fase00-00-18]]`, `[[fase01-01-05]]`, `[[fase01-01-06]]`, `[[fase01-01-08]]`, `[[fase01-01-10]]`
- Reconcilia / conserta: o descasamento tira-puzzle ↔ motor (decisão: manter o puzzle)
