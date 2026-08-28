# Achados novos durante a execução do Plan03

Coisas descobertas no meio de um passo que **não** fazem parte do escopo dele. Anotar aqui e
seguir; quem fechar a onda decide se viram subtarefa, follow-up ou nada.

Formato: data · passo em que apareceu · o que é · onde · o que fazer · situação.

| Data | Passo | Achado | Onde | Ação sugerida | Situação |
|---|---|---|---|---|---|
| 2026-08-28 | P1 | `verificar` gravava `itens.<nome>.ok = null` para tsc (sem contagem) e a contagem no lugar do booleano nos demais — o `resumo` mostrava `tsc:✗` com tsc limpo. Spread de `contarChecks` sobrescrevia `ok`. | `scripts/plan03.mjs` (`verificar`) | Corrigido no próprio P1: `{ ok, passou, falhou }`. | resolvido (P1) |
| 2026-08-28 | P1 | `run-admin.mjs` flaky: 24/25 numa rodada do `verificar --e2e` (logo após `linha-verde`), 25/25 em 5 rodadas isoladas e na 1ª rodada do `verificar`. Check não identificado porque o monitor engolia a saída. | `tests/e2e/run-admin.mjs` | Monitor agora imprime as linhas de falha (feito no P1). Se repetir, capturar o check e tratar em D7 (harness e2e compartilhado). | aberto — observar |
| 2026-08-28 | A3 | Advisor security também aponta `tenant_da_sessao()` executável por `authenticated` (SECURITY DEFINER). `rls_supabase.sql:245` só revogou `public, anon`; a função é chamada apenas pelo trigger `fixar_tenant_perfil` (SECURITY DEFINER, roda como dono) — `authenticated` provavelmente não precisa. `eh_operador()` e `tenant_vinculado_a_mim()` PRECISAM (políticas RLS). | Supabase `bamlljvllcxdnsheatqv` | Confirmar com um SELECT como authenticated após A5 e, se ninguém quebrar, `revoke execute ... from authenticated` numa migração pequena (follow-up, fora do escopo de A3). | aberto |
| 2026-08-28 | A3 | `src/backend/adaptadores/rls_supabase.sql` é "espelho" mas está defasado desde `20260826155239` (políticas ainda na forma `auth.uid()` sem init-plan, sem FKs de cascade, sem `registrar_uso_ia`) — e ficará mais após A5 (políticas fundidas). | `src/backend/adaptadores/rls_supabase.sql` | Decidir em D ou E: virar dump gerado (`pg_dump --schema-only`) ou nota no topo apontando `migrations/` como fonte de verdade. | aberto |
