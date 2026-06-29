# fase00 · 00-08 · Sessão e bloco de foco (SESS)

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/core/sessao.ts` (`iniciarSessao`/`tick`/`encerrarSessao`/`formatarRestante`). Nota: emissão de telemetria fica p/ fase03. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase00-00-08`
- nó(s) da arquitetura: SESS
- tela(s) do brief: —
- classe: mvp

## Objetivo
Modelar a sessão e o bloco de foco (Pomodoro) com começo e fim claros, sem pressa punitiva.

## Pré-requisitos / Depende de
- `[[fase00-00-06]]` — `EstadoApp.sessao`.

## Arquivos afetados
- `src/core/sessao.ts` (criar) — `Sessao` + timer.

## Nomes & variáveis
- `Sessao` — `{ perfilId, blocoMin: 10|15|20|25, iniciadaEm, restanteSeg }`.
- `iniciarSessao`/`encerrarSessao`/`tick`.
- mapeia `ob.block` e o indicador "Foco 14:32" do protótipo.

## Interfaces / contratos
- `Sessao` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Bloco curto e visível** (10/15/20/25 min).
2. **Sem castigo:** o fim do bloco é um encerramento calmo, não punição.
3. **Eventos** de início/fim alimentam a telemetria ([[fase03-03-01]]).
4. **`blocoMin`** é configurado em PC_LIM ([[fase02-02-06]]).

## Passos de implementação
1. Definir `Sessao` e `iniciarSessao(perfilId, blocoMin)`.
2. `tick()` decrementa `restanteSeg`; ao zerar, encerra com mensagem calma.
3. Emitir `sessao_iniciada`/`sessao_encerrada` ([[fase03-03-01]]).

## Estados / edge-cases
- app em background → pausa o timer (não punir).
- bloco zerado → encerramento suave, sem bloquear a história em curso.

## Critérios de aceitação / verificação
- [ ] O timer reflete `restanteSeg` e encerra ao zerar.
- [ ] Início/fim geram telemetria.

## Relações com outros docs
- Depende de: `[[fase00-00-06]]`
- É consumido por: `[[fase02-02-06]]`, `[[fase03-03-01]]`
- Reconcilia / conserta: —
