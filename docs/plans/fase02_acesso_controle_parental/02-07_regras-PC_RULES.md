# fase02 · 02-07 · Regras (cenários, verificação, recompensas)

> 🟡 **STATUS · 2026-06-29 · PARCIAL** — Núcleo: setters `definirVerificacao`/`definirDesfecho` (`core/modos.ts`) + `src/core/cardapio.ts` (`CARDAPIO_PADRAO`, `normalizarCardapio`, `normalizarCenariosLiberados`), no bridge (`PipocaCanonico.modos`/`.cardapio`) e testado. Falta a tela `Regras` (app); `fala` exibe "Em breve" (ASR fase05). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase02-02-07`
- nó(s) da arquitetura: PC_RULES
- tela(s) do brief: —
- classe: admin

## Objetivo
Definir cenários liberados, modo de verificação, modo de desfecho e o cardápio de recompensas — escrevendo MODES e o menu.

## Pré-requisitos / Depende de
- `[[fase02-02-04]]` — acessível pelo hub do cuidador.
- `[[fase00-00-11]]` — a forma de `Modos`.
- `[[fase01-01-11]]` — o cardápio consumido pela Tela 7.

## Arquivos afetados
- `src/telas/Regras.dc.html` (criar) — ajustes de regras.

## Nomes & variáveis
- `Modos.verificacao` (cuidador/auto/fala), `Modos.desfecho` (convergente/aberto), `Modos.palco`.
- `cenariosLiberados: string[]`.
- `cardapio` — itens de recompensa (label/icon/cost).

## Interfaces / contratos
- `Modos`, `Verificacao`, `ModoDesfecho` ([[_contratos/tipos-core]]).

## Regras de negócio
1. Escreve `Modos` (lido pela fábrica e telas).
2. Define o cardápio que a Tela 7 ([[fase01-01-11]]) resgata.
3. Libera cenários para a galeria (T3).
4. **fala** depende de ASR (Fase 2) — exibe "Em breve" no MVP.

## Passos de implementação
1. Toggles de verificação/desfecho/palco → MODES.
2. Editor do cardápio (custos).
3. Lista de cenários liberados.

## Estados / edge-cases
- nenhum cenário liberado → libera o quintal por padrão.
- cardápio vazio → defaults.

## Critérios de aceitação / verificação
- [ ] Mudar verificação/desfecho reflete no portão e no final.
- [ ] Cardápio aparece na Tela 7.

## Relações com outros docs
- Depende de: `[[fase02-02-04]]`, `[[fase00-00-11]]`, `[[fase01-01-11]]`
- É consumido por: `[[fase00-00-11]]`, `[[fase01-01-08]]`
- Reconcilia / conserta: —
