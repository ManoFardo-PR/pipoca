# Relatório completo — Experimento B1.5 (Realizador Literário)

Gerado em 2026-07-09 15:25 UTC · matriz completa (97 estados) · gerador `gemini-2.5-flash` · juiz `gpt-5.4-mini`.

## Resumo

| Total | Pass Camada 1 | Reprovados | Juiz falhou | Fluidez média | Adequação média | Naturalidade média | Crescimento médio |
|---|---|---|---|---|---|---|---|
| 97 | 94/97 (97%) | 3 | 1 | 4.50 | 4.16 | 4.00 | 2.8% |

## Grade de decisão — % aprovado na Camada 1 por rodada × nível

| rodada | n1 | n2 | n3 | n4 |
|---|---|---|---|---|
| **R1** | 83% (5/6, fl 4.3) | 100% (6/6, fl 4.3) | 100% (6/6, fl 4.6) | 100% (6/6, fl 4.7) |
| **R2** | 100% (6/6, fl 4.2) | 100% (6/6, fl 4.5) | 100% (6/6, fl 4.6) | 83% (5/6, fl 4.8) |
| **R3** | 100% (6/6, fl 4.2) | 100% (6/6, fl 4.5) | 100% (6/6, fl 4.6) | 83% (5/6, fl 4.8) |
| **R4** | 100% (6/6, fl 4.4) | 100% (6/6, fl 4.5) | 100% (7/7, fl 4.6) | 100% (6/6, fl 4.7) |

## Onde estão os arquivos

Caminhos relativos à raiz do repositório:

```
experimentos/beats-para-paragrafos/saida/historias-base/rodada-01.json … rodada-10.json
experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-01.json … rodada-10.json
experimentos/beats-para-paragrafos/saida/monitoramento/consolidado.json
experimentos/beats-para-paragrafos/saida/avaliacao/grade.json
experimentos/beats-para-paragrafos/saida/avaliacao/para-leitura.md
experimentos/beats-para-paragrafos/saida/avaliacao/reprovados.md
experimentos/beats-para-paragrafos/saida/avaliacao/relatorio-completo.md  (este arquivo)
```

## As 97 histórias avaliadas

