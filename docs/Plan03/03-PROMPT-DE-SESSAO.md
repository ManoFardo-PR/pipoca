# Prompt de sessão — executar o Plan03

Cole o bloco abaixo numa sessão nova (Claude Code, na pasta do repo). Ele é autocontido:
aponta os arquivos, o monitor e as regras; o resto o agente lê do repo.

---

```
Você vai executar o Plan03 do repositório Pipoca (app de leitura guiada para crianças, pt-BR).
Responda em português. Trabalhe passo a passo, um passo por vez, conforme o monitor indicar.

## Contexto (leia antes de qualquer coisa, nesta ordem)
1. docs/Plan03/00-README.md — o que é o plano, unidades de deploy (CRU / BUNDLE / EDGE / SQL) e regras do jogo.
2. docs/Plan03/02-EXECUCAO-PASSO-A-PASSO.md — a sequência linear dos 59 passos (P1..P3, ondas A→B→C→D→E, F1..F4) e o ritual de sessão.
3. docs/Plan03/01-PLANO-DE-EXECUCAO.md — folha de decisões (JÁ CONFIRMADAS pelo dono; tratar como definitivas), gates, git/deploy/rollback, riscos.
4. docs/Plan03/STATUS.md — painel gerado (não editar à mão).
5. docs/auditorias/varredura-2026-08-26.md — catálogo da auditoria que originou tudo (consulte só quando um .md de subtarefa citar um ID PS-/DM-/UI-/ML-).
Cada subtarefa é um .md autocontido em docs/Plan03/onda-*/ (objetivo, evidência arquivo:linha, passos, critérios de aceite, verificação, riscos, decisões com default). As linhas citadas valem para o commit e0bdcd2 — use nomes de função/texto como âncora se tiverem deslocado.

## O monitor (fonte de verdade do progresso — nunca confie na memória)
- node scripts/plan03.mjs status      → onde estamos, próximo passo, alertas (regenera STATUS.md)
- node scripts/plan03.mjs proximo     → só o próximo passo e o caminho do .md
- node scripts/plan03.mjs iniciar <ID>          → marca em andamento (recusa se dependência pendente ou branch errada)
- node scripts/plan03.mjs concluir <ID> --commit → marca concluída com data+hash e commita o status (exige o trabalho já commitado)
- node scripts/plan03.mjs verificar [--e2e]     → tsc + npm test (+ os 4 e2e); grava em docs/Plan03/status.json
- node scripts/plan03.mjs gate <A|B|C|D|E>      → checks automáticos da definição de pronto da onda
- node scripts/plan03.mjs relatorio / bloquear <ID> "motivo" / reabrir <ID>
Grafo dos passos: docs/Plan03/plan03.graph.json.

## Ritual desta sessão
1. git rev-parse --abbrev-ref HEAD (confira e cite a branch no output; há sessões/worktrees paralelos disputando o HEAD deste diretório).
2. node scripts/plan03.mjs status. Se houver alertas, resolva-os ANTES de qualquer passo (árvore suja → commite ou explique; branch errada → git checkout <branch>; decisão sem carimbo → me pergunte).
3. iniciar <ID do próximo>. Abra o .md do passo. Leia os arquivos citados ANTES de editar. Execute os passos. Rode a verificação do .md.
4. Commite o trabalho do passo (mensagem feat|fix|chore(escopo): ... em pt-BR, sem acentos no assunto, com Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>). Bundle (bun run build:app / build:admin) SÓ nos passos de fechamento (A5, C12, D9, E7) e no MESMO commit da fonte.
5. concluir <ID> --commit. Repita do passo 3 enquanto houver tempo e o próximo passo não exigir minha autorização.
6. Encerre com node scripts/plan03.mjs relatorio e um resumo de 5 linhas: o que fez, o que verificou (números), o que ficou pendente, próximo passo, o que precisa de mim.

## Regras inegociáveis
- Nunca git reset --hard, checkout destrutivo, branch -D ou push. Refs explícitas sempre. Commit = git checkout <branch> && git add ... && git commit encadeados.
- Supabase: MCP somente leitura por padrão. apply_migration (A5), deploy_edge_function (A5, E3), remoção de função (E3) e deleção de branches remotas (D6) SÓ depois de eu dizer "pode" — pare e peça.
- Régua antes de qualquer merge: bun x tsc --noEmit limpo · npm test 143 · os 4 e2e (node tests/e2e/run-reordenar-miolo.mjs 28, run-linha-verde-canonico.mjs 80, run-admin.mjs 25, run-geracao2-canonico.mjs 42). Se um número cair, pare e mostre a saída.
- Merge em 28_08_26 é deploy (Replit serve o repo): só nos passos de merge/fechamento, com a régua verde e, na Onda B, screenshots antes/depois conferidos.
- Findings sem implementação já foram feitos; agora é execução. Não reabra o que o catálogo marca como resolvido. Não amplie o escopo de um passo — se descobrir algo novo, anote em docs/Plan03/ACHADOS-NOVOS.md e siga.
- Decisões do dono: use o default confirmado na folha do 01. Se um .md pedir decisão que não está na folha, pergunte antes de agir.
- Reporte com honestidade: teste que falhou é falha; passo pulado é pulado.

## Estado esperado ao começar
Branch 28_08_26 @ 6094033 (ou posterior), 0/59 concluídos, próximo = P1, alertas conhecidos: pipoca.admin.bundle.js desatualizado (resolve na Onda D) e as decisões B1/B2 sem carimbo (se ainda estiverem, use o default: classes; gradiente escurecido).

Comece agora: passo 1 do ritual.
```
