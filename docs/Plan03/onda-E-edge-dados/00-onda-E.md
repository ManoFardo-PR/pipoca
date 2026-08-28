# Onda E — Edge e dados: pacote rico com fonte única, cenários como dado (grupos G10, G11)

**Fim:** o cliente manda só o pacote e cliente/edge não divergem em silêncio; o texto ganha o
sentimento já autorado nas fichas (G10 / ML-5); adicionar um cenário = escrever JSON + SVG,
sem tocar código (G11 / ML-2).

**Por quê juntas:** G10 exige redeploy de edge (agrupar tudo que toca `functions/` num só
redeploy) e G11 toca a galeria da T3 + o carregamento de dados — ambos os grupos convergem no
mesmo `build:app` e dependem das decisões de conteúdo do dono.

**Unidade de deploy:** BUNDLE app + EDGE `realizador` (+ decisão sobre `proxy-ia`) + dados
(`docs/*.json`, CRU). **Depende de:** Onda A (E1–E3 — não enriquecer o envio antes de gateá-lo);
C5 (se `cenas` foi exposto via bridge, E5 reusa).

## Subtarefas e ordem

| # | Arquivo | Grupo | O que entrega | Depende de |
|---|---|---|---|---|
| E1 | `E1-pacote-v1-1-sentimentos.md` | G10 | `beats[].sentimento`/`sentido` no pacote e no prompt; goldens regenerados | Onda A |
| E2 | `E2-paridade-cliente-edge.md` | G10 | `scripts/paridade-edge.mjs` (falha no CI se divergir); decisão do canônico dos guardrails; teste de paridade da gramática | D8 (CI) opcional |
| E3 | `E3-prompt-na-edge-e-proxy-ia.md` | G10 | cliente envia só o pacote; edge monta o prompt; destino da edge `proxy-ia`; redeploy | E1, E2 |
| E4 | `E4-manifesto-de-cenarios.md` | G11 | `docs/cenarios.index.json`; fetches derivados; id canônico único | — |
| E5 | `E5-galeria-t3-honesta.md` | G11 | cartões "Em breve" honestos; pílula; T3 no celular; SVG sem cópia | E4, C5 |
| E6 | `E6-pipeline-de-autoria.md` | G11 | lints no CI; doc "como adicionar um cenário"; arquivamento do `Pasted-*.txt` | E4 |
| E7 | `E7-fechamento-onda-E.md` | — | `build:app`, paridade, e2e, prova das edges, merge, catálogo | E1–E6 |

## Definição de pronto da onda
- Prompt gerado contém o sentimento/sentido de cada beat; goldens e `smoke-realizador` verdes.
- `npm run check:paridade` verde; nenhuma tabela duplicada sem verificação.
- Corpo do POST à edge = `{pacote, tenantId?}` (sem `prompt`); edge redeployada; e2e geracao2 verde.
- Um cenário novo de teste (fixture) aparece na galeria só por estar no manifesto + liberado.
- 4 cartões "Em breve" com `disabled`/`aria-disabled` e feedback ao toque; T3 rola/quebra bem a 390px.
