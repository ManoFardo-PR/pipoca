# fase01 · 01-05 · Tela 4 · Tira, bandeja e o quebra-cabeça

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — tira/bandeja em `index.html:1000-1040` + `src/core/historia.ts`. Nota: validação incremental no runtime via stub `_validarOrdem` — alinhar ao `ValidadorOrdem` canônico (Marco 1). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase01-01-05`
- nó(s) da arquitetura: —
- tela(s) do brief: 4
- classe: mvp

## Objetivo
Implementar a tira (quebra-cabeça de ordenação) e a bandeja de objetos na Tela 4, alimentadas pelo grafo e pelo `ValidadorOrdem`.

## Pré-requisitos / Depende de
- `[[fase01-01-03]]` — a tela-herói que hospeda a tira.
- `[[fase00-00-18]]` — `ValidadorOrdem` (ordem certa e validação).
- `[[fase00-00-16]]` — `MotorNarrativa` (texto de cada card).
- `[[fase00-00-09]]` — `HistoriaState` (strip/bandeja).

## Arquivos afetados
- `src/telas/Tela4Heroi.dc.html` (editar) — a "tira" e a bandeja.
- `src/core/historia.ts` (consumir) — operações da tira.

## Nomes & variáveis
- `strip` (slots ordenáveis), `bandeja`/`tray` (objetos disponíveis).
- handlers mantidos: `_placeInSlot`, `_returnToTray`, `_autoPlace`, `_checkStory` (delega a `validarTira()`).
- ações canônicas: `escolherObjeto`, `colocarNaTira`, `devolverParaBandeja`, `validarTira`, `lerEmVozAlta` ([[_contratos/eventos-acoes]]).
- `storyMsg` — dica acolhedora (não X vermelho).
- texto de cada card vem de `motor.aoAdicionarObjeto(parcial, id, nivel)`.

## Interfaces / contratos
- `ValidadorOrdem`, `MotorNarrativa`, `HistoriaState`, `Objeto`, `Trecho` ([[_contratos/tipos-core]]). Sem motor concreto.

## Regras de negócio
1. **Quebra-cabeça mantido** (ver [[fase00-00-20]]): a criança ordena objetos no `strip`.
2. **Ordem do grafo:** `_order()` vem de `ValidadorOrdem.ordemCanonica()`; `_checkStory` chama `validarTira()` (perdoador).
3. **Conteúdo graph-driven:** sem `_cards`/textos hardcoded.
4. **Tira válida → `lerEmVozAlta()`** → Tela 5 ([[fase01-01-06]]).
5. **Acolhedor:** "Quase! Arraste os quadros…", nunca X vermelho.

## Passos de implementação
1. Renderizar a bandeja a partir de `cenario.objetos` (chips arrastáveis).
2. Renderizar o `strip` com `onDrop`/`onDragOver`/`onClick` (manter drag/tap do protótipo).
3. `_checkStory` → `ordem.validar(ordemAtual)` → `storyMsg` com `dica`.
4. Texto de cada card via `motor`.
5. Habilitar "Ler em voz alta" quando `ok`.

## Estados / edge-cases
- tira incompleta → dica "faltam quadros".
- ordem inválida → dica acolhedora, sem bloqueio punitivo.
- objeto bloqueado → ainda não destravado.

## Critérios de aceitação / verificação
- [ ] `_order()` não é array literal (vem do `ValidadorOrdem`).
- [ ] Texto dos cards vem do grafo.
- [ ] Nenhum import de `MA`/`MB`.
- [ ] Mensagens nunca usam vermelho de erro/X.

## Relações com outros docs
- Depende de: `[[fase01-01-03]]`, `[[fase00-00-18]]`, `[[fase00-00-16]]`, `[[fase00-00-09]]`
- É consumido por: `[[fase01-01-06]]`
- Reconcilia / conserta: `[[fase00-00-20]]`
