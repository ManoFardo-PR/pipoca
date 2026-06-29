# fase00 · 00-06 · Modelo de estado CORE (EstadoApp)

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/core/estado.ts` (`EstadoApp`, `estadoInicial`, seletores `perfilAtivo`/`nivelAtivo`/`storyLines`). Nota: `Economia` traz campo extra `objetosCreditados` (desvio vs tipos-core — ver trilha). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase00-00-06`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Substituir o `state` solto do protótipo por uma árvore de estado canônica (`EstadoApp`) que agrega PERF/SESS/HIST/ECON/MODES/A11y.

## Pré-requisitos / Depende de
- `[[fase00-00-01]]` — estrutura de pastas (`src/core/`).

## Arquivos afetados
- `src/core/estado.ts` (criar) — `EstadoApp` + estado inicial + seletores.

## Nomes & variáveis
- `EstadoApp` — `{ tela, perfil, sessao, historia, economia, modos, a11y }`.
- Mapeamento do protótipo → canônico: `screen`→`tela`; `ob`→`perfil`+`modos`+`sessao.blocoMin`; `fireflies`/`saved`→`economia`; `strip`/`tray`→`historia`; `heroVariant`→`modos.palco`; `a11y`→`a11y`; `gateStage`/`readWord`→estado local da Tela 5.

## Interfaces / contratos
- `EstadoApp`, `Perfil`, `Sessao`, `HistoriaState`, `Economia`, `Modos`, `A11yPrefs` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Fonte única:** todo `renderVals()` deriva de `EstadoApp`; nada de estado paralelo.
2. **Imutabilidade:** atualizações via `setState`/patches; sem mutação direta.
3. **Persistência:** `EstadoApp` é o que `pipoca.save.v1` grava ([[fase00-00-14]]).

## Passos de implementação
1. Definir `EstadoApp` e `estadoInicial`.
2. Criar seletores (`perfilAtivo`, `nivelAtivo`, `storyLines`...).
3. Migrar o `state` do protótipo campo a campo (tabela acima).

## Estados / edge-cases
- sem perfil → `perfil: null` (fluxo cai na entrada/onboarding).
- save corrompido → recai no `estadoInicial`.

## Critérios de aceitação / verificação
- [ ] Todas as telas leem só de `EstadoApp`.
- [ ] O save round-trips por `pipoca.save.v1`.

## Relações com outros docs
- Depende de: `[[fase00-00-01]]`
- É consumido por: `[[fase00-00-07]]`, `[[fase00-00-08]]`, `[[fase00-00-09]]`, `[[fase00-00-10]]`, `[[fase00-00-11]]`, `[[fase01-01-12]]`
- Reconcilia / conserta: —
