# Experimento B1.5 — Realizador Literário (gerador + avaliador)

Experimento standalone, isolado do app: mede se um LLM consegue transformar
os beats do Motor A+ em prosa infantil fluida sem infidelidade, e em quais
combinações de rodada×nível isso é confiável. Não altera o runtime do app.

Ver o plano completo em `docs/` do repositório (histórico da conversa) para o
contexto e as decisões de design. Resumo operacional abaixo.

## Script 1 — Gerador

Gera ~97 estados (matriz 4 rodadas × 4 níveis, ~6 por célula, + 1
estado-testemunha) a partir do motor real (`src/core/composicao.ts`) e manda
cada um pro Gemini para "realizar" o texto em prosa fluida.

```
GEMINI_API_KEY=xxx bun run gerar-historias.ts
```

Variáveis de ambiente:

| Variável | Obrigatória | Default | Uso |
|---|---|---|---|
| `GEMINI_API_KEY` | sim (exceto testes) | — | chave da API Gemini |
| `GEMINI_MODEL` | não | `gemini-2.5-flash` | confirme que é um id real e válido antes de rodar |
| `GEMINI_TEMPERATURE` | não | `0.4` | registrada em `saida/monitoramento/meta.json` |
| `PLAYTHROUGHS_POR_NIVEL` | não | `6` | 4 níveis × N partidas × 4 rodadas = total de estados |
| `TAMANHO_LOTE` | não | `10` | histórias por arquivo de saída |
| `SEED_BASE` | não | `Date.now()` | fixe para reproduzir uma rodada anterior |
| `MODO_VARIANCIA` | não | desligado (`1` para ligar) | sub-lote pequeno, mesmo estado em temperaturas diferentes |

Saída em `saida/historias-base/` (texto cru do motor) e `saida/respostas-llm/`
(texto realizado pelo Gemini), em lotes `rodada-XX.json`, mais
`saida/monitoramento/` com os tempos de cada chamada.

**Custo real**: cada execução completa faz ~97 chamadas pagas à API do
Gemini. Rode primeiro com `PLAYTHROUGHS_POR_NIVEL=1` (~5 estados) para
conferir a saída antes da execução completa.

## Script 2 — Avaliador

Lê `saida/historias-base/` + `saida/respostas-llm/`, junta por id em pares, e
roda:

- **Camada 1** (código, sem IA): gate factual — cobertura de núcleo por
  objeto, presença da protagonista, teto de crescimento, ritmo em n1. É a
  fonte de verdade.
- **Camada 2** (só nos pares que passaram a Camada 1): juiz LLM via OpenAI —
  fluidez/adequação/naturalidade, 0-5 cada.

```
OPENAI_API_KEY=xxx bun run avaliar/avaliar-pares.ts
```

| Variável | Obrigatória | Default |
|---|---|---|
| `OPENAI_API_KEY` | sim (exceto testes) | — |
| `OPENAI_MODEL` | não | **confirme o id exato antes de rodar** — não há default validado contra a API real neste projeto |

Saída em `saida/avaliacao/`: `grade.json` (matriz de decisão),
`para-leitura.md` (pares aprovados, piores primeiro), `reprovados.md`
(motivos de reprovação — insumo para endurecer o prompt do gerador).

## Loop de melhoria

1. Rodar gerador → avaliador.
2. Ler `reprovados.md`: que regra do prompt do gerador precisa endurecer?
3. Ler `para-leitura.md` em voz alta.
4. Ajustar o prompt do gerador; re-rodar. A nota do juiz (Camada 2) é
   termômetro de triagem, nunca o alvo.

## Rodando os testes (sem rede, sem custo)

```
bun run gerar-historias.test.ts
bun run avaliar/avaliar-pares.test.ts
```

## v2 (fora de escopo agora)

Retomada automática ao reiniciar o script; re-julgamento por um segundo LLM
(Claude) para concordância inter-juiz.
