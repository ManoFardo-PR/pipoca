# fase01 · 01-04 · Tela 4 · Ambiente herói (Ateliê)

## Identidade
- id: `fase01-01-04`
- nó(s) da arquitetura: —
- tela(s) do brief: 4
- classe: mvp

## Objetivo
Construir a variação Ateliê (estruturada e calma) da tela-herói, com a cena emoldurada ao lado da lista da história.

## Pré-requisitos / Depende de
- `[[fase01-01-03]]` — a tela-herói e o `storyLines` que ambas as variações compartilham.
- `[[fase00-00-11]]` — `Modos.palco` alterna Palco/Ateliê.

## Arquivos afetados
- `src/telas/Tela4Heroi.dc.html` (editar) — a variação Ateliê dentro da mesma tela.

## Nomes & variáveis
- `heroIsA`/`heroIsB` (derivados de `Modos.palco`).
- `setVarA`/`setVarB` — abas Palco/Ateliê.
- reusa `storyLines` e `heroSceneRef` de [[fase01-01-03]].

## Interfaces / contratos
- `Modos`, `HistoriaState`, `MotorNarrativa` ([[_contratos/tipos-core]]). Sem motor concreto.

## Regras de negócio
1. **Mesma história, outra moldura:** Ateliê renderiza o MESMO `storyLines` do Palco.
2. **Calma estruturada:** cena emoldurada + lista maior, mais espaçada (alvo autista/sensorial).
3. Alterna por `Modos.palco === "Ateliê"`.

## Passos de implementação
1. Adicionar o bloco Ateliê com `<sc-if value="{{ heroIsB }}">`.
2. Reusar `storyLines`/`heroSceneRef`.
3. Ligar abas `setVarA`/`setVarB` a `Modos.palco`.

## Estados / edge-cases
- troca de aba não perde a história (mesmo `HistoriaState`).
- `reduceMotion` → transição seca entre abas.

## Critérios de aceitação / verificação
- [ ] Ateliê e Palco mostram conteúdo idêntico de `storyLines`.
- [ ] Nenhum import de motor concreto.

## Relações com outros docs
- Depende de: `[[fase01-01-03]]`, `[[fase00-00-11]]`
- É consumido por: `[[fase01-01-05]]`
- Reconcilia / conserta: `[[fase00-00-20]]`
