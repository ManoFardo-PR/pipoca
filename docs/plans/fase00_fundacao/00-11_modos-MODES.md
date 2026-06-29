# fase00 · 00-11 · Modos (MODES)

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/core/modos.ts` (`modosPadrao`, `alternarPalco`, `normalizarModos`/`validarModos`). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase00-00-11`
- nó(s) da arquitetura: MODES
- tela(s) do brief: —
- classe: mvp

## Objetivo
Centralizar os modos que governam a experiência: apresentação (Palco/Ateliê), desfecho (convergente/aberto), verificação e IA.

## Pré-requisitos / Depende de
- `[[fase00-00-06]]` — `EstadoApp.modos`.

## Arquivos afetados
- `src/core/modos.ts` (criar) — `Modos` + defaults.

## Nomes & variáveis
- `Modos` — `{ palco: VariantePalco, desfecho: ModoDesfecho, verificacao: Verificacao, iaLigada: boolean }`.
- `VariantePalco` = `"Palco"|"Ateliê"` (mapeia `heroVariant` A/B).
- `Verificacao` = `"cuidador"|"auto"|"fala"` (mapeia `ob.verify`).
- `ModoDesfecho` = `"convergente"|"aberto"` (novo; ausente no protótipo).

## Interfaces / contratos
- `Modos`, `VariantePalco`, `Verificacao`, `ModoDesfecho` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Palco vs Ateliê** são variações de apresentação da MESMA mecânica/tira.
2. **convergente/aberto** escolhe o ramo de `desfecho` do grafo.
3. **verificacao** define o fluxo do portão ([[fase01-01-08]]).
4. **iaLigada** (default `false`) decide Motor A vs B na fábrica ([[fase00-00-19]]).
5. Governado por PC_RULES/PC_AI ([[fase02-02-07]], [[fase02-02-08]]) e SA_SAFE ([[fase04-04-06]]).

## Passos de implementação
1. Definir `Modos` e `modosPadrao` (Palco, convergente, cuidador, iaLigada:false).
2. Expor setters usados pelo Controle Parental.
3. Ler `modos` na fábrica e nas telas (Palco/Ateliê).

## Estados / edge-cases
- `iaLigada:true` sem provedor → Motor A ([[fase00-00-19]]).
- `verificacao:"fala"` sem ASR (MVP) → exibe "Em breve" ([[fase01-01-08]]).

## Critérios de aceitação / verificação
- [ ] Alternar `palco` troca a apresentação sem alterar a história.
- [ ] `desfecho` muda o final via [[fase00-00-17]].

## Relações com outros docs
- Depende de: `[[fase00-00-06]]`
- É consumido por: `[[fase00-00-19]]`, `[[fase01-01-03]]`, `[[fase01-01-08]]`, `[[fase02-02-07]]`, `[[fase02-02-08]]`, `[[fase04-04-06]]`
- Reconcilia / conserta: —
