# Onda D — Bundle app + admin: sync remoto, faxina e pipeline (grupos G4, G12, G13)

**Fim:** histórias sobrevivem à troca de aparelho e falha de push não é silenciosa (G4 /
ML-1 onda-sync + D-06/D-07); repo enxuto, docs verdadeiras, branches limpas (G12); nada mais
drifta em silêncio — CI, bundles e e2e portáteis (G13).

**Por quê juntas:** as três tocam `src/backend`/`src/core` (compartilhados pelos dois bundles)
ou o próprio processo de build — exigem **`build:app` + `build:admin`** ao final. Fechar a onda
com o CI ligado (D8) garante que o rebuild do admin (PS-05) nunca mais atrase.

**Unidade de deploy:** BUNDLE app + admin. Sem edge, sem SQL (os índices foram na Onda A).
**Depende de:** decisão de G10/E3 sobre a edge `proxy-ia` para D4/D5 (se aposentar, `proxy_ia.ts`
sai aqui); o resto é independente.

## Subtarefas e ordem

| # | Arquivo | Grupo | O que entrega | Depende de |
|---|---|---|---|---|
| D1 | `D1-leitura-hibrida-e-desempate.md` | G4 | repo sincronizado lê local+remoto, merge por id com `atualizado_em` (D-07) + teste "2 aparelhos" | — |
| D2 | `D2-retry-e-telemetria-do-push.md` | G4 | fila/retry no espelho remoto e sinal de falha (D-06) | D1 |
| D3 | `D3-chave-legada-e-tipos.md` | G4 | aposentar `pipoca.perfis.v1` nos 3 pontos (D-21); extrair interfaces dos 2 ciclos type-only | — |
| D4 | `D4-remover-mortos.md` | G12 | Geração 1, `roteador.ts`, `playwright.config.ts`, assets, exports, dirs vazios | decisão E3 (proxy-ia) |
| D5 | `D5-firebase-agents-e-guia.md` | G12 | aposentar ramo firebase (código+testes+doc); `.agents/`→`docs/`; corrigir o guia | — |
| D6 | `D6-branches-gitignore-hooks.md` | G12 | apagar branches mergeadas; `.gitignore`; `post-merge.sh` | — |
| D7 | `D7-e2e-portateis.md` | G13 | runners sem caminhos da máquina do autor | — |
| D8 | `D8-ci-workflow.md` | G13 | GitHub Actions: typecheck → testes → build → bundle-check → e2e → paridade | D7 |
| D9 | `D9-fechamento-onda-D.md` | — | `build:app` + `build:admin` (fecha PS-05), e2e, catálogo | D1–D8 |

## Definição de pronto da onda
- Teste "2 aparelhos" verde: história gravada em B aparece em A com o perfil já presente em A.
- Falha de push gera retry e sinal (log/telemetria), não catch vazio.
- `grep -rn "pipoca.perfis.v1" src/` → só a migração one-shot (ou 0).
- `src/ia/` contém só `provedor.ts` (+ o que E2/E3 decidiu sobre `guardrails.ts`); sem `roteador.ts`,
  sem `playwright.config.ts`, sem `.thumbnail`, sem `.canvas/`, sem PNGs órfãos.
- `git branch --merged 28_08_26` lista só a branch atual e `main`.
- CI verde na branch com bundle-check; `pipoca.admin.bundle.js` no mesmo commit que `src/`.
