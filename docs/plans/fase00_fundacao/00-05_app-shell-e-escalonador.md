# fase00 · 00-05 · App shell e escalonador

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/telas/Shell.dc.html` (`refScaler`/`_fit`, jumper atrás de `devMode`) + `src/core/roteador.ts`/`.js` (`irParaTela`/`onTelaChange`). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase00-00-05`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Estabelecer o shell visual (escalonador, fontes, textura) e o roteamento de telas, separando o scaffolding de protótipo.

## Pré-requisitos / Depende de
- `[[fase00-00-02]]` — convenções dc-runtime.
- `[[fase00-00-03]]` — tokens (fundo creme, fontes).

## Arquivos afetados
- `src/telas/Shell.dc.html` (criar) — escalonador + fundo + roteador.
- `src/core/roteador.ts` (criar) — `irParaTela(n)` lendo `EstadoApp.tela`.

## Nomes & variáveis
- `refScaler`/`_fit` — escala a moldura 1234×874 para caber na viewport (do protótipo).
- `irParaTela(n)` — substitui `go`/`goN`.
- `dev` (prop) — liga o screen-jumper só em desenvolvimento.

## Interfaces / contratos
- Lê `EstadoApp.tela` ([[_contratos/tipos-core]]); ações em [[_contratos/eventos-acoes]].

## Regras de negócio
1. **Scaffolding fora de produção:** o jumper (`go1..go7`/`navS*`) e `data-screen-label` ficam atrás de `dev`.
2. **Calma sensorial:** textura/luz suaves; respeita `reduceMotion`.
3. **Mobile-first / tablet:** o escalonador mantém proporção em qualquer tela.

## Passos de implementação
1. Portar `refScaler`/`_fit` do protótipo para o `Shell`.
2. Implementar `irParaTela` e o roteamento por `EstadoApp.tela`.
3. Esconder o jumper quando `!dev`.

## Estados / edge-cases
- viewport muito pequena → escala mínima legível.
- `reduceMotion` → sem parallax/respiração.

## Critérios de aceitação / verificação
- [ ] O shell escala sem cortar conteúdo.
- [ ] O jumper não aparece em produção.

## Relações com outros docs
- Depende de: `[[fase00-00-02]]`, `[[fase00-00-03]]`
- É consumido por: `[[fase01-01-01]]`, `[[fase01-01-02]]`
- Reconcilia / conserta: —
