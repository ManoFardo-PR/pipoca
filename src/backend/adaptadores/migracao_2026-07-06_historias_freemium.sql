-- Pipoca — MIGRAÇÃO PENDENTE (2026-07-06): historias + Freemium
-- ---------------------------------------------------------------
-- COMO APLICAR: cole este arquivo INTEIRO no SQL editor do dashboard
-- (https://supabase.com/dashboard/project/bamlljvllcxdnsheatqv/sql/new) e Run.
-- É IDEMPOTENTE: seguro de rodar mais de uma vez.
--
-- Por que este arquivo existe: o schema da fase06 (perfis/saves/telemetria/
-- operadores/tenants/config_ia/uso_ia + RLS + eh_operador + trigger
-- teto_perfis) JÁ está aplicado no projeto real e NÃO é repetido aqui.
-- Este arquivo traz só o que veio DEPOIS (PRs #9 e #11) e ainda não foi
-- aplicado. O espelho completo do schema segue em rls_supabase.sql.
--
-- Blocos:
--   1. tabela `historias` (+ índice + RLS) — espelho remoto das histórias
--      salvas (retenção de 20 dias no cliente; favoritas para sempre).
--   2. `verificar_teto_perfis` CONSERTADO — a versão da fase06 lia
--      dados.tenant.limites.perfis (shape que nunca foi escrito: teto
--      inerte); esta resolve por planoId + validade do Freemium e é
--      fail-closed (teto 1 para tenant sem linha). O trigger `teto_perfis`
--      em `perfis` já existe — só a função é substituída.
--   3. `provisionar_tenant_familia` + trigger em auth.users — TODO cadastro
--      ganha a linha `familia:<uid>` no Freemium (60 dias de Família grátis).
--   4. backfill — contas existentes ganham os 60 dias a partir de agora.

-- ── 1 · histórias salvas ─────────────────────────────────────────────────────
-- favorita/criada_em são COLUNAS além do envelope: a retenção é um DELETE
-- por filtro disparado pelo cliente (sem pg_cron, sem tombstones por item).
create table if not exists historias (
  id            text primary key,            -- uuid gerado no cliente
  perfil_id     text not null,
  dono          uuid not null default auth.uid(),
  favorita      boolean not null default false,
  criada_em     timestamptz not null,        -- fiel ao criadaEm do cliente
  dados         jsonb not null,              -- envelope pipoca.historias.v1
  atualizado_em timestamptz not null default now()
);

create index if not exists historias_dono_perfil_idx on historias(dono, perfil_id);

alter table historias enable row level security;

drop policy if exists historias_dono on historias;
create policy historias_dono on historias for all
  using (dono = auth.uid()) with check (dono = auth.uid());

-- ── 2 · teto de perfis CONSERTADO (substitui a função da fase06) ─────────────
-- Freemium vale 60 dias a partir do criadoEm; vencido, degrada ao teto do
-- Grátis. Tenant SEM linha em `tenants` é fail-closed (teto 1) — o
-- provisionamento no signup (bloco 3) garante a linha de toda família.
create or replace function verificar_teto_perfis() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  t_plano text;
  t_criado bigint;
  vencido boolean;
  teto int;
  atuais int;
begin
  if new.tenant_id is null then return new; end if;
  select dados->'tenant'->>'planoId',
         coalesce((dados->'tenant'->>'criadoEm')::bigint, 0)
    into t_plano, t_criado
    from tenants where id = new.tenant_id;
  if t_plano is null then
    teto := 1; -- sem linha de tenant: fail-closed no teto do Grátis
  else
    vencido := (t_plano = 'freemium')
      and ((extract(epoch from now()) * 1000)::bigint > t_criado + 60::bigint * 86400000);
    teto := case
      when t_plano = 'escola' then 40
      when t_plano = 'familia' then 4
      when t_plano = 'freemium' and not vencido then 4
      else 1 -- gratis, freemium vencido, plano desconhecido
    end;
  end if;
  select count(*) into atuais from perfis where tenant_id = new.tenant_id and id <> new.id;
  if atuais + 1 > teto then
    raise exception 'teto de perfis do plano atingido para o tenant %', new.tenant_id;
  end if;
  return new;
end $$;
-- (o trigger `teto_perfis before insert on perfis` já existe da fase06 e
--  passa a usar esta função automaticamente — não recriar.)

-- ── 3 · Freemium: TODO cadastro entra no plano ───────────────────────────────
-- EXCEPTION engolida: o signup NUNCA morre por causa do tenant.
create or replace function provisionar_tenant_familia() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into tenants (id, dados)
  values (
    'familia:' || new.id,
    jsonb_build_object(
      'esquema', 'pipoca.tenant.v1',
      'tenant', jsonb_build_object(
        'id', 'familia:' || new.id,
        'nome', 'Família',
        'planoId', 'freemium',
        'ativo', true,
        'criadoEm', (extract(epoch from now()) * 1000)::bigint
      )
    )
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  return new; -- fail-soft: cadastro sempre passa
end $$;
revoke execute on function provisionar_tenant_familia() from public, anon, authenticated;

drop trigger if exists provisionar_tenant_apos_signup on auth.users;
create trigger provisionar_tenant_apos_signup
  after insert on auth.users
  for each row execute function provisionar_tenant_familia();

-- ── 4 · backfill: contas existentes ganham os 60 dias a partir de agora ──────
insert into tenants (id, dados)
select 'familia:' || u.id,
       jsonb_build_object('esquema', 'pipoca.tenant.v1', 'tenant',
         jsonb_build_object('id', 'familia:' || u.id, 'nome', 'Família',
                            'planoId', 'freemium', 'ativo', true,
                            'criadoEm', (extract(epoch from now()) * 1000)::bigint))
from auth.users u
on conflict (id) do nothing;