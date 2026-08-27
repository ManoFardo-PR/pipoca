# A3 — Migração: fechar a RPC, índices das FKs, políticas permissivas

**Unidade de deploy:** SQL (`apply_migration` no projeto `bamlljvllcxdnsheatqv`) + arquivo em
`src/backend/migrations/`. **Depende de:** nada. **Desbloqueia:** A4 (edges usam a RPC).

## Objetivo
Uma migração única "pós-varredura" que: (1) revoga EXECUTE de `anon`/`authenticated` em
`registrar_uso_ia`; (2) cria índices cobridores das FKs adicionadas em 26/08; (3) resolve
as políticas permissivas múltiplas; e um toggle no painel (leaked-password protection).

## Por quê (evidência)
- Advisor security (WARN): `public.registrar_uso_ia(p_tenant text, p_mes text, p_custo numeric)`
  executável por `anon` e `authenticated` como SECURITY DEFINER via `/rest/v1/rpc/…`.
- ACL real (`select proacl from pg_proc …`):
  `{postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}`.
  A migração `src/backend/migrations/2026-08-28_otimizacao-rls-cascade-cota.sql:44-47` fez
  `revoke all on function … from public` + `grant execute … to service_role` — mas o Supabase
  concede EXECUTE a `anon`/`authenticated` por **default privileges** na criação; `revoke from
  public` não os remove.
- Impacto: qualquer portador da anon key pode fazer upsert em `uso_ia` de qualquer tenant
  (inflar `chamadas`/`custo`) → a edge nega com 403 `cota_excedida` para a família o mês inteiro.
- Advisor performance (INFO): FKs sem índice `historias_perfil_id_fkey`,
  `telemetria_perfil_id_fkey` (criadas em `…cascade-cota.sql:25-30` para o cascade LGPD);
  índice `historias_dono_perfil_idx` nunca usado (a leitura real filtra por `perfil_id`,
  `repo_supabase.ts:179-190`; o índice começa por `dono`).
- Advisor performance (WARN): múltiplas políticas permissivas para `authenticated`/SELECT em
  `contas_tenant` (`contas_tenant_operador`, `contas_tenant_self`), `flags_admin`
  (`flags_admin_leitura`, `flags_admin_operador`), `tenants` (`tenants_familia_leitura`,
  `tenants_operador`).
- Advisor security (WARN): leaked password protection desligada (Auth → painel, não SQL).
- Nota: o arquivo da migração anterior chama-se `2026-08-28_…` mas foi aplicado como
  `20260826155239` — nomear a nova com a data real da aplicação.

## Escopo (arquivos)
- Novo: `src/backend/migrations/2026-XX-XX_pos-varredura-rpc-indices-politicas.sql`.
- Referência do schema: `src/backend/adaptadores/rls_supabase.sql` (tabelas :11-113,
  índices :115-117, políticas :120-141).

## Passos
1. Ler o estado atual antes de escrever (read-only):
   ```sql
   select proname, proacl::text from pg_proc where proname='registrar_uso_ia';
   select indexname, indexdef from pg_indexes where tablename in ('historias','telemetria');
   select tablename, policyname, cmd, roles from pg_policies
     where tablename in ('contas_tenant','flags_admin','tenants');
   ```
2. Migração (rascunho — ajustar aos nomes reais lidos no passo 1):
   ```sql
   -- 1) RPC só para service_role
   revoke execute on function public.registrar_uso_ia(text, text, numeric) from anon, authenticated, public;
   grant  execute on function public.registrar_uso_ia(text, text, numeric) to service_role;
   -- (opcional, fecha a classe inteira para funções futuras)
   alter default privileges in schema public revoke execute on functions from anon, authenticated;

   -- 2) índices das FKs de cascade
   create index if not exists historias_perfil_id_idx  on public.historias(perfil_id);
   create index if not exists telemetria_perfil_id_idx on public.telemetria(perfil_id);
   -- historias_dono_perfil_idx: manter por ora (RLS filtra por dono); reavaliar com dados.

   -- 3) políticas permissivas: fundir as duas SELECT de cada tabela numa só com OR
   --    (ex.: contas_tenant_select = self OR eh_operador()) — ler as definições antes.
   ```
3. Aplicar com `apply_migration` (nome = `pos_varredura_rpc_indices_politicas`), guardar o
   arquivo com o mesmo conteúdo e a data real.
4. No painel do Supabase: Authentication → Password → ativar "Leaked password protection".
5. Re-rodar `get_advisors` (security e performance) e a query do `proacl`.

## Critérios de aceite
- `proacl` de `registrar_uso_ia` sem `anon` e sem `authenticated`.
- `curl -X POST …/rest/v1/rpc/registrar_uso_ia` com a anon key → 401/403/42501.
- Advisors: sem `anon_security_definer_function_executable`, sem `unindexed_foreign_keys`
  em `historias`/`telemetria`, sem `multiple_permissive_policies` nas 3 tabelas.
- Fluxo do admin (`espelho_admin.ts`, `flags_globais.ts`, `limites_familia.ts`) continua
  lendo `flags_admin`/`tenants`/`contas_tenant` — e2e admin verde.

## Verificação
```
node tests/e2e/run-admin.mjs
node tests/e2e/run-linha-verde-canonico.mjs
```
+ `get_advisors` ×2 + `execute_sql` do `proacl`.

## Riscos e cuidados
- Fundir políticas muda semântica se as duas não forem ambas permissivas de leitura pura —
  ler `pg_policies.qual` antes; se houver dúvida, deixar as políticas e resolver só a RPC e
  os índices (o WARN de performance é tolerável no volume atual).
- `alter default privileges` afeta funções futuras — desejável, mas conferir que as funções
  usadas por RLS (`eh_operador`, `tenant_da_sessao`, `tenant_vinculado_a_mim`) mantêm
  `authenticated=X` (elas precisam).
- A migração NÃO deve tocar RLS de `historias`/`perfis`/`saves` (já otimizadas em 26/08).

## Decisões do dono (default)
- Fundir políticas agora ou só documentar (default: **fundir**, se `qual` for leitura pura).
- Dropar `historias_dono_perfil_idx` (default: **manter**; reavaliar após G4).
