# Execução passo a passo — Plan03 (sequência linear, 59 passos)

A sequência **é as ondas, na ordem A → B → C → D → E**, precedidas de 3 passos de preparação
e seguidas de 4 de encerramento. Um passo só começa quando os que ele depende estão
`concluída`. Passos marcados **∥** podem rodar ao mesmo tempo que o anterior (não tocam os
mesmos arquivos). O monitor (`scripts/plan03.mjs`) lê este mesmo grafo
(`plan03.graph.json`) e diz o próximo passo — **não confie na memória, rode `status`.**

Formato de cada passo: **ID** · o que fazer · pré-condições · verificação · evidência a
registrar · marcação.

Convenções: `status` = `node scripts/plan03.mjs status`; "4 e2e" = `run-reordenar-miolo`,
`run-linha-verde-canonico`, `run-admin`, `run-geracao2-canonico`; "régua" = tsc limpo,
143 unit, 175 e2e (28/80/25/42). Marcação ao terminar: `node scripts/plan03.mjs concluir <ID> --commit`.

---

## Preparação (branch `28_08_26`)

**P1** · Conferir ambiente e registrar a régua. Pré: nada. Fazer: `git rev-parse --abbrev-ref HEAD`
(= `28_08_26`), `git worktree list`, `bun --version`, `node --version`;
`node scripts/plan03.mjs verificar --e2e`. Verificação: verificação VERDE (tsc, 143, 175).
Evidência: `status.json.verificacao`. Marcar: `concluir P1`.

**P2** · Screenshots "antes". Pré: P1. Fazer: harness de `onda-B-cru-ux/00-onda-B.md` salvando em
`docs/auditorias/screenshots/antes/` (1280×800 e 390×844; família + admin). Verificação: ≥30 PNGs.
Evidência: pasta commitada (ou listada no PR se for grande demais — decisão: commitar só os
6 essenciais: T2, T3, T4, T5, T7 e adm2). Marcar: `concluir P2`.

**P3** · Painel inicial. Pré: P2. Fazer: `node scripts/plan03.mjs status`. Verificação: próximo = A0;
alertas esperados: admin bundle desatualizado (PS-05), decisões sem carimbo (se houver).
Marcar: `concluir P3`.

## Onda A — segurança e consentimento (branch `onda-A-seguranca`; deploy: bundle app + 2 edges + SQL)

**A0** · Criar a branch. Pré: P3, branch atual `28_08_26`, árvore limpa. Fazer:
`git switch -c onda-A-seguranca 28_08_26`. Verificação: `git branch --show-current`. Marcar: `concluir A0`.

**A1** · `A1-gate-consentimento-cliente.md`. Pré: A0. Verificação: teste novo "IA desligada ⇒
realizador não chamado" + `run-geracao2` + `run-admin`. Evidência: commit. Marcar.

**A3 ∥** · `A3-migracao-rpc-indices-politicas.md` — escrever a migração e **não aplicar**. Pré: A0.
Verificação: SELECTs de leitura do passo 1 do `.md` feitos; arquivo `.sql` commitado. Marcar.

**A2** · `A2-toggle-ia-honesto.md`. Pré: A1. Verificação: `run-admin`, `run-linha-verde`; screenshot
da Regras nos 3 estados. Marcar.

**A4** · `A4-edges-rpc-e-modelo-padrao.md`. Pré: A3, A2. Verificação: greps do `.md`; `admin.test`.
Nada deployado ainda. Marcar.

**A5** · `A5-fechamento-onda-A.md`. Pré: A4. Fazer, nesta ordem: aplicar a migração (MCP
`apply_migration`, com seu "pode") → redeploy `realizador` e `proxy-ia` → `bun run build:app`
(+ `build:admin` se A4 tocou `src/admin`) → 4 e2e → commit fonte+bundle → merge em `28_08_26`
→ catálogo. Verificação: `node scripts/plan03.mjs gate A` sem check automático pendente;
manuais: advisors sem `anon`, `proacl` sem `anon`, edges com versão nova. Marcar.

## Onda B — UX crua (branch `onda-B-cru-ux`; deploy: commit = ao vivo ao mergear)

**B0** · Criar a branch a partir de `28_08_26` (já com A mergeada). Pré: A5. Marcar.

**B1** · `B1-mecanismo-a11y-classe-atributo.md`. Pré: B0. Verificação: `run-linha-verde`;
screenshots com contraste ligado. Marcar.

**B2** · `B2-paleta-com-contraste-e-tipografia.md`. Pré: B1. Verificação: cálculo WCAG dos pares;
`run-linha-verde`. Marcar.

