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

-- ── teto de perfis por tenant (limite do plano — critério 06-04) ────────────
create function verificar_teto_perfis() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  teto int;
  atuais int;
begin
  if new.tenant_id is null then return new; end if;
  select coalesce((dados->'tenant'->'limites'->>'perfis')::int, null) into teto
    from tenants where id = new.tenant_id;
  if teto is null then return new; end if; -- tenant sintético/sem plano: sem teto aqui
  select count(*) into atuais from perfis where tenant_id = new.tenant_id and id <> new.id;
  if atuais + 1 > teto then
    raise exception 'teto de perfis do plano atingido para o tenant %', new.tenant_id;
  end if;
  return new;
end $$;

create trigger teto_perfis before insert on perfis
  for each row execute function verificar_teto_perfis();
