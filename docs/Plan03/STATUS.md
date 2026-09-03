# STATUS — Plan03 (gerado por `scripts/plan03.mjs`; não editar à mão)

- Gerado em: 2026-09-03T12:27:36.028Z · branch `onda-D-bundle-app-admin` · HEAD `2c2e9cc`
- Progresso: **43/59** passos concluídos
- Próximo passo: **D4** — Remoção segura de mortos ([abrir](onda-D-bundle-app-admin/D4-remover-mortos.md))
- Última verificação: ✅ verde em 2026-09-01T19:49:58.339Z (tsc:✓ unit:✓ e2e:reordenar:✓ e2e:linha-verde:✓ e2e:admin:✓ e2e:geracao2:✓)
- Alertas: 
  - ⚠ árvore suja (2 arquivo(s)) — commite antes de concluir um passo
  - ⚠ pipoca.bundle.js é mais antigo que src/core, src/backend, src/servicos, src/app/bridge.ts, src/dados (rebuild pendente)
  - ⚠ pipoca.admin.bundle.js é mais antigo que src/core, src/backend, src/servicos, src/admin, src/dados (rebuild pendente)

## Onda P — Preparação · 3/3 · branch `28_08_26` · —

| Passo | Título | Status | Data | Commit |
|---|---|---|---|---|
| P1 | Conferir ambiente e registrar a régua (tsc, 143 unit, 175 e2e) | [✓] concluída | 2026-08-28 | `f84ea58` |
| P2 | Screenshots "antes" com o harness | [✓] concluída | 2026-08-28 | `888858d` |
| P3 | Painel inicial: `status` aponta A0 como próximo | [✓] concluída | 2026-08-28 | `f9898f6` |

## Onda A — Segurança e consentimento de IA · 6/6 · branch `onda-A-seguranca` · BUNDLE app + EDGE ×2 + SQL

| Passo | Título | Status | Data | Commit |
|---|---|---|---|---|
| A0 | Criar branch onda-A-seguranca a partir de 28_08_26 | [✓] concluída | 2026-08-28 | `b65645e` |
| A1 | [Gate único de consentimento no cliente](onda-A-seguranca/A1-gate-consentimento-cliente.md) | [✓] concluída | 2026-08-28 | `5ecc07d` |
| A3 | [Migração escrita (NÃO aplicada): RPC, índices, políticas](onda-A-seguranca/A3-migracao-rpc-indices-politicas.md) ∥ | [✓] concluída | 2026-08-28 | `f0dbab0` |
| A2 | [Toggle de IA honesto](onda-A-seguranca/A2-toggle-ia-honesto.md) | [✓] concluída | 2026-08-28 | `f9aca22` |
| A4 | [Edges: RPC de cota e MODELO_PADRAO alinhado](onda-A-seguranca/A4-edges-rpc-e-modelo-padrao.md) | [✓] concluída | 2026-08-28 | `8e3be20` |
| A5 | [Fechamento A: SQL aplicada → redeploy ×2 → build:app → e2e → merge](onda-A-seguranca/A5-fechamento-onda-A.md) | [✓] concluída | 2026-08-28 | `9837eee` |

## Onda B — UX servida crua · 15/15 · branch `onda-B-cru-ux` · CRU (commit = deploy)

| Passo | Título | Status | Data | Commit |
|---|---|---|---|---|
| B0 | Criar branch onda-B-cru-ux a partir de 28_08_26 | [✓] concluída | 2026-08-28 | `9de2035` |
| B1 | [Mecanismo de a11y: classe↔atributo; contraste que não destrói](onda-B-cru-ux/B1-mecanismo-a11y-classe-atributo.md) | [✓] concluída | 2026-08-28 | `da4017c` |
| B2 | [Paleta com contraste real e escala tipográfica](onda-B-cru-ux/B2-paleta-com-contraste-e-tipografia.md) | [✓] concluída | 2026-08-28 | `8050627` |
| B3 | [Foco visível global e movimento pelo token](onda-B-cru-ux/B3-foco-visivel-e-movimento.md) | [✓] concluída | 2026-08-28 | `a61221f` |
| B4 | [PainelA11y: tokens, switch, dialog, alvos](onda-B-cru-ux/B4-painel-a11y.md) | [✓] concluída | 2026-08-28 | `05cd163` |
| B-M1 | Merge da trilha tokens/a11y em 28_08_26 (vai ao ar) | [✓] concluída | 2026-08-28 | `66fcbd8` |
| B5 | [Saídas da criança: trocar leitor, pote, ⚙ em T2/T6](onda-B-cru-ux/B5-saidas-da-crianca.md) | [✓] concluída | 2026-08-28 | `f60d04d` |
| B6 | [Cabeçalhos T2–T7, alvos ≥48, copy, T2 no celular](onda-B-cru-ux/B6-cabecalhos-e-copy-t2-t7.md) | [✓] concluída | 2026-08-28 | `9eea1eb` |
| B7 | [T4 palco: alvos, feedback, copy, beco](onda-B-cru-ux/B7-t4-palco.md) | [✓] concluída | 2026-08-28 | `5f77300` |
| B8 | [T5 portão acessível; T6 anuncia a celebração](onda-B-cru-ux/B8-t5-portao-e-t6-aria.md) ∥ | [✓] concluída | 2026-08-28 | `29d170b` |
| B9 | [T7 pote: barra 67%%, ~2, alvos, celebração](onda-B-cru-ux/B9-t7-pote.md) ∥ | [✓] concluída | 2026-09-01 | `ea396ff` |
| B-M2 | Merge da trilha navegação+mecânica em 28_08_26 (vai ao ar) | [✓] concluída | 2026-09-01 | `c2e6444` |
| B10 | [Admin: overlap da barra, rota /admin, allowlist](onda-B-cru-ux/B10-admin-shell-rota-assets.md) | [✓] concluída | 2026-09-01 | `1876668` |
| B11 | [Admin: controles, navegação, vocabulário, erros](onda-B-cru-ux/B11-admin-controles-e-copy.md) | [✓] concluída | 2026-09-01 | `240fab7` |
| B-M3 | Merge da trilha admin em 28_08_26 (vai ao ar) | [✓] concluída | 2026-09-01 | `3d1c4e2` |

## Onda C — Bundle do app: histórias, avatars, cuidador · 13/13 · branch `onda-C-bundle-app` · BUNDLE app (+ admin)

| Passo | Título | Status | Data | Commit |
|---|---|---|---|---|
| C0 | Criar branch onda-C-bundle-app a partir de 28_08_26 | [✓] concluída | 2026-09-01 | `8807e4f` |
| C1 | [Core de histórias: só completas, agrupar por dia](onda-C-bundle-app/C1-core-historias-filtro-e-agrupamento.md) | [✓] concluída | 2026-09-01 | `582a06a` |
| C2 | [Estante de histórias digna](onda-C-bundle-app/C2-estante-de-historias.md) | [✓] concluída | 2026-09-01 | `0d799da` |
| C3 | [Remover CartaoHistoria e exports mortos](onda-C-bundle-app/C3-cartao-historia-e-exports.md) | [✓] concluída | 2026-09-01 | `9bb3d6d` |
| C4 | [Canon.avatares: tabela única no core](onda-C-bundle-app/C4-canon-avatares.md) | [✓] concluída | 2026-09-01 | `845c7bf` |
| C5 | [Render por emoji nas 5 telas; cenas via bridge](onda-C-bundle-app/C5-render-emoji-e-cenas.md) | [✓] concluída | 2026-09-01 | `88979ce` |
| C6 | [Fluxo do cuidador: pós-PIN → hub; Usar este; menu](onda-C-bundle-app/C6-fluxo-cuidador-hub-e-usar-este.md) | [✓] concluída | 2026-09-01 | `32a7e3c` |
| C7 | [UI de cenários liberados na Regras](onda-C-bundle-app/C7-cenarios-liberados-ui.md) ∥ | [✓] concluída | 2026-09-01 | `cfdba65` |
| C8 | [T8 coerente; chips com escopo; T15 com nome](onda-C-bundle-app/C8-t8-coerente-e-chips-com-escopo.md) ∥ | [✓] concluída | 2026-09-01 | `8175280` |
| C9 | [Formulários honestos: disabled, form/Enter, labels](onda-C-bundle-app/C9-formularios-honestos.md) | [✓] concluída | 2026-09-01 | `0904744` |
| C10 | [Login: Google reconhecível, erro perto do gesto](onda-C-bundle-app/C10-login-polish.md) | [✓] concluída | 2026-09-01 | `72632f0` |
| C11 | [ARIA nas telas adultas](onda-C-bundle-app/C11-aria-telas-adultas.md) | [✓] concluída | 2026-09-01 | `8f5a3d0` |
| C12 | [Fechamento C: build:app + build:admin → e2e → merge](onda-C-bundle-app/C12-fechamento-onda-C.md) | [✓] concluída | 2026-09-02 | `e8827f5` |

## Onda D — Bundle app + admin: sync, faxina, CI · 6/10 · branch `onda-D-bundle-app-admin` · BUNDLE app + admin

| Passo | Título | Status | Data | Commit |
|---|---|---|---|---|
| D0 | Criar branch onda-D-bundle-app-admin a partir de 28_08_26 | [✓] concluída | 2026-09-02 | `a631701` |
| D7 | [e2e portáteis (sem caminhos da máquina)](onda-D-bundle-app-admin/D7-e2e-portateis.md) | [✓] concluída | 2026-09-03 | `7eb64b5` |
| D8 | [CI: typecheck → testes → build → bundle-check → e2e](onda-D-bundle-app-admin/D8-ci-workflow.md) | [✓] concluída | 2026-09-03 | `f9c3f2b` |
| D1 | [Leitura híbrida do espelho e desempate (D-07)](onda-D-bundle-app-admin/D1-leitura-hibrida-e-desempate.md) | [✓] concluída | 2026-09-03 | `3655179` |
| D2 | [Retry e sinal de falha no push (D-06)](onda-D-bundle-app-admin/D2-retry-e-telemetria-do-push.md) | [✓] concluída | 2026-09-03 | `7d15658` |
| D3 | [Chave legada (D-21) e ciclos type-only](onda-D-bundle-app-admin/D3-chave-legada-e-tipos.md) | [✓] concluída | 2026-09-03 | `2c2e9cc` |
| D4 | [Remoção segura de mortos](onda-D-bundle-app-admin/D4-remover-mortos.md) | [ ] pendente |  |  |
| D5 | [Ramo firebase, .agents/ e guia do código](onda-D-bundle-app-admin/D5-firebase-agents-e-guia.md) | [ ] pendente |  |  |
| D6 | [Branches, .gitignore, post-merge.sh](onda-D-bundle-app-admin/D6-branches-gitignore-hooks.md) | [ ] pendente |  |  |
| D9 | [Fechamento D: build:all → CI verde → merge](onda-D-bundle-app-admin/D9-fechamento-onda-D.md) | [ ] pendente |  |  |

## Onda E — Edge e dados · 0/8 · branch `onda-E-edge-dados` · BUNDLE app + EDGE + dados

| Passo | Título | Status | Data | Commit |
|---|---|---|---|---|
| E0 | Criar branch onda-E-edge-dados a partir de 28_08_26 | [ ] pendente |  |  |
| E1 | [Pacote v1.1: sentimento e sentido das fichas](onda-E-edge-dados/E1-pacote-v1-1-sentimentos.md) | [ ] pendente |  |  |
| E2 | [Paridade cliente↔edge (script + guardrails + gramática)](onda-E-edge-dados/E2-paridade-cliente-edge.md) | [ ] pendente |  |  |
| E3 | [Prompt na edge; aposentar proxy-ia; redeploy em 2 passos](onda-E-edge-dados/E3-prompt-na-edge-e-proxy-ia.md) | [ ] pendente |  |  |
| E4 | [Manifesto de cenários; id único; fetches derivados](onda-E-edge-dados/E4-manifesto-de-cenarios.md) | [ ] pendente |  |  |
| E5 | [Galeria da T3 honesta; retrato; SVG sem cópia](onda-E-edge-dados/E5-galeria-t3-honesta.md) | [ ] pendente |  |  |
| E6 | [Pipeline de autoria: lints no CI, guia, anexos](onda-E-edge-dados/E6-pipeline-de-autoria.md) | [ ] pendente |  |  |
| E7 | [Fechamento E: build:app → paridade → e2e → merge](onda-E-edge-dados/E7-fechamento-onda-E.md) | [ ] pendente |  |  |

## Onda F — Encerramento · 0/4 · branch `28_08_26` · —

| Passo | Título | Status | Data | Commit |
|---|---|---|---|---|
| F1 | Régua final: tsc, unit, e2e, CI verde | [ ] pendente |  |  |
| F2 | Catálogo da varredura com todos os IDs marcados resolvidos | [ ] pendente |  |  |
| F3 | STATUS.md a 100% | [ ] pendente |  |  |
| F4 | Push (somente com ordem do dono) | [ ] pendente |  |  |
