# 60 · scripts e experimentos

← [Mapa geral](00-MAPA-GERAL.md) · [Glossário](90-GLOSSARIO.md)

Ferramentas fora do runtime do app: o smoke de produção e os dois experimentos de
calibração. **Aqui mora quase todo o gasto de API paga do repositório** — a fronteira
abaixo é o que você mais precisa saber antes de rodar qualquer coisa.

## ⚠️ O que GASTA API paga vs o que é OFFLINE

| GASTA dinheiro (chama LLM pago) | Offline / grátis |
|---|---|
| [`scripts/smoke-realizador.mjs`](../../scripts/smoke-realizador.mjs) (edge de produção) | [`scripts/post-merge.sh`](../../scripts/post-merge.sh) (hook `npm install`) |
| [`experimentos/beats-para-paragrafos/gerar-historias.ts`](../../experimentos/beats-para-paragrafos/gerar-historias.ts) (~97 chamadas Gemini) | `camada1-fidelidade.ts`, `termos-nucleo.ts`, `relatorios.ts`, `matriz-amostragem.ts`, `linha-aleatoria.ts`, `rng.ts`, `persistencia.ts`, `carregar-env.ts`, `tipos.ts` |
| `beats-para-paragrafos/gemini-cliente.ts` (fetch Gemini) | (todos os testes — ver [50 · testes](50-testes.md)) |
| `beats-para-paragrafos/avaliar/avaliar-pares.ts` e `avaliar/camada2-juiz.ts` (juiz OpenAI) | |
| [`experimentos/fichas-para-historias/gerar.ts`](../../experimentos/fichas-para-historias/gerar.ts) (Gemini, pipeline real) | `fichas-para-historias/matriz.ts`, `tipos.ts` |
| `fichas-para-historias/smoke.ts` (2 chamadas: Gemini + OpenAI) | todo o `_andaime-arquivado/` (código congelado) |
| `fichas-para-historias/gemini-cliente-fichas.ts` e `avaliar/avaliar.ts` (juiz OpenAI) | |

As chaves dos experimentos (`GEMINI_API_KEY`, `OPENAI_API_KEY`) vivem no `.env` da
raiz (gitignored), carregadas por
[`carregar-env.ts`](../../experimentos/beats-para-paragrafos/carregar-env.ts). Isto é
separado da fronteira de credencial do app (ver [40](40-backend-e-edge.md)) — aqui é
código de bancada, não o produto.

## O smoke de produção

- [`scripts/smoke-realizador.mjs`](../../scripts/smoke-realizador.mjs) — **⚠️ GASTA API
  paga.** POSTa um _Pacote_ real na edge `realizador` **de produção**, que chama o LLM
  pago. Prova que a edge COMPLETA uma realização de verdade: assere `origem.fonte ===
  "llm"` (não fallback) e `veredito.pass === true`. O script em si é keyless.
  Roda por: `node scripts/smoke-realizador.mjs` com env `SUPA_URL` / `ANON_KEY` /
  `SMOKE_EMAIL`. **Não há script npm** para ele — é manual, de propósito.

## Experimento A · `beats-para-paragrafos/` (B1.5: beats → prosa)

Bancada que mede se um LLM transforma _beats_ em parágrafos fiéis. A **camada 1**
([`camada1-fidelidade.ts`](../../experimentos/beats-para-paragrafos/avaliar/camada1-fidelidade.ts))
é o gate factual determinístico offline — a fonte de verdade; a **camada 2**
([`camada2-juiz.ts`](../../experimentos/beats-para-paragrafos/avaliar/camada2-juiz.ts),
[`avaliar-pares.ts`](../../experimentos/beats-para-paragrafos/avaliar/avaliar-pares.ts))
é o juiz LLM pago, só para pares que passam na camada 1. Geração:
[`gerar-historias.ts`](../../experimentos/beats-para-paragrafos/gerar-historias.ts) +
[`gemini-cliente.ts`](../../experimentos/beats-para-paragrafos/gemini-cliente.ts).

## Experimento B · `fichas-para-historias/` (ciclo 2 / fase 12)

Consome o pipeline REAL de produção (`compor()` + `realizar()` com o prompt-template e
o validador canônicos), medindo fichas → histórias:
[`gerar.ts`](../../experimentos/fichas-para-historias/gerar.ts) (Gemini),
[`avaliar/avaliar.ts`](../../experimentos/fichas-para-historias/avaliar/avaliar.ts)
(juiz OpenAI; a camada-1 vem do validador de produção),
[`smoke.ts`](../../experimentos/fichas-para-historias/smoke.ts) (2 chamadas para validar
ids de modelo antes do lote). A parte offline testável está em
[`fichas-experimento.test.ts`](../../experimentos/fichas-para-historias/fichas-experimento.test.ts)
(entra em `bun run test`).

### O andaime arquivado (`_andaime-arquivado/`)
Código congelado que virou legado quando o validador e o prompt-template foram
promovidos a runtime canônico (`src/core/realizador/`): `camada1-fichas.ts`,
`gramatica-andaime.ts`, `micro-sanidade.ts`, `montar-prompt.ts`. Preservado como
registro, fora do caminho ativo.

## As camadas históricas de `saida/`

Cada experimento tem sua própria pasta `saida/` com JSON de calibração
**versionado** (não é código — não recebe cabeçalho). Em
`experimentos/fichas-para-historias/saida/geracao/`, os prefixos `_` são **camadas
históricas** — fotos de rodadas antigas, guardadas para comparação:

- `_pre-recalibracao/` — lotes de ANTES de recalibrar os limiares do validador.
- `_ciclo1-pr21/` — os lotes do ciclo 1 (PR #21), a linha de base contra a qual as
  rodadas seguintes são comparadas (também em `saida/avaliacao/_ciclo1-pr21/`).
- `_micro/` — a micro-sanidade (1 chamada, `micro-sanidade-r1n1.json`).
- `_amostra/` — um subconjunto de amostra.

Os JSON no topo de `saida/geracao/` (`t0_2-*`, `t0_4-*`) são a rodada corrente. Em
`beats-para-paragrafos/saida/` a organização é por etapa (`historias-base/`,
`respostas-llm/`, `avaliacao/`, `monitoramento/`), sem os prefixos `_`.
