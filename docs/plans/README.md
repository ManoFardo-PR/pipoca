# Pipoca · Planos de implementação faseados

Plano executável que leva o **Pipoca** do protótipo atual ([Pipoca.dc.html](../../Pipoca.dc.html)) à
arquitetura-alvo [v2.0](../arquitetura_pipoca_versao_2_0.mermaid), em **6 fases (00–05)**. Cada **sub-passo** é
um arquivo `.md` autocontido em `faseFF/`, escrito com nomes, variáveis, regras de negócio e os contratos de
interação entre os arquivos.

## Como ler
1. Comece pelos **contratos** em [`_contratos/`](_contratos/) — o vocabulário canônico (tipos, schemas, ações,
   convenções dc-runtime, a lei do seam, o glossário/mapa de nós). Nenhum sub-passo redefine esses nomes.
2. Veja o **gabarito** de cada doc em [`_TEMPLATE.md`](_TEMPLATE.md).
3. Leia as fases em ordem. A **linha verde (MVP)** está coberta por `fase00` + `fase01` (+ login/kid-mode da `fase02`).
4. Cross-references usam `[[faseFF-FF-NN]]` (sub-passos) e `[[_contratos/nome]]` (contratos).

## Fases
| Fase | Pasta | Escopo | Nós da arquitetura |
|------|-------|--------|--------------------|
| 00 | [`fase00_fundacao/`](fase00_fundacao/) | build, runtime, tokens, CORE, persistência, schemas, Contrato + Motor A | PERF, SESS, HIST, ECON, MODES, CN, MA, GRAPH, LEVELS, SAVE |
| 01 | [`fase01_mvp_linha_verde/`](fase01_mvp_linha_verde/) | fluxo da criança T2→T7 + A11Y + TTS | T2–T7, A11Y, TTS |
| 02 | [`fase02_acesso_controle_parental/`](fase02_acesso_controle_parental/) | login família, kid mode, PIN, e tudo atrás do PIN | HH_LOGIN, KIDMODE, PINGATE, PC_HOME/PROF/LIM/RULES/AI/PRIV |
| 03 | [`fase03_painel_evolucao/`](fase03_painel_evolucao/) | telemetria + painel do cuidador (Fase 1.5) | TELE, PC_DASH |
| 04 | [`fase04_super_admin/`](fase04_super_admin/) | plataforma multi-tenant | SA_LOGIN, SA_HOME/TENANT/CONTENT/AI/SAFE |
| 05 | [`fase05_ia_e_fala/`](fase05_ia_e_fala/) | Fase 2: Motor B + provedor multi-IA + guardrails + ASR | MB, AIPROV, GUARD, GEMINI/OPENAI/CLAUDE, ASR, AIMODEL |

## A correção central
O protótipo faz um **quebra-cabeça de ordenar cards**; o motor faz **adicionar objeto → ler → destravar**.
Decisão: **manter o quebra-cabeça** e fazer o grafo/motor se adaptarem a ele. Doc canônico:
[[fase00-00-20]] (`fase00_fundacao/00-20_RECONCILIACAO-mecanica-tira.md`).

## Diagnóstico de integridade
```
node docs/plans/check_plans.mjs
```
Valida cobertura de nós, telas do brief, linha verde, links `[[...]]`, nomes canônicos, ordem de dependências
(sem ciclo/forward), a lei do seam, a reconciliação e a conformidade de template. Gera
[`_diagnostico.md`](_diagnostico.md) e sai com código 0 quando tudo está verde.