**B3** · `B3-foco-visivel-e-movimento.md`. Pré: B2. Verificação: Tab visível em T2–T7 e admin;
`run-linha-verde`, `run-admin`. Marcar.

**B4** · `B4-painel-a11y.md`. Pré: B3. Verificação: leitor de tela anuncia switches; alvos ≥48;
`run-linha-verde`. Marcar.

**B-M1** · Merge da trilha tokens/a11y. Pré: B4. Fazer: 4 e2e verdes na branch → screenshots
antes/depois conferidos → `git checkout 28_08_26 && git merge --no-ff onda-B-cru-ux` → conferir
branch → `git checkout onda-B-cru-ux`. **Vai ao ar.** Marcar.

**B5** · `B5-saidas-da-crianca.md`. Pré: B-M1. Verificação: `run-linha-verde` (+ asserts novos),
`run-geracao2` (PedirGenero). Marcar.

**B6** · `B6-cabecalhos-e-copy-t2-t7.md`. Pré: B5. Verificação: sonda de alvos; screenshot T2 a 390;
`run-linha-verde`, `run-reordenar`. Marcar.

**B7** · `B7-t4-palco.md`. Pré: B6. Verificação: `run-reordenar` (28) — ajustar assert do selo. Marcar.

**B8 ∥** · `B8-t5-portao-e-t6-aria.md`. Pré: B6. Verificação: teclado na T5; `run-linha-verde`. Marcar.

**B9 ∥** · `B9-t7-pote.md`. Pré: B6. Verificação: barra com 2 fatias; `run-linha-verde`. Marcar.

**B-M2** · Merge da trilha navegação+mecânica. Pré: B7, B8, B9. Mesmo ritual de B-M1. Marcar.

**B10** · `B10-admin-shell-rota-assets.md`. Pré: B-M2. Verificação: screenshots adm2–adm7;
`curl -I /admin`; `run-admin`. Marcar.

**B11** · `B11-admin-controles-e-copy.md`. Pré: B10. Verificação: `run-admin` (ajustar o clique do
kill-switch). Marcar.

**B-M3** · Merge da trilha admin. Pré: B11. Mesmo ritual. Depois: `node scripts/plan03.mjs gate B`.
Marcar.

## Onda C — bundle do app (branch `onda-C-bundle-app`)

**C0** · Criar a branch. Pré: B-M3. Marcar.

**C1** · `C1-core-historias-filtro-e-agrupamento.md`. Pré: C0. Verificação: `npm test`. Marcar.

**C2** · `C2-estante-de-historias.md`. Pré: C1. Verificação: `run-linha-verde` (histórias salvas);
screenshots T3 com 0/1/5 histórias. Marcar.

**C3** · `C3-cartao-historia-e-exports.md`. Pré: C2. Verificação: tsc + `npm test`. Marcar.

**C4** · `C4-canon-avatares.md`. Pré: C3. Verificação: tsc + `npm test`. Marcar.

**C5** · `C5-render-emoji-e-cenas.md`. Pré: C4. Verificação: `run-linha-verde`, `run-geracao2`;
screenshot T2; **foto no tablet real**. Marcar.

**C6** · `C6-fluxo-cuidador-hub-e-usar-este.md`. Pré: C5. Verificação: `run-linha-verde` (ajustar
assert pós-PIN → 11). Marcar.

**C7 ∥** · `C7-cenarios-liberados-ui.md`. Pré: C5. Verificação: alternar na Regras reflete na T3. Marcar.

**C8 ∥** · `C8-t8-coerente-e-chips-com-escopo.md`. Pré: C5. Verificação: screenshots T8/T13–T15. Marcar.

**C9** · `C9-formularios-honestos.md`. Pré: C6, C7, C8. Verificação: Enter submete nas 7 telas;
botão apagado não dispara; `run-linha-verde`, `run-admin`. Marcar.

**C10** · `C10-login-polish.md`. Pré: C9. Verificação: screenshot T9; `run-linha-verde`. Marcar.

**C11** · `C11-aria-telas-adultas.md`. Pré: C10. Verificação: leitor de tela no hub/T8. Marcar.

**C12** · `C12-fechamento-onda-C.md`. Pré: C11. Fazer: `build:app` **e** `build:admin` → 4 e2e →
commit fonte+bundles → merge → catálogo. Verificação: `gate C`. Marcar.

## Onda D — bundle app + admin (branch `onda-D-bundle-app-admin`; pipeline primeiro)

