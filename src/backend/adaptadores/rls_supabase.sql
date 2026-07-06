-- Pipoca — schema + RLS do Supabase · doc fase06-06-04
-- ------------------------------------------------------
-- ESPELHO do apply_migration aplicado ao projeto real (fase06, etapa de
-- infra). Princípios: `dono` tem DEFAULT auth.uid() e o cliente NUNCA o
-- envia (RLS com with check fecha spoofing); `eh_operador()` é SECURITY
-- DEFINER para não recursar no RLS de `operadores`; `uso_ia` NÃO tem
-- policy nenhuma = deny-all para anon/authenticated (só a Edge Function
-- com service role escreve/lê).

-- ── tabelas da família (envelopes canônicos viajam em jsonb) ────────────────
create table perfis (
  id            text primary key,
  dono          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tenant_id     text,
  dados         jsonb not null,              -- envelope pipoca.perfil.v1
  atualizado_em timestamptz not null default now()
);

create table saves (
  perfil_id     text primary key references perfis(id) on delete cascade,
  dono          uuid not null default auth.uid(),
  dados         jsonb not null,              -- envelope pipoca.save.v1
  atualizado_em timestamptz not null default now()
);

create table telemetria (
  id         bigserial primary key,
  perfil_id  text not null,
  dono       uuid not null default auth.uid(),
  evento     jsonb not null,                 -- EventoTelemetria (sem PII)
  criado_em  timestamptz not null default now()
);

-- histórias salvas (pós-fase06): retenção de 20 dias no CLIENTE via DELETE
-- por filtro (favorita=false e criada_em antiga) — por isso favorita/criada_em
-- são colunas além do envelope pipoca.historias.v1 em `dados`.
create table historias (
  id            text primary key,            -- uuid gerado no cliente
  perfil_id     text not null,
  dono          uuid not null default auth.uid(),
  favorita      boolean not null default false,
  criada_em     timestamptz not null,        -- fiel ao criadaEm do cliente
  dados         jsonb not null,              -- envelope pipoca.historias.v1
  atualizado_em timestamptz not null default now()
);

-- ── plataforma (operador / proxy) ───────────────────────────────────────────
-- flags_admin: kill-switches GLOBAIS (pós-fase06, iteração 2) — linha única
-- 'global'. A FAMÍLIA lê (o kill-switch alcança o app no boot); só o operador
-- escreve. SEM seed: a linha nasce no 1º salvamento em SA_SAFE.
create table flags_admin (
  id            text primary key default 'global',
  dados         jsonb not null,              -- FeatureFlags (nome → bool)
  atualizado_em timestamptz not null default now()
);

-- conteudo: biblioteca de cenários versionados (pós-fase06, iteração 2) —
-- identidade composta (cenario_id, versao); publicação p/ famílias = fase08.
create table conteudo (
  cenario_id    text not null,
  versao        int  not null,
  tenant_id     text,                        -- null = catálogo da plataforma
  publicado_em  bigint,                      -- epoch ms do envelope; null = rascunho
  dados         jsonb not null,              -- envelope pipoca.conteudo.v1
  atualizado_em timestamptz not null default now(),
  primary key (cenario_id, versao)
);

-- contas_tenant: vínculo explícito conta↔tenant (pós-fase06, iteração 2) —
-- e-mail sempre minúsculo; a família resolve o tenant REAL no login por aqui.
create table contas_tenant (
  email      text not null,
  tenant_id  text not null,
  criado_em  timestamptz not null default now(),
  primary key (email, tenant_id)
);

create table operadores (
  uid    uuid primary key references auth.users(id) on delete cascade,
  escopo jsonb not null default '"todos"'::jsonb
);

create table tenants (
  id            text primary key,
  dados         jsonb not null,
  atualizado_em timestamptz not null default now()
);

create table config_ia (
  tenant_id     text primary key,
  dados         jsonb not null,              -- ConfigIaTenant (SEM chaves!)
  atualizado_em timestamptz not null default now()
);

create table uso_ia (
  tenant_id text not null,
  mes       text not null,                   -- "2026-07"
  chamadas  int not null default 0,
  custo     numeric not null default 0,
  primary key (tenant_id, mes)
);

