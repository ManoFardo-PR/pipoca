# fase01 · 01-10 · Tela 6 · Recompensa

## Identidade
- id: `fase01-01-10`
- nó(s) da arquitetura: T6
- tela(s) do brief: 6
- classe: mvp

## Objetivo
Entregar a micro-celebração calorosa após a leitura: o novo objeto acende, os vaga-lumes somam e o próximo objeto é destravado.

## Pré-requisitos / Depende de
- `[[fase00-00-10]]` — crédito de vaga-lumes (ECON).
- `[[fase00-00-09]]` — avanço de `HistoriaState`.
- `[[fase01-01-08]]` — entra aqui após o sucesso da verificação.

## Arquivos afetados
- `src/telas/Tela6Recompensa.dc.html` (criar) — celebração + destrava.

## Nomes & variáveis
- `earned` — quantos vaga-lumes acenderam (ex.: +3).
- `owlRef` — preview do objeto destravado (SVG via `_inject`).
- `aoDestravarProximo()` — destrava novo objeto/card e volta à Tela 4 (era `addToScene`).
- `goPote` → `irParaTela(7)`.
- idempotência: flag `awarded` (crédito atado ao objeto commitado).

## Interfaces / contratos
- `Economia`, `HistoriaState` ([[_contratos/tipos-core]]); ações em [[_contratos/eventos-acoes]]. Sem motor concreto.

## Regras de negócio
1. **Calorosa, não estridente** (alvo sensorial): luz/brilho suave, não cassino.
2. **Imediata** (TDAH não espera): celebra na hora.
3. **Idempotência:** o crédito do objeto só ocorre uma vez ([[fase00-00-10]]).
4. **Destrava o próximo:** `aoDestravarProximo()` adiciona o objeto à bandeja e a cena cresce ("ler faz o mundo crescer").

## Passos de implementação
1. Criar a tela com o objeto que acende, "+N", e o novo amigo destravado.
2. `aoDestravarProximo()` → atualiza `HistoriaState`/bandeja e `irParaTela(4)`.
3. "Ver meu pote" → `irParaTela(7)`.

## Estados / edge-cases
- crédito duplicado → ignorado (idempotente).
- história no desfecho → mostra fechamento, sem destravar mais.
- `reduceMotion` → celebração estática.

## Critérios de aceitação / verificação
- [ ] +N reflete o crédito real e some uma única vez por objeto.
- [ ] Voltar à Tela 4 mostra a cena com o novo objeto disponível.
- [ ] Nenhum import de motor concreto.

## Relações com outros docs
- Depende de: `[[fase00-00-10]]`, `[[fase00-00-09]]`, `[[fase01-01-08]]`
- É consumido por: `[[fase01-01-11]]`, `[[fase03-03-01]]`
- Reconcilia / conserta: `[[fase00-00-20]]`
