-- Migração: pós-varredura 2026-08-26 — fechar a RPC, índices das FKs, políticas (Plan03 · A3)
-- Versão aplicada: (PENDENTE — aplicar em A5 via MCP apply_migration com o nome
--   pos_varredura_rpc_indices_politicas; se a data de aplicação não for 2026-08-28,
--   renomear este arquivo para a data real). NÃO colar à mão no dashboard.
--
-- Estado lido (só-leitura, 2026-08-28) antes de escrever:
--   proacl registrar_uso_ia(text,text,numeric) =
--     {postgres=X, anon=X, authenticated=X, service_role=X}  ← anon/authenticated sobraram
--   pg_default_acl (postgres, public, functions) = anon=X, authenticated=X, service_role=X
--     ← é por isso que `revoke ... from public` (20260826155239) não removeu anon/authenticated
--   índices em historias/telemetria: só (dono, perfil_id) e as pkeys — FKs perfil_id sem índice
--   políticas (todas PERMISSIVE, todas leitura pura):
--     contas_tenant_operador  ALL    {public}        eh_operador()
--     contas_tenant_self      SELECT {authenticated} lower(email) = lower(jwt->>'email')
--     flags_admin_leitura     SELECT {authenticated} true
--     flags_admin_operador    ALL    {public}        eh_operador()
--     tenants_familia_leitura SELECT {authenticated} tenant_vinculado_a_mim(id)
--     tenants_operador        ALL    {public}        eh_operador()
--
-- Fecha 3 achados dos advisors SEM mudar o comportamento observável do app/admin:
--   1) security WARN  anon/authenticated executam registrar_uso_ia (SECURITY DEFINER) via
--      /rest/v1/rpc → qualquer portador da anon key infla uso_ia de qualquer tenant e a
--      edge nega a família com 403 cota_excedida o mês inteiro.
--   2) performance INFO  FKs historias_perfil_id_fkey / telemetria_perfil_id_fkey sem índice.
--   3) performance WARN  múltiplas políticas permissivas para authenticated/SELECT em
--      contas_tenant, flags_admin, tenants.
-- Decisões do dono (folha do 01, confirmadas): fundir políticas (qual é leitura pura em
-- todas) · MANTER historias_dono_perfil_idx (reavaliar após D1).
-- Fora do SQL (A5, painel): Authentication → Password → Leaked password protection = ON.
--
-- Rollback: grant execute on function public.registrar_uso_ia(text,text,numeric) to anon,
-- authenticated; alter default privileges ... grant execute on functions to anon, authenticated;
-- drop index historias_perfil_id_idx, telemetria_perfil_id_idx; recriar as 6 políticas
-- originais (definições acima / src/backend/adaptadores/rls_supabase.sql:161-187).

begin;

-- ── 1) RPC de cota: só service_role (a edge `realizador` chama com a service key) ────────
revoke execute on function public.registrar_uso_ia(text, text, numeric) from public, anon, authenticated;
grant  execute on function public.registrar_uso_ia(text, text, numeric) to service_role;

-- Fecha a classe inteira para funções FUTURAS criadas por `postgres` em public: deixam de
-- nascer executáveis por anon/authenticated. CUIDADO (E-wave e além): toda função nova
-- usada dentro de política RLS ou chamada pelo cliente precisa de
--   grant execute on function public.<fn>(...) to authenticated;
-- explícito — como já fazem eh_operador(), tenant_vinculado_a_mim() e tenant_da_sessao()
-- (mantidas com authenticated=X porque as políticas/triggers as chamam).
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- ── 2) Índices cobridores das FKs de cascade (LGPD, 20260826155239) ──────────────────────
-- A leitura real filtra por perfil_id (repo_supabase.ts:179-190); o cascade em perfis
-- também varre por perfil_id.
create index if not exists historias_perfil_id_idx  on public.historias(perfil_id);
create index if not exists telemetria_perfil_id_idx on public.telemetria(perfil_id);
-- historias_dono_perfil_idx: MANTIDO (decisão A3); reavaliar após D1 com dados de uso.

-- ── 3) Uma política permissiva por (role, ação): SELECT fundido com OR; escrita por comando ─
-- Semântica preservada: o operador continua podendo tudo; a família/autenticado continua
-- lendo só o que lia. anon nunca teve linha nenhuma (eh_operador() nem é executável por
-- anon) — as políticas novas são `to authenticated`, o que só torna isso explícito.
-- service_role ignora RLS (as edges seguem intactas).

-- contas_tenant ────────────────────────────────────────────────────────────────────────────
drop policy if exists contas_tenant_operador on public.contas_tenant;
drop policy if exists contas_tenant_self     on public.contas_tenant;
create policy contas_tenant_select on public.contas_tenant for select to authenticated
  using (eh_operador() or lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', '')));
create policy contas_tenant_insert on public.contas_tenant for insert to authenticated
  with check (eh_operador());
create policy contas_tenant_update on public.contas_tenant for update to authenticated
  using (eh_operador()) with check (eh_operador());
create policy contas_tenant_delete on public.contas_tenant for delete to authenticated
  using (eh_operador());

-- flags_admin ──────────────────────────────────────────────────────────────────────────────
-- Leitura para QUALQUER autenticado (a família puxa o kill-switch no boot — nunca anon).
drop policy if exists flags_admin_leitura  on public.flags_admin;
drop policy if exists flags_admin_operador on public.flags_admin;
create policy flags_admin_select on public.flags_admin for select to authenticated
  using (true);
create policy flags_admin_insert on public.flags_admin for insert to authenticated
  with check (eh_operador());
create policy flags_admin_update on public.flags_admin for update to authenticated
  using (eh_operador()) with check (eh_operador());
create policy flags_admin_delete on public.flags_admin for delete to authenticated
  using (eh_operador());

-- tenants ──────────────────────────────────────────────────────────────────────────────────
drop policy if exists tenants_familia_leitura on public.tenants;
drop policy if exists tenants_operador        on public.tenants;
create policy tenants_select on public.tenants for select to authenticated
  using (eh_operador() or tenant_vinculado_a_mim(id));
create policy tenants_insert on public.tenants for insert to authenticated
  with check (eh_operador());
create policy tenants_update on public.tenants for update to authenticated
  using (eh_operador()) with check (eh_operador());
create policy tenants_delete on public.tenants for delete to authenticated
  using (eh_operador());

commit;

-- ── Verificação pós-aplicação (A5) ───────────────────────────────────────────────────────
-- select proacl::text from pg_proc where proname = 'registrar_uso_ia';
--   → sem anon e sem authenticated
-- select tablename, policyname, cmd, roles from pg_policies
--   where tablename in ('contas_tenant','flags_admin','tenants') order by 1,2;
--   → 4 políticas por tabela, uma SELECT cada
-- get_advisors security: sem anon_security_definer_function_executable;
-- get_advisors performance: sem unindexed_foreign_keys em historias/telemetria,
--   sem multiple_permissive_policies nas 3 tabelas.
-- curl -X POST <url>/rest/v1/rpc/registrar_uso_ia -H "apikey: <anon>" → 401/403/42501.
-- e2e: node tests/e2e/run-admin.mjs · node tests/e2e/run-linha-verde-canonico.mjs.