| id | rodada | nível | status | notas / motivo | palavras | história-base | resposta-llm |
|---|---|---|---|---|---|---|---|
| `n1-p01-r1` | 1 | n1 | juiz_falhou | passou C1, juiz não respondeu | 30→35 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-01.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-01.json` |
| `n1-p01-r2` | 2 | n1 | aprovado | fl 4 · adeq 4.5 · nat 3.5 | 43→49 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-01.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-01.json` |
| `n1-p01-r3` | 3 | n1 | aprovado | fl 4.5 · adeq 4 · nat 3.5 | 54→63 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-01.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-01.json` |
| `n1-p01-r4` | 4 | n1 | aprovado | fl 4.5 · adeq 4 · nat 3.5 | 70→79 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-01.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-01.json` |
| `n1-p02-r1` | 1 | n1 | aprovado | fl 4 · adeq 4.5 · nat 3.5 | 29→33 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-01.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-01.json` |
| `n1-p02-r2` | 2 | n1 | aprovado | fl 4.5 · adeq 4 · nat 3.5 | 43→51 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-01.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-01.json` |
| `n1-p02-r3` | 3 | n1 | aprovado | fl 4 · adeq 4.5 · nat 3.5 | 54→62 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-01.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-01.json` |
| `n1-p02-r4` | 4 | n1 | aprovado | fl 4 · adeq 4.5 · nat 3.5 | 76→89 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-01.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-01.json` |
| `n1-p03-r1` | 1 | n1 | aprovado | fl 4 · adeq 4.5 · nat 3.5 | 36→39 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-01.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-01.json` |
| `n1-p03-r2` | 2 | n1 | aprovado | fl 4 · adeq 4.5 · nat 3.5 | 40→43 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-01.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-01.json` |
| `n1-p03-r3` | 3 | n1 | aprovado | fl 4 · adeq 4 · nat 3 | 55→67 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-02.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-02.json` |
| `n1-p03-r4` | 4 | n1 | aprovado | fl 4.5 · adeq 4 · nat 4 | 73→87 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-02.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-02.json` |
| `n1-p04-r1` | 1 | n1 | aprovado | fl 4.5 · adeq 4 · nat 4 | 30→30 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-02.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-02.json` |
| `n1-p04-r2` | 2 | n1 | aprovado | fl 4.5 · adeq 4 · nat 4 | 39→45 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-02.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-02.json` |
| `n1-p04-r3` | 3 | n1 | aprovado | fl 4 · adeq 4 · nat 3 | 51→60 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-02.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-02.json` |
| `n1-p04-r4` | 4 | n1 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 77→84 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-02.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-02.json` |
| `n1-p05-r1` | 1 | n1 | reprovado | presença da protagonista em 50% das sentenças (limiar 60%) | 36→39 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-02.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-02.json` |
| `n1-p05-r2` | 2 | n1 | aprovado | fl 4 · adeq 4.5 · nat 3.5 | 40→46 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-02.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-02.json` |
| `n1-p05-r3` | 3 | n1 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 54→60 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-02.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-02.json` |
| `n1-p05-r4` | 4 | n1 | aprovado | fl 4.5 · adeq 4 · nat 4 | 76→86 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-02.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-02.json` |
| `n1-p06-r1` | 1 | n1 | aprovado | fl 4.5 · adeq 4 · nat 3.5 | 28→31 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-03.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-03.json` |
| `n1-p06-r2` | 2 | n1 | aprovado | fl 4 · adeq 4 · nat 3 | 40→43 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-03.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-03.json` |
| `n1-p06-r3` | 3 | n1 | aprovado | fl 4 · adeq 4.5 · nat 3.5 | 49→56 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-03.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-03.json` |
| `n1-p06-r4` | 4 | n1 | aprovado | fl 4.2 · adeq 4.6 · nat 3.8 | 72→76 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-03.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-03.json` |
| `n2-p01-r1` | 1 | n2 | aprovado | fl 3.5 · adeq 3 · nat 2.5 | 53→53 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-03.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-03.json` |
| `n2-p01-r2` | 2 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 70→70 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-03.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-03.json` |
| `n2-p01-r3` | 3 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 89→85 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-03.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-03.json` |
| `n2-p01-r4` | 4 | n2 | aprovado | fl 4.5 · adeq 4 · nat 3.5 | 118→117 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-03.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-03.json` |
| `n2-p02-r1` | 1 | n2 | aprovado | fl 4.5 · adeq 4 · nat 3.5 | 57→57 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-03.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-03.json` |
| `n2-p02-r2` | 2 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4 | 75→76 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-03.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-03.json` |
| `n2-p02-r3` | 3 | n2 | aprovado | fl 4.5 · adeq 4 · nat 3.5 | 95→95 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-04.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-04.json` |
| `n2-p02-r4` | 4 | n2 | aprovado | fl 4.5 · adeq 4 · nat 3.5 | 126→129 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-04.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-04.json` |
| `n2-p03-r1` | 1 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4 | 52→52 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-04.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-04.json` |
| `n2-p03-r2` | 2 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 69→67 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-04.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-04.json` |
| `n2-p03-r3` | 3 | n2 | aprovado | fl 4.5 · adeq 4 · nat 3.5 | 95→98 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-04.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-04.json` |
| `n2-p03-r4` | 4 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 124→129 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-04.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-04.json` |
| `n2-p04-r1` | 1 | n2 | aprovado | fl 4 · adeq 4.5 · nat 4 | 53→52 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-04.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-04.json` |
| `n2-p04-r2` | 2 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 70→65 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-04.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-04.json` |
| `n2-p04-r3` | 3 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4 | 88→87 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-04.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-04.json` |
| `n2-p04-r4` | 4 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4 | 114→116 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-04.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-04.json` |
| `n2-p05-r1` | 1 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 56→54 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-05.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-05.json` |
| `n2-p05-r2` | 2 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4 | 65→65 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-05.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-05.json` |
| `n2-p05-r3` | 3 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 86→87 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-05.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-05.json` |
| `n2-p05-r4` | 4 | n2 | aprovado | fl 4.5 · adeq 4 · nat 3.5 | 112→112 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-05.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-05.json` |
| `n2-p06-r1` | 1 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 52→50 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-05.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-05.json` |
| `n2-p06-r2` | 2 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 69→67 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-05.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-05.json` |
| `n2-p06-r3` | 3 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 86→84 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-05.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-05.json` |
| `n2-p06-r4` | 4 | n2 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 116→118 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-05.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-05.json` |
| `n3-p01-r1` | 1 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 91→96 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-05.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-05.json` |
| `n3-p01-r2` | 2 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4 | 113→117 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-05.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-05.json` |
| `n3-p01-r3` | 3 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 146→147 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-06.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-06.json` |
| `n3-p01-r4` | 4 | n3 | aprovado | fl 4.8 · adeq 4.6 · nat 4.4 | 192→192 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-06.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-06.json` |
| `n3-p02-r1` | 1 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 93→94 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-06.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-06.json` |
| `n3-p02-r2` | 2 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4 | 118→121 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-06.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-06.json` |
| `n3-p02-r3` | 3 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4 | 147→143 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-06.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-06.json` |
| `n3-p02-r4` | 4 | n3 | aprovado | fl 4.8 · adeq 4.6 · nat 4.4 | 194→189 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-06.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-06.json` |
| `n3-p03-r1` | 1 | n3 | aprovado | fl 4.8 · adeq 4.6 · nat 4.4 | 88→90 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-06.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-06.json` |
| `n3-p03-r2` | 2 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 111→109 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-06.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-06.json` |
| `n3-p03-r3` | 3 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 140→142 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-06.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-06.json` |
| `n3-p03-r4` | 4 | n3 | aprovado | fl 4.8 · adeq 4.4 · nat 4.2 | 194→197 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-06.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-06.json` |
| `n3-p04-r1` | 1 | n3 | aprovado | fl 4.8 · adeq 4.6 · nat 4.7 | 87→86 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-07.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-07.json` |
| `n3-p04-r2` | 2 | n3 | aprovado | fl 4.8 · adeq 4.6 · nat 4.4 | 115→117 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-07.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-07.json` |
| `n3-p04-r3` | 3 | n3 | aprovado | fl 4.8 · adeq 4.6 · nat 4.7 | 146→148 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-07.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-07.json` |
| `n3-p04-r4` | 4 | n3 | aprovado | fl 4.5 · adeq 4 · nat 3.5 | 192→195 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-07.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-07.json` |
| `n3-p05-r1` | 1 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 95→94 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-07.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-07.json` |
| `n3-p05-r2` | 2 | n3 | aprovado | fl 4.6 · adeq 4.4 · nat 4.2 | 125→125 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-07.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-07.json` |
| `n3-p05-r3` | 3 | n3 | aprovado | fl 4.7 · adeq 4.4 · nat 4.5 | 153→150 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-07.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-07.json` |
| `n3-p05-r4` | 4 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4 | 196→195 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-07.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-07.json` |
| `n3-p06-r1` | 1 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 91→94 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-07.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-07.json` |
| `n3-p06-r2` | 2 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4 | 121→120 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-07.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-07.json` |
| `n3-p06-r3` | 3 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 139→134 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-08.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-08.json` |
| `n3-p06-r4` | 4 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 187→184 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-08.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-08.json` |
| `n4-p01-r1` | 1 | n4 | aprovado | fl 4.6 · adeq 4.2 · nat 4.1 | 219→219 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-08.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-08.json` |
| `n4-p01-r2` | 2 | n4 | aprovado | fl 4.8 · adeq 4.2 · nat 4.4 | 245→236 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-08.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-08.json` |
| `n4-p01-r3` | 3 | n4 | aprovado | fl 4.8 · adeq 4.2 · nat 4.4 | 301→295 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-08.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-08.json` |
| `n4-p01-r4` | 4 | n4 | aprovado | fl 4.7 · adeq 4.2 · nat 4.4 | 389→393 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-08.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-08.json` |
| `n4-p02-r1` | 1 | n4 | aprovado | fl 4.8 · adeq 4.2 · nat 4.4 | 202→198 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-08.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-08.json` |
| `n4-p02-r2` | 2 | n4 | aprovado | fl 4.8 · adeq 4.2 · nat 4.4 | 253→252 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-08.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-08.json` |
| `n4-p02-r3` | 3 | n4 | aprovado | fl 4.8 · adeq 4.4 · nat 4.6 | 300→299 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-08.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-08.json` |
| `n4-p02-r4` | 4 | n4 | aprovado | fl 4.8 · adeq 4.2 · nat 4.4 | 402→396 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-08.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-08.json` |
| `n4-p03-r1` | 1 | n4 | aprovado | fl 4.8 · adeq 4.4 · nat 4.2 | 197→192 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-09.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-09.json` |
| `n4-p03-r2` | 2 | n4 | aprovado | fl 4.8 · adeq 4.4 · nat 4.6 | 252→249 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-09.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-09.json` |
| `n4-p03-r3` | 3 | n4 | aprovado | fl 4.8 · adeq 4.4 · nat 4.6 | 304→298 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-09.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-09.json` |
| `n4-p03-r4` | 4 | n4 | aprovado | fl 4.8 · adeq 4.2 · nat 4.1 | 392→394 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-09.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-09.json` |
| `n4-p04-r1` | 1 | n4 | aprovado | fl 4.8 · adeq 4.4 · nat 4.2 | 219→215 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-09.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-09.json` |
| `n4-p04-r2` | 2 | n4 | reprovado | presença da protagonista em 50% das sentenças (limiar 60%) | 259→257 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-09.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-09.json` |
| `n4-p04-r3` | 3 | n4 | reprovado | presença da protagonista em 58% das sentenças (limiar 60%) | 321→322 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-09.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-09.json` |
| `n4-p04-r4` | 4 | n4 | aprovado | fl 4.8 · adeq 4.4 · nat 4.2 | 381→376 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-09.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-09.json` |
| `n4-p05-r1` | 1 | n4 | aprovado | fl 4.5 · adeq 4 · nat 4.2 | 183→178 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-09.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-09.json` |
| `n4-p05-r2` | 2 | n4 | aprovado | fl 4.8 · adeq 4.4 · nat 4.2 | 234→230 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-09.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-09.json` |
| `n4-p05-r3` | 3 | n4 | aprovado | fl 4.8 · adeq 4.4 · nat 4.2 | 290→288 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-10.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-10.json` |
| `n4-p05-r4` | 4 | n4 | aprovado | fl 4.7 · adeq 4.2 · nat 4 | 373→361 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-10.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-10.json` |
| `n4-p06-r1` | 1 | n4 | aprovado | fl 4.6 · adeq 4.2 · nat 4 | 191→186 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-10.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-10.json` |
| `n4-p06-r2` | 2 | n4 | aprovado | fl 4.8 · adeq 4.2 · nat 4.4 | 234→232 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-10.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-10.json` |
| `n4-p06-r3` | 3 | n4 | aprovado | fl 4.6 · adeq 4.2 · nat 3.8 | 284→291 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-10.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-10.json` |
| `n4-p06-r4` | 4 | n4 | aprovado | fl 4.6 · adeq 4.2 · nat 4 | 374→362 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-10.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-10.json` |
| `testemunha-r4-n3` | 4 | n3 | aprovado | fl 4.5 · adeq 4 · nat 4 | 203→208 | `experimentos/beats-para-paragrafos/saida/historias-base/rodada-10.json` | `experimentos/beats-para-paragrafos/saida/respostas-llm/rodada-10.json` |

