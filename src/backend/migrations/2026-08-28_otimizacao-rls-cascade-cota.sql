-- Migração: otimização pós-auditoria (permanência no SQL/Supabase)
-- Versão aplicada: 20260828_otimizacao_rls_cascade_cota
-- Aplicada via MCP apply_migration em 2026-08-28. NÃO colar à mão no dashboard.
--
-- Contexto: decidiu-se ficar no Postgres/Supabase (não migrar p/ Firestore).
-- Esta migração fecha 3 achados da auditoria SEM mudar comportamento observável:
--   1) RLS init-plan  — auth.uid()/auth.jwt() reavaliados por linha (perf a escala)
--   2) Cascade LGPD   — historias/telemetria não caíam junto com o perfil (D-18)
--   3) Cota atômica   — uso_ia era read-then-write, burlável por paralelismo (D-13)
--
-- Pré-condição verificada antes de aplicar: 0 historias/telemetria/saves órfãos.

begin;

-- 1) RLS init-plan: envolver auth.*() em (select ...) — mesmo resultado, 1 avaliação por query.
alter policy perfis_dono      on perfis      using (dono = (select auth.uid())) with check (dono = (select auth.uid()));
alter policy saves_dono       on saves       using (dono = (select auth.uid())) with check (dono = (select auth.uid()));
alter policy historias_dono   on historias   using (dono = (select auth.uid())) with check (dono = (select auth.uid()));
alter policy telemetria_dono  on telemetria  using (dono = (select auth.uid())) with check (dono = (select auth.uid()));
alter policy operadores_self  on operadores  using (uid = (select auth.uid()));
alter policy contas_tenant_self on contas_tenant using (lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', '')));

-- 2) Cascade de deleção (LGPD): historias e telemetria seguem o perfil.
--    Completa a cadeia auth.users -> perfis (já cascade) -> historias/telemetria.
alter table historias
  add constraint historias_perfil_id_fkey
  foreign key (perfil_id) references perfis(id) on delete cascade;
alter table telemetria
  add constraint telemetria_perfil_id_fkey
  foreign key (perfil_id) references perfis(id) on delete cascade;

-- 3) Cota atômica: um único upsert incremental, sem corrida e sem fail-open.
--    A edge (service_role) chama via RPC em vez de ler-somar-gravar.
create or replace function registrar_uso_ia(p_tenant text, p_mes text, p_custo numeric default 0)
returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into uso_ia (tenant_id, mes, chamadas, custo)
  values (p_tenant, p_mes, 1, coalesce(p_custo, 0))
  on conflict (tenant_id, mes)
  do update set chamadas = uso_ia.chamadas + 1,
                custo    = uso_ia.custo + coalesce(excluded.custo, 0);
$$;
revoke execute on function registrar_uso_ia(text, text, numeric) from public;
grant  execute on function registrar_uso_ia(text, text, numeric) to service_role;

commit;