create index perfis_dono_idx on perfis(dono);
create index telemetria_dono_perfil_idx on telemetria(dono, perfil_id);
create index historias_dono_perfil_idx on historias(dono, perfil_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table perfis      enable row level security;
alter table saves       enable row level security;
alter table telemetria  enable row level security;
alter table historias   enable row level security;
alter table flags_admin enable row level security;
alter table conteudo    enable row level security;
alter table contas_tenant enable row level security;
alter table operadores  enable row level security;
alter table tenants     enable row level security;
alter table config_ia   enable row level security;
alter table uso_ia      enable row level security;

-- família: cada linha pertence ao dono (auth.uid())
create policy perfis_dono on perfis for all
  using (dono = auth.uid()) with check (dono = auth.uid());
create policy saves_dono on saves for all
  using (dono = auth.uid()) with check (dono = auth.uid());
create policy telemetria_dono on telemetria for all
  using (dono = auth.uid()) with check (dono = auth.uid());
create policy historias_dono on historias for all
  using (dono = auth.uid()) with check (dono = auth.uid());

-- operador: gate por função SECURITY DEFINER (evita recursão de RLS)
create function eh_operador() returns boolean
language sql security definer stable set search_path = public as
$$ select exists(select 1 from operadores where uid = auth.uid()) $$;

create policy operadores_self on operadores for select
  using (uid = auth.uid());
-- (SEM policy de escrita em operadores: seed só via service role/SQL editor)

create policy tenants_operador on tenants for all
  using (eh_operador()) with check (eh_operador());
create policy config_ia_operador on config_ia for all
  using (eh_operador()) with check (eh_operador());
-- uso_ia: NENHUMA policy → invisível/intocável do cliente (só service role).

-- flags_admin: leitura para QUALQUER autenticado (a família puxa o
-- kill-switch no boot — nunca anon); escrita só operador.
create policy flags_admin_leitura on flags_admin for select
  to authenticated using (true);
create policy flags_admin_operador on flags_admin for all
  using (eh_operador()) with check (eh_operador());

-- conteudo: só operador (publicação para famílias = fase08).
create policy conteudo_operador on conteudo for all
  using (eh_operador()) with check (eh_operador());

-- contas_tenant: operador tudo; a família SÓ enxerga os próprios vínculos
-- (auth.jwt()->>'email' é claim ASSINADO — não spoofável).
create policy contas_tenant_operador on contas_tenant for all
  using (eh_operador()) with check (eh_operador());
create policy contas_tenant_self on contas_tenant for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));

-- ── teto de perfis por tenant (limite do plano — critério 06-04) ────────────
-- Pós-fase06 (Freemium): o teto é resolvido pelo planoId do envelope
-- pipoca.tenant.v1 (a versão original lia dados.tenant.limites.perfis, shape
-- que nunca foi escrito — o teto estava inerte). Freemium vale 60 dias a
-- partir do criadoEm; vencido, degrada ao teto do Grátis. Tenant SEM linha
-- em `tenants` agora é fail-closed (teto 1) — o provisionamento no signup
-- (abaixo) garante a linha de toda família.
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

create trigger teto_perfis before insert on perfis
  for each row execute function verificar_teto_perfis();

-- ── o SERVIDOR decide o tenant de todo perfil (pós-fase06, iteração 2) ───────
-- tenant_da_sessao(): vínculo mais antigo do e-mail do JWT; sem vínculo →
-- sintético 'familia:<uid>'. fixar_tenant_perfis roda ANTES do teto_perfis
-- (ordem alfabética: f < t) e sobrescreve new.tenant_id — fecha o spoofing
-- (tenant alheio) e o bypass do teto (tenant_id omitido). Perfis antigos
-- migram sozinhos: o sync re-empurra com upsert e o trigger fixa.
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
  end if;                                  -- service role passa intacto
  return new;
end $$;
revoke execute on function fixar_tenant_perfil() from public, anon, authenticated;

create trigger fixar_tenant_perfis before insert or update on perfis
  for each row execute function fixar_tenant_perfil();

-- ── Freemium: TODO cadastro entra no plano (pós-fase06) ─────────────────────
-- Trigger em auth.users provisiona o tenant sintético da família
-- ('familia:<uid>') já no Freemium (60 dias com os limites do Família).
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

create trigger provisionar_tenant_apos_signup
  after insert on auth.users
  for each row execute function provisionar_tenant_familia();

-- Backfill: contas existentes ganham os 60 dias a partir da migration.
insert into tenants (id, dados)
select 'familia:' || u.id,
       jsonb_build_object('esquema', 'pipoca.tenant.v1', 'tenant',
         jsonb_build_object('id', 'familia:' || u.id, 'nome', 'Família',
                            'planoId', 'freemium', 'ativo', true,
                            'criadoEm', (extract(epoch from now()) * 1000)::bigint))
from auth.users u
on conflict (id) do nothing;
