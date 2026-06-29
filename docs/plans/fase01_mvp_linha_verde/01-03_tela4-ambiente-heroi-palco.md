# fase01 · 01-03 · Tela 4 · Ambiente herói (Palco)

## Identidade
- id: `fase01-01-03`
- nó(s) da arquitetura: T4
- tela(s) do brief: 4
- classe: mvp

## Objetivo
Construir a variação Palco (imersiva) da tela-herói: a cena ilustrada com a história-até-agora sobreposta e o próximo objeto bloqueado.

## Pré-requisitos / Depende de
- `[[fase00-00-16]]` — `MotorNarrativa` para derivar os `storyLines`.
- `[[fase00-00-09]]` — `HistoriaState.objetos` (a história em ordem).
- `[[fase00-00-11]]` — `Modos.palco` seleciona Palco/Ateliê.

## Arquivos afetados
- `src/telas/Tela4Heroi.dc.html` (criar) — container + variação Palco.
- `src/core/historia.ts` (consumir) — `storyLines`.

## Nomes & variáveis
- `heroSceneRef` — injeta a cena SVG do cenário (via `_inject`).
- `storyLines` — derivado: para cada objeto em `HistoriaState.objetos`, `motor.aoAdicionarObjeto(parcial, id, nivel).texto`.
- `lockedRef` — preview do próximo objeto bloqueado.
- `{ motor, ordem }` — injetado pela fábrica ([[fase00-00-19]]); a tela NÃO importa motor concreto.

## Interfaces / contratos
- `MotorNarrativa`, `Trecho`, `HistoriaState`, `Modos`, `ValidadorOrdem` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Seam:** só `MotorNarrativa`/`ValidadorOrdem`; nunca motor concreto.
2. **`storyLines` graph-driven** no `Nivel` do perfil.
3. **Palco** quando `Modos.palco === "Palco"`.
4. **Calma:** um foco; profundidade por luz/parallax sutil (respeita `reduceMotion`).

## Passos de implementação
1. Criar o `<x-dc>` do Palco: cena imersiva + overlay "A história até agora" com `<sc-for list="{{ storyLines }}">`.
2. Derivar `storyLines` de `HistoriaState` via o `motor` injetado.
3. Mostrar o próximo objeto bloqueado (cadeado) — destrava após o portão.
4. Botão "Ler em voz alta" → `lerEmVozAlta()` ([[fase01-01-06]]).

## Estados / edge-cases
- história vazia → só a abertura.
- `reduceMotion` → sem respiração/parallax.

## Critérios de aceitação / verificação
- [ ] `storyLines` vem do motor (fixtures [[fase00-00-21]]), não hardcoded.
- [ ] Nenhum import de `MA`/`MB`.
- [ ] Alternar para Ateliê ([[fase01-01-04]]) mantém a mesma história.

## Relações com outros docs
- Depende de: `[[fase00-00-16]]`, `[[fase00-00-09]]`, `[[fase00-00-11]]`
- É consumido por: `[[fase01-01-04]]`, `[[fase01-01-05]]`
- Reconcilia / conserta: `[[fase00-00-20]]`