**D0** · Criar a branch. Pré: C12. Marcar.

**D7** · `D7-e2e-portateis.md`. Pré: D0. Verificação: 4 e2e sem `C:/Users` nos runners. Marcar.

**D8** · `D8-ci-workflow.md`. Pré: D7. Verificação: workflow verde no push da branch; `check:bundles`
falha de propósito uma vez. Marcar.

**D1** · `D1-leitura-hibrida-e-desempate.md`. Pré: D8. Verificação: teste "2 aparelhos"; smoke com 2
navegadores. Marcar.

**D2** · `D2-retry-e-telemetria-do-push.md`. Pré: D1. Verificação: teste de retry/fila. Marcar.

**D3** · `D3-chave-legada-e-tipos.md`. Pré: D2. Verificação: `grep pipoca.perfis.v1 src/` → só migração. Marcar.

**D4** · `D4-remover-mortos.md`. Pré: D3 (E2/E3 já decididas: sim). Verificação: tsc, `npm test`
(cadeia sem `ia.test.ts`), 4 e2e. Marcar.

**D5** · `D5-firebase-agents-e-guia.md`. Pré: D4. Verificação: `grep -i firebase src/` → 0; guia sem
`experimentos/`. Marcar.

**D6** · `D6-branches-gitignore-hooks.md`. Pré: D5; **lista de remotas aprovada por você**.
Verificação: `git branch --merged 28_08_26` só atual/main/worktree. Marcar.

**D9** · `D9-fechamento-onda-D.md`. Pré: D6. Fazer: `build:all` → CI verde → merge → catálogo.
Verificação: `gate D`. Marcar.

## Onda E — edge e dados (branch `onda-E-edge-dados`)

**E0** · Criar a branch. Pré: D9. Marcar.

**E1** · `E1-pacote-v1-1-sentimentos.md`. Pré: E0. Verificação: goldens regenerados; `npm test`;
`run-geracao2`. Marcar.

**E2** · `E2-paridade-cliente-edge.md`. Pré: E1. Verificação: `npm run check:paridade` verde e falha
com divergência proposital. Marcar.

**E3** · `E3-prompt-na-edge-e-proxy-ia.md`. Pré: E2. Fazer: deploy da edge aceitando ambos → cliente
só pacote → segundo deploy rejeitando `prompt`; remover `proxy-ia` (com seu "pode"). Verificação:
corpo do POST = `{pacote, tenantId?}`; `list_edge_functions`. Marcar.

**E4** · `E4-manifesto-de-cenarios.md`. Pré: E3. Verificação: fixture de 2º cenário aparece por
manifesto; `run-linha-verde` (cenarioV2). Marcar.

**E5** · `E5-galeria-t3-honesta.md`. Pré: E4. Verificação: screenshots T3 1280/390; "Em breve"
com feedback. Marcar.

**E6** · `E6-pipeline-de-autoria.md`. Pré: E5. Verificação: `npm run lint:conteudo`; guia testado.
Marcar.

**E7** · `E7-fechamento-onda-E.md`. Pré: E6. Fazer: `build:app` → paridade → 4 e2e → commit → merge
→ catálogo. Verificação: `gate E`. Marcar.

## Encerramento (branch `28_08_26`)

**F1** · Régua final: `node scripts/plan03.mjs verificar --e2e` VERDE; CI verde. Marcar.

**F2** · Catálogo `docs/auditorias/varredura-2026-08-26.md` com todos os IDs marcados resolvidos
(ou explicitamente adiados, com motivo). Marcar.

**F3** · `node scripts/plan03.mjs status` → 59/59; `STATUS.md` commitado. Marcar.

**F4** · Push — **somente com ordem sua**. Marcar.

---

## Ritual de sessão (o que o monitor impõe)

1. `node scripts/plan03.mjs status` — ler próximo passo e alertas; resolver alertas antes de tudo.
2. `node scripts/plan03.mjs iniciar <ID>` — recusa se dependência pendente ou branch errada.
3. Abrir o `.md` do passo; executar; rodar a verificação do `.md`.
4. Commitar o trabalho do passo (fonte; bundle só nos fechamentos).
5. `node scripts/plan03.mjs concluir <ID> --commit` — grava data+hash no `.md`, regenera
   `STATUS.md` e commita o status. Exige árvore limpa (fora de `docs/Plan03`).
6. Ao fechar uma onda: `node scripts/plan03.mjs gate <onda>` e `verificar --e2e`.
7. Para reportar: `node scripts/plan03.mjs relatorio`.
