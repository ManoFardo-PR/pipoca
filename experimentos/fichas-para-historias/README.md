# Experimento · Fichas → Histórias (validação em escala da fase 10)

> **O portão do `docs/plans02/fase10_modelo_de_fichas/10-04`**: o LLM realiza
> histórias a partir das FICHAS (`docs/fichas/*.v1.json`) — não mais dos beats
> do motor — e a Camada 1 determinística mede fidelidade/gênero/nível. A fase 11
> só destrava com a grade + a leitura em voz alta do Manoel (Parada Dura 2).
>
> ⚠️ **ANDAIME DESCARTÁVEL.** O montador de prompt e a gramática daqui existem
> SÓ para este experimento. É PROIBIDO promovê-los a `src/core/compositor/` ou
> `src/core/geracao/` — os módulos de produção nascem nas fases 11/13, guiados
> pelos docs do plans02, não por este código.
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

# 2) Lote completo (sequencial, lotes de 10, persistência incremental em saida/):
bun run experimentos/fichas-para-historias/gerar.ts            # gerador (Gemini)
bun run experimentos/fichas-para-historias/avaliar/avaliar.ts  # Camada 1 + juiz (OpenAI)

# Temperaturas: EXP_TEMPERATURAS="0.2,0.4,0.7" (default: 0.4)
# Retomada: lotes já gravados em saida/geracao/ são pulados.
```

## Matriz

Rodada (R1..R4) × nível (n1..n4) × 6 estados por célula (3 com Joana/f, 3 com
Pietro/m — eixo de gênero do veredito A-1) = 96 estados + 1 testemunha
(R4×n3, a linha da tira real: vagalume→frasco→lua→gato→vento→folha).

## Avaliador

- **Camada 1** (determinística, `avaliar/camada1-fichas.ts`): âncora lexical por
  objeto; presença POR BEAT (a lição do falso-FAIL do experimento-beats);
  gênero BIDIRECIONAL (artigo/palavra/flexão predicativa nos dois sentidos);
  teto de crescimento (base = material textual do prompt); ritmo n1 como GATE
  (≤12 pontos finais; ≤2 frases/beat).
- **Camada 2** (juiz OpenAI ≠ gerador; só nos aprovados): fluidez/adequação/
  naturalidade — reutiliza `../beats-para-paragrafos/avaliar/camada2-juiz.ts`.

## Saídas (Parada Dura 2)

`saida/avaliacao/grade.json` (PASS por rodada×nível×gênero×temperatura) ·
`saida/avaliacao/para-leitura.md` (aprovados, piores primeiro, n1 destacado) ·
`saida/avaliacao/reprovados.md` (motivo a motivo).
