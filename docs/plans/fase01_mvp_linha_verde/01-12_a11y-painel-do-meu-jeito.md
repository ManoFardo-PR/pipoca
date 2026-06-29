# fase01 · 01-12 · Painel "Do meu jeito" (A11Y)

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/telas/PainelA11y.dc.html` (toggles dyslexia/syllable/contrast/reduceMotion + `textScale`); persistido no estado. Track: src (runtime tem painel inline). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase01-01-12`
- nó(s) da arquitetura: A11Y
- tela(s) do brief: —
- classe: mvp

## Objetivo
Oferecer os ajustes de acessibilidade num overlay simples, controlados pela criança/cuidador, mudáveis a qualquer momento.

## Pré-requisitos / Depende de
- `[[fase00-00-06]]` — `EstadoApp.a11y`.

## Arquivos afetados
- `src/telas/PainelA11y.dc.html` (criar) — overlay de ajustes.

## Nomes & variáveis
- `A11yPrefs` — `{ textScale: 1|1.2|1.45, dyslexia, syllable, contrast, reduceMotion }`.
- `abrirAjustesA11y`/`fecharAjustesA11y` (era `openSettings`/`closeSettings`).
- toggles `swStyle`/`knobStyle`; `setScale`.

## Interfaces / contratos
- `A11yPrefs` ([[_contratos/tipos-core]]); ações em [[_contratos/eventos-acoes]].

## Regras de negócio
1. **Reduzir movimento é obrigatório** (sensibilidade vestibular/autismo).
2. **Fonte para dislexia** (Atkinson Hyperlegible).
3. **Destaque silábico** (`va·ga·lu·me`).
4. **Alto contraste** e **tamanho do texto** (1/1.2/1.45).
5. **Mude quando quiser** — sem cobrança.

## Passos de implementação
1. Criar o overlay com os toggles e o seletor de tamanho.
2. Cada toggle atualiza `EstadoApp.a11y`.
3. Persistir a11y no save ([[fase00-00-12]]).

## Estados / edge-cases
- todos desligados → experiência padrão.
- combinação dislexia+silábico+contraste → todas aplicam juntas ([[fase01-01-13]]).

## Critérios de aceitação / verificação
- [ ] Cada toggle altera `A11yPrefs` e persiste.
- [ ] `reduceMotion` presente e funcional.

## Relações com outros docs
- Depende de: `[[fase00-00-06]]`
- É consumido por: `[[fase01-01-13]]`
- Reconcilia / conserta: —
