# Achados novos durante a execução do Plan03

Coisas descobertas no meio de um passo que **não** fazem parte do escopo dele. Anotar aqui e
seguir; quem fechar a onda decide se viram subtarefa, follow-up ou nada.

Formato: data · passo em que apareceu · o que é · onde · o que fazer · situação.

| Data | Passo | Achado | Onde | Ação sugerida | Situação |
|---|---|---|---|---|---|
| 2026-08-28 | P1 | `verificar` gravava `itens.<nome>.ok = null` para tsc (sem contagem) e a contagem no lugar do booleano nos demais — o `resumo` mostrava `tsc:✗` com tsc limpo. Spread de `contarChecks` sobrescrevia `ok`. | `scripts/plan03.mjs` (`verificar`) | Corrigido no próprio P1: `{ ok, passou, falhou }`. | resolvido (P1) |
| 2026-08-28 | P1 | `run-admin.mjs` flaky: 24/25 numa rodada do `verificar --e2e` (logo após `linha-verde`), 25/25 em 5 rodadas isoladas e na 1ª rodada do `verificar`. Check não identificado porque o monitor engolia a saída. | `tests/e2e/run-admin.mjs` | Monitor agora imprime as linhas de falha (feito no P1). Se repetir, capturar o check e tratar em D7 (harness e2e compartilhado). | aberto — observar |
