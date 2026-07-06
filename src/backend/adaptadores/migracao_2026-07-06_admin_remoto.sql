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
--   1. flags_admin — kill-switches GLOBAIS (a família LÊ; só operador escreve)
--   2. conteudo    — biblioteca de cenários versionados (só operador)

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