## Apêndice — os 3 reprovados, com texto completo

### `n1-p05-r1` — rodada 1, n1

Motivos: presença da protagonista em 50% das sentenças (limiar 60%)

**Base:** A noite veio. O quintal tem segredo. A Joana quer ver. A noite abre com uma luz. Ela vai ver. Então, uma folha no ar. Vem vindo. Ela estica a mão. Um vento bate nela. Fresquinho.

**Realizado:** A noite veio e o quintal tem segredo. Joana quer ver, então a noite abre com uma luz e ela vai ver. Depois, uma folha vem vindo no ar. Ela estica a mão e um vento bate nela, fresquinho.

### `n4-p04-r2` — rodada 2, n4

Motivos: presença da protagonista em 50% das sentenças (limiar 60%)

**Base:** A noite desce devagar sobre o quintal, apagando as cores uma por uma — é assim que ele chama. A Joana abre a porta dos fundos e para um instante na soleira, sentindo o cheiro de grama fria, então entra na noite de pés descalços, como quem entra num segredo que vai ser contado só pra ela. O vento sobe pelos galhos e sacode a árvore inteira, de leve, como quem acorda alguém. Lá no alto, alguma coisinha se solta do galho e começa a descer rodando, sem pressa — um presentinho que o vento mandou pra Joana, e ela acompanha de queixo erguido. Pouco depois, bem lá em cima, uma folha se solta do galho e começa a descer — rodopiando devagar, sem pressa nenhuma, indo pra um lado e pro outro. A Joana estende a mão aberta embaixo e espera, quietinha, até a folha pousar de leve na palma dela, leve feito um cochicho. Foi então que o gato vê a folha caída e, por um segundo, esquece toda a pose de gato sério: abaixa o rabo, mira e pula — batendo de leve com a patinha, correndo atrás quando o vento leva a folha pra longe. A Joana ri baixinho: até gato sério vira filhote de noite. Perto da cerca, onde o escuro é mais escuro, uma luzinha acende e apaga como se respirasse. A Joana congela no meio do passo. É um vaga-lume — uma estrelinha que resolveu descer pra brincar no quintal — e ele pisca devagar, como quem chama a Joana pra perto.

