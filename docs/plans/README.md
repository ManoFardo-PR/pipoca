# Pipoca · Planos de implementação faseados

Plano executável que leva o **Pipoca** do protótipo original ([Pipoca.dc.html](../../old/Pipoca.dc.html), hoje em `old/`) à
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
| 06 | [`fase06_backend/`](fase06_backend/) | Backend e login agnósticos (Supabase \| Firebase), multi-tenant, proxy de IA | (implementa SAVE, HH_LOGIN, SA_LOGIN, SA_TENANT, SA_AI) |
| 07 | [`fase07_qa_a11y/`](fase07_qa_a11y/) | Testes e2e da linha verde + auditoria de acessibilidade + teste com criança | — |
| 08 | [`fase08_conteudo/`](fase08_conteudo/) | Pipeline de conteúdo: os 4 cenários restantes (grafos + arte) | (alimenta GRAPH via SA_CONTENT) |

> As fases 06–08 são extensões pós-arquitetura-v2.0: não são donas de nós do mermaid (os 43 nós seguem nas fases
> 00–05); elas **implementam/consomem** nós existentes. Backend e login são **trocáveis** (Supabase ou Firebase)
> via seam + adaptador — ver [[_contratos/lei-do-contrato]] (lei do backend).

## A correção central
A decisão original ("**manter o quebra-cabeça** de ordenar cards e fazer o grafo/motor se adaptarem a ele")
foi **superada em 2026-07-01**: a mecânica canônica da linha verde é a **composição autoral v2**
(`src/core/composicao.ts` · `docs/quintal.v2.json` · esquema `pipoca.grafo-autoral.v2`) — R1 ordena 3 com
pontas travadas, R2–R4 inserem no miolo, banco = novas + sobras, e a história cresce a cada leitura no portão.
Fluxo vivo: [`pipoca-fluxo-v2.mermaid`](../pipoca-fluxo-v2.mermaid). Registro histórico da decisão revertida:
selo SUPERSEDED em [[fase00-00-20]] (`fase00_fundacao/00-20_RECONCILIACAO-mecanica-tira.md`).

## Diagnóstico de integridade
```
node docs/plans/check_plans.mjs
```
Valida cobertura de nós, telas do brief, linha verde, links `[[...]]`, nomes canônicos, ordem de dependências
(sem ciclo/forward), a lei do seam, a reconciliação e a conformidade de template. Gera
[`_diagnostico.md`](_diagnostico.md) e sai com código 0 quando tudo está verde.
