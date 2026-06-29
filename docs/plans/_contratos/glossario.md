# Contrato · Glossário e mapa nó-da-arquitetura → fase/doc dono

> **Autoridade de propriedade.** Cada nó do [mermaid v2.0](../../arquitetura_pipoca_versao_2_0.mermaid) tem
> **exatamente um doc dono** (linha única abaixo). Outros docs podem *consumir* o nó (citam em "Relações"),
> mas só o dono o define. O [[../check_plans]] lê esta tabela como fonte da verdade da propriedade.

Formato das linhas da tabela: `| NÓ | classe | dono |` onde `dono` é um id `faseFF-FF-NN`.

## Mapa de propriedade (43 nós)

| NÓ | classe | dono |
|----|--------|------|
| SA_LOGIN | admin | fase04-04-01 |
| HH_LOGIN | mvp | fase02-02-01 |
| KIDMODE | mvp | fase02-02-02 |
| PINGATE | admin | fase02-02-03 |
| SA_HOME | admin | fase04-04-02 |
| SA_TENANT | admin | fase04-04-03 |
| SA_CONTENT | admin | fase04-04-04 |
| SA_AI | admin | fase04-04-05 |
| SA_SAFE | admin | fase04-04-06 |
| PC_HOME | admin | fase02-02-04 |
| PC_PROF | admin | fase02-02-05 |
| PC_LIM | admin | fase02-02-06 |
| PC_RULES | admin | fase02-02-07 |
| PC_AI | admin | fase02-02-08 |
| PC_PRIV | admin | fase02-02-09 |
| PC_DASH | admin | fase03-03-02 |
| T2 | mvp | fase01-01-01 |
| T3 | mvp | fase01-01-02 |
| T4 | mvp | fase01-01-03 |
| T5 | mvp | fase01-01-06 |
| T6 | mvp | fase01-01-10 |
| T7 | mvp | fase01-01-11 |
| A11Y | mvp | fase01-01-12 |
| PERF | mvp | fase00-00-07 |
| SESS | mvp | fase00-00-08 |
| HIST | mvp | fase00-00-09 |
| ECON | mvp | fase00-00-10 |
| MODES | mvp | fase00-00-11 |
| CN | pivot | fase00-00-16 |
| MA | mvp | fase00-00-17 |
| MB | f2 | fase05-05-01 |
| AIPROV | pivot | fase05-05-04 |
| GUARD | f2 | fase05-05-08 |
| GEMINI | f2 | fase05-05-06 |
| OPENAI | f2 | fase05-05-07 |
| CLAUDE | f2 | fase05-05-05 |
| GRAPH | mvp | fase00-00-13 |
| LEVELS | mvp | fase00-00-15 |
| AIMODEL | f2 | fase05-05-02 |
| SAVE | mvp | fase00-00-12 |
| TTS | mvp | fase01-01-09 |
| ASR | f2 | fase05-05-09 |
| TELE | admin | fase03-03-01 |

## Telas do brief → docs

| Tela do brief | Doc(s) |
|---------------|--------|
| 1 · Onboarding do cuidador | fase02-02-04 |
| 2 · Entrada da criança | fase01-01-01 |
| 3 · Seleção de cenário | fase01-01-02 |
| 4 · Ambiente herói | fase01-01-03 · fase01-01-04 · fase01-01-05 |
| 5 · Leitura / o portão | fase01-01-06 · fase01-01-07 · fase01-01-08 |
| 6 · Recompensa imediata | fase01-01-10 |
| 7 · Cardápio / pote | fase01-01-11 |
| 8 · Painel do cuidador | fase03-03-02 |

## Vocabulário (índice rápido)
- **Linha verde** = caminho mínimo de teste com o Pietro (nós `class … mvp`): HH_LOGIN, KIDMODE, T2–T7, A11Y,
  PERF, SESS, HIST, ECON, MODES, CN/MA, GRAPH, LEVELS, TTS, SAVE.
- **eixo 1** = Contrato de Narrativa (`CN`). **eixo 2** = Provedor de IA (`AIPROV`).
- **regra de ouro** = todo fragmento novo é lido no portão antes de soltar o próximo objeto.
- **2/3 · 1/3** = sugestão de gastar ~2/3 dos vaga-lumes e poupar ~1/3.
- **Premack** = atividade preferida (brincar/destravar) condicionada à atividade-alvo (ler).
- Tipos → [[tipos-core]] · schemas → [[schemas-json]] · ações → [[eventos-acoes]] · runtime →
  [[convencoes-dc-runtime]] · seam → [[lei-do-contrato]].