**Realizado:** A noite descia devagar sobre o quintal, apagando as cores uma por uma, e era assim que ele chamava. Joana abriu a porta dos fundos e parou um instante na soleira, sentindo o cheiro de grama fria, então entrou na noite de pés descalços, como quem entrava num segredo que seria contado só para ela. O vento subia pelos galhos e sacudia a árvore inteira de leve, como quem acordava alguém. Lá no alto, alguma coisinha se soltou do galho e começou a descer rodando, sem pressa — era um presentinho que o vento mandou para Joana, e ela acompanhava tudo de queixo erguido. Pouco depois, bem lá em cima, uma folha se soltou do galho e começou a descer, rodopiando devagar, sem pressa nenhuma, indo para um lado e para o outro. Joana estendeu a mão aberta embaixo e esperou, quietinha, até a folha pousar de leve na palma dela, leve feito um cochicho. Foi então que o gato viu a folha caída e, por um segundo, esqueceu toda a pose de gato sério: ele abaixou o rabo, mirou e pulou, batendo de leve com a patinha e correndo atrás quando o vento levou a folha para longe. Joana riu baixinho, pensando que até gato sério virava filhote de noite. Perto da cerca, onde o escuro era mais escuro, uma luzinha acendeu e apagou como se respirasse. Joana congelou no meio do passo, pois era um vaga-lume, uma estrelinha que resolveu descer para brincar no quintal, e ele piscava devagar, como quem chamava Joana para perto.

