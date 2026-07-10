# plans02 · Trilha (fases 10–14)

> Roteiro da geração 2 (arquitetura de fichas). Complementa — não substitui — a trilha da
> geração 1 (`docs/plans/TRILHA-DE-IMPLEMENTACAO.md`), que segue válida para o runtime atual
> (Motor A+ v3, fallback em produção).

## Mapa de status

| Fase | Status | Onde |
|------|--------|------|
| 10 Modelo de fichas | 🟢 detalhada (implementação pendente; portão = validação em escala do 10-04) | `fase10_modelo_de_fichas/` — 6 docs preenchidos no gabarito |
| 11 A+ compositor | 🟢 detalhada (decisões fechadas em 2026-07-09; implementação pendente) | `fase11_a_mais_compositor/` — 4 docs preenchidos no gabarito |
| 12 B1.5 realizador | 🟢 detalhada (decisões fechadas em 2026-07-09; implementação pendente) | `fase12_b1_5_realizador/` — 6 docs preenchidos no gabarito |
| 13 Integração & modularização | 🟢 detalhada (decisões fechadas em 2026-07-09; implementação pendente) | `fase13_integracao_modularizacao/` — 4 docs preenchidos no gabarito |
| 14 Aposentar banco de frases | 🟢 detalhada (execução condicionada ao gatilho triplo do 14-01) | `fase14_aposentar_banco_de_frases/` — 3 docs preenchidos no gabarito |

Nota: as decisões abertas da fase 10 foram **fechadas em 2026-07-09** — registradas nos próprios docs como "Decisão fixada" (caminhos/esquema; cenário×personagem na ficha de cenário; descrição de cenário string única; campo alvo no contrato; teto de 2 relações por Pacote; lista A1 + regra de dígrafo).

Nota: as decisões abertas da fase 11 foram **fechadas em 2026-07-09** sob o princípio **Pacote = matéria · prompt-template = método**: as 3 leis editoriais vivem no prompt-template do realizador (não no Pacote); o bloco de cenário do Pacote inclui a sensação do lugar no personagem, resolvida no nível.

Nota: as decisões abertas da fase 12 foram **fechadas em 2026-07-09**: segmentação de parágrafos por instrução ao LLM, com número de parágrafos crescente por rodada (sem segmentador pós-LLM); few-shot por nível (exemplos autorais, a materializar na calibração); a escolha realizador-vs-A+ cru no n1 segue como CRITÉRIO decidido pela grade 4×4 da validação em escala, não decisão de pessoa.

Nota: as decisões abertas da fase 13 foram **fechadas em 2026-07-09**: o módulo de geração é módulo novo em `src/core/geracao/` (sem segundo símbolo "orquestrador" no repo); a prévia do portão é determinística (A+ v3), realização por LLM só no commit; gênero no perfil e evolução do esquema de histórias são campos ADITIVOS OPCIONAIS nos v1 de storage (`.v2` reservado para quebra de shape; "nunca mutar `.vN`" protege schemas autorais); a migração fichas JSON→BD fica no jardim, com condição de colheita.

## Fechamento do detalhamento (2026-07-09)

**As 5 fases (10–14) estão detalhadas.** Próxima etapa = IMPLEMENTAÇÃO, começando pela fase 10 (fichas), com o portão da validação em escala ([[fase10-10-04]]) obrigatório ANTES de comprometer a fase 11. A fase 14 executa só quando o gatilho triplo do [[fase14-14-01]] disparar (validação em escala + fase 13 implantada + primeira sessão real). Decisões em aberto remanescentes: apenas a DECISÃO ABERTA condicionada do [[fase14-14-01]] (congelar vs manutenção mínima do v3 — decidida com dados de acionamento do fallback) e o CRITÉRIO do [[fase12-12-05]] (n1: grade 4×4 decide).

## Nota de sequência (portão da fase 11)

A validação em escala do modelo de fichas (experimento existente adaptado para fichas) deve
ocorrer ao fim da fase 10, **ANTES** de comprometer a fase 11. O critério vive em
[[fase10-10-04]] (Critérios de aceitação / verificação — validação em escala com Camada 1,
juiz e leitura em voz alta do Manoel).
