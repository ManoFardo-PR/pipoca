-- Pipoca — MIGRAÇÃO PENDENTE (iteração 2 da fase06): admin remoto
-- -----------------------------------------------------------------
-- COMO APLICAR: cole este arquivo INTEIRO no SQL editor do dashboard
-- (https://supabase.com/dashboard/project/bamlljvllcxdnsheatqv/sql/new) e Run.
-- É IDEMPOTENTE: seguro de rodar mais de uma vez. Aplicar UMA vez, ao final
-- da iteração (os PRs são fail-soft e funcionam antes disso).
--
-- Pré-requisitos já aplicados: schema da fase06 (rls_supabase.sql) e a
-- migração historias+Freemium (migracao_2026-07-06_historias_freemium.sql).
--
-- Blocos desta iteração (crescem com os PRs 2/4/5):
--   1. flags_admin   — kill-switches GLOBAIS (a família LÊ; só operador escreve)
--   2. conteudo      — biblioteca de cenários versionados (só operador)
--   3. contas_tenant — vínculo explícito conta↔tenant
--   4. tenant_da_sessao() + trigger fixar_tenant_perfis — o SERVIDOR decide o
--      tenant_id de todo perfil (fecha o spoofing/bypass do teto)

-- ── 1 · flags_admin: kill-switches globais (linha única 'global') ────────────
-- A FAMÍLIA precisa LER (o kill-switch alcança o app no boot/login); só o
-- operador escreve. SEM seed deliberado: a linha nasce no 1º salvamento do
-- operador em SA_SAFE (um seed com padrões atropelaria flags já ligadas
-- localmente por um operador).
create table if not exists flags_admin (
  id            text primary key default 'global',
  dados         jsonb not null,                    -- FeatureFlags (nome → bool)
  atualizado_em timestamptz not null default now()
);
alter table flags_admin enable row level security;

drop policy if exists flags_admin_leitura on flags_admin;
create policy flags_admin_leitura on flags_admin for select
  to authenticated using (true);                    -- NUNCA para anon

drop policy if exists flags_admin_operador on flags_admin;
create policy flags_admin_operador on flags_admin for all
  using (eh_operador()) with check (eh_operador());

-- ── 2 · conteudo: biblioteca de cenários versionados (SÓ operador) ────────────
-- Identidade composta (cenario_id, versao) — versionar preserva as anteriores.
-- Publicação para as famílias lerem = fase08; por ora nenhuma família enxerga.
create table if not exists conteudo (
  cenario_id    text not null,
  versao        int  not null,
  tenant_id     text,                               -- null = catálogo da plataforma
  publicado_em  bigint,                             -- epoch ms do envelope; null = rascunho
  dados         jsonb not null,                     -- envelope pipoca.conteudo.v1
  atualizado_em timestamptz not null default now(),
  primary key (cenario_id, versao)
);
alter table conteudo enable row level security;

drop policy if exists conteudo_operador on conteudo;
create policy conteudo_operador on conteudo for all
  using (eh_operador()) with check (eh_operador());

-- ── 3 · contas_tenant: vínculo explícito conta↔tenant ────────────────────────
-- E-mail sempre minúsculo (o cliente normaliza; lower() nas policies reforça).
-- A família SÓ enxerga os próprios vínculos: auth.jwt()->>'email' é claim
-- ASSINADO pelo GoTrue (não spoofável); coalesce cobre conta sem e-mail.
create table if not exists contas_tenant (
  email      text not null,
  tenant_id  text not null,
  criado_em  timestamptz not null default now(),
  primary key (email, tenant_id)
);
alter table contas_tenant enable row level security;

drop policy if exists contas_tenant_operador on contas_tenant;
create policy contas_tenant_operador on contas_tenant for all
  using (eh_operador()) with check (eh_operador());

drop policy if exists contas_tenant_self on contas_tenant;
create policy contas_tenant_self on contas_tenant for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));

-- ── 4 · o SERVIDOR decide o tenant de todo perfil ─────────────────────────────
-- tenant_da_sessao(): vínculo mais ANTIGO do e-mail do JWT; sem vínculo →
-- sintético 'familia:<uid>'. O trigger fixar_tenant_perfis roda ANTES do
-- teto_perfis (ordem alfabética: f < t) e sobrescreve new.tenant_id — fecha
-- dois furos de uma vez: omitir tenant_id (bypassava o teto, que retorna
-- cedo com null) e apontar para tenant alheio (inflava a contagem de
-- terceiros). Perfis antigos com tenant sintético migram SOZINHOS: o sync
-- re-empurra todos com upsert a cada login e o trigger fixa (update).
-- Service role (auth.uid() nulo) passa intacto.
create or replace function tenant_da_sessao() returns text
language sql security definer stable set search_path = public as
$$ select coalesce(
     (select ct.tenant_id from contas_tenant ct
       where lower(ct.email) = lower(coalesce(auth.jwt()->>'email',''))
       order by ct.criado_em asc limit 1),
     case when auth.uid() is not null then 'familia:' || auth.uid()::text end) $$;
revoke execute on function tenant_da_sessao() from public, anon;

create or replace function fixar_tenant_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.tenant_id := tenant_da_sessao();
  end if;
  return new;
end $$;
revoke execute on function fixar_tenant_perfil() from public, anon, authenticated;

drop trigger if exists fixar_tenant_perfis on perfis;
create trigger fixar_tenant_perfis before insert or update on perfis
  for each row execute function fixar_tenant_perfil();