### `n4-p04-r3` — rodada 3, n4

Motivos: presença da protagonista em 58% das sentenças (limiar 60%)

**Base:** Quando a última luz do dia se apaga atrás do muro, a Joana abre a porta dos fundos sem fazer barulho. O quintal, que de dia é só o quintal, à noite vira outro lugar — um lugar que só conta os segredos dele pra quem vem ver — e ela pisa na grama fria de pés descalços, o coração batendo forte de vontade de saber. O vento sobe pelos galhos e sacode a árvore inteira, de leve, como quem acorda alguém. Lá no alto, alguma coisinha se solta do galho e começa a descer rodando, sem pressa — um presentinho que o vento mandou pra Joana, e ela acompanha de queixo erguido. Sem que ninguém esperasse, do galho mais alto, uma folha se despede da árvore e vem descendo em espiral, de um lado pro outro, sem pressa nenhuma de chegar. A Joana fica embaixo, com a mão aberta feito um ninho, esperando — e a folha, depois de pensar um pouquinho, escolhe exatamente a mão dela pra pousar. Pouco depois, devagar, a lua sobe redonda e enorme por trás das árvores, e de repente o quintal inteiro se acende numa luz de prata, macia e quieta. A Joana joga a cabeça pra trás pra ver ela toda, e por um instante o quintal parece grande demais, do tamanho do céu. Foi então que a luz da lua encontra o gato em cima da cerca e acende os pelos dele um por um, até virarem fios de prata. Ele nem se mexe — gato sabe quando está bonito — e deixa a noite inteira admirar. A Joana admira junto, paradinha. Lá no canto onde o escuro é mais fundo, uma faísca minúscula acende e some, acende e some. A Joana prende a respiração e chega mais perto na ponta dos pés: é uma luzinha viva, flutuando no ar, piscando devagar como quem conta um segredo que só ela pode ouvir.

**Realizado:** Quando a última luz do dia se apagava atrás do muro, Joana abria a porta dos fundos sem fazer barulho. O quintal, que de dia era só um quintal, à noite virava outro lugar, um lugar que só contava seus segredos para quem vinha ver, e então ela pisava na grama fria de pés descalços, com o coração batendo forte de vontade de saber. O vento subia pelos galhos e sacudia a árvore inteira, de leve, como quem acordava alguém, e lá no alto, alguma coisinha se soltava do galho e começava a descer rodando, sem pressa. Era um presentinho que o vento mandava para Joana, e ela acompanhava tudo de queixo erguido. Sem que ninguém esperasse, do galho mais alto, uma folha se despedia da árvore e vinha descendo em espiral, de um lado para o outro, sem pressa nenhuma de chegar. Joana ficava embaixo, com a mão aberta feito um ninho, esperando, e a folha, depois de pensar um pouquinho, escolhia exatamente a mão dela para pousar. Pouco depois, devagar, a lua subia redonda e enorme por trás das árvores, e de repente o quintal inteiro se acendia numa luz de prata, macia e quieta. Joana jogava a cabeça para trás para ver a lua toda, e por um instante o quintal parecia grande demais, do tamanho do céu. Foi então que a luz da lua encontrava o gato em cima da cerca e acendia os pelos dele um por um, até virarem fios de prata. Ele nem se mexia, pois gato sabe quando está bonito, e deixava a noite inteira admirar, e Joana admirava junto, paradinha. Lá no canto onde o escuro era mais fundo, uma faísca minúscula acendia e sumia, acendia e sumia. Joana prendia a respiração e chegava mais perto na ponta dos pés, e então via que era uma luzinha viva, flutuando no ar, piscando devagar como quem contava um segredo que só ela podia ouvir.
