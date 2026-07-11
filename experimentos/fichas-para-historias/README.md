# Experimento · Fichas → Histórias (validação em escala das fases 10/12)

> 🟡 **STATUS · 2026-07-10 · CICLO 2 (fase 12) — realizador REAL** — o experimento agora
> consome o pipeline de produção: `compor()` (`src/core/compositor/`) monta o Pacote das
> fichas e `realizar()` (`src/core/realizador/`) chama o LLM com o prompt-template
> calibrado (tabela canônica "Máximo" + few-shot por nível) e valida com o validador de
> produção. O ANDAIME do ciclo 1 está em `_andaime-arquivado/` (cumpriu o papel — LEIA-ME
> lá). Artefatos do ciclo 2 em `saida/avaliacao/`; a grade do ciclo 1 (PR #21) preservada
> em `saida/avaliacao/_ciclo1-pr21/` para o lado a lado da Parada de Voz.

> ✅ Ciclo 1 (fase 10, PR #21 mesclado): validação em escala com andaime — 291 casos,
> fidelidade 93% em regime fidelidade-pura; pendências herdadas pela fase 12 (ver
> `docs/plans02/TRILHA-plans02.md`, "Fechamento da fase 10").
>
> Pasta irmã de `experimentos/beats-para-paragrafos/` (INTOCADA — reutilizamos
> por import somente-leitura: `carregar-env`, `rng`, o juiz da Camada 2).

## Como rodar

```bash
# 0) Chaves (as do Manoel; nunca commitar) — .env na RAIZ do repo ou export no shell:
#    GEMINI_API_KEY=...   GEMINI_MODEL=gemini-2.5-flash
#    OPENAI_API_KEY=...   OPENAI_MODEL=gpt-4o-mini

# 1) SMOKE primeiro (2 chamadas reais, 1 por provedor — valida ids de modelo):
bun run experimentos/fichas-para-historias/smoke.ts

# 2) AMOSTRA (12-05): 3 estados/célula = 48+testemunha, em saida/geracao/_amostra/:
EXP_ESTADOS_POR_CELULA=3 EXP_TEMPERATURAS="0.4" bun run experimentos/fichas-para-historias/gerar.ts

# 3) Lote completo (sequencial, lotes de 10, persistência incremental em saida/):
EXP_TEMPERATURAS="0.2,0.4,0.7" bun run experimentos/fichas-para-historias/gerar.ts
bun run experimentos/fichas-para-historias/avaliar/avaliar.ts  # juiz (OpenAI) nos aprovados

# Retomada: lotes já gravados em saida/geracao/ são pulados.
```

## Matriz

Rodada (R1..R4) × nível (n1..n4) × 6 estados por célula (3 com Joana/f, 3 com
Pietro/m — eixo de gênero do veredito A-1) = 96 estados + 1 testemunha
(R4×n3, a linha da tira real: vagalume→frasco→lua→gato→vento→folha).
A amostra (`EXP_ESTADOS_POR_CELULA=3`) é um PREFIXO da matriz cheia (mesmos
ids/seeds/linhas).

## Avaliador (ciclo 2)

- **Camada 1** = o validador de PRODUÇÃO (`src/core/realizador/validador.ts`),
  aplicado na própria geração e gravado no registro: âncora por beat do Pacote
  (orvalho corrigido: `gota*`); presença POR BEAT; gênero BIDIRECIONAL; teto de
  crescimento sobre o MÁXIMO CANÔNICO (+25%); ritmo n1 como GATE (≤12 pontos
  finais; ≤2 frases/beat); avisos de tempo verbal e parágrafos.
- **Camada 2** (juiz OpenAI ≠ gerador; só nos aprovados): fluidez/adequação/
  naturalidade — reutiliza `../beats-para-paragrafos/avaliar/camada2-juiz.ts`.

## Saídas (Parada de Voz da fase 12)

`saida/avaliacao/grade.json` (PASS por rodada×nível×gênero×temperatura) ·
`saida/avaliacao/para-leitura.md` (aprovados, piores primeiro, n1 destacado) ·
`saida/avaliacao/reprovados.md` (motivo a motivo) · `saida/avaliacao/consolidado.md`
(chamadas/erros/tokens/custo). Grade antiga: `saida/avaliacao/_ciclo1-pr21/`.
