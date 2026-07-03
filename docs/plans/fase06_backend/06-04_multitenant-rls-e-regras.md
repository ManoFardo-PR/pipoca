# fase06 · 06-04 · Multi-tenant: RLS e regras

> 🟢 **STATUS · 2026-07-02 · IMPLEMENTADO (MVP no Supabase real)** — `escopoTenant(sessao)` puro em `src/backend/tenant.ts` (família → tenant sintético por uid; aplicado pelo repo remoto na coluna tenant_id) + `adaptadores/rls_supabase.sql` APLICADO ao projeto real: dono com DEFAULT `auth.uid()` no banco (o cliente nunca envia — spoofing fechado), gate de operador via função SECURITY DEFINER com EXECUTE endurecido pós-advisors, tabela de uso de IA deny-all (só a função com service role) e TRIGGER de teto de perfis por plano (limites respeitados no dado que existe). RLS verificado AO VIVO: anon lê 0 linhas e a escrita é negada. `rules_firebase.txt` = template de paridade (PARIDADE.md). Pendências: vínculo explícito conta↔tenant e telas do admin sobre PostgREST. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase06-06-04`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Isolar dados por tenant atrás de uma abstração de escopo, implementada como RLS (Supabase) ou Security Rules (Firebase).

## Pré-requisitos / Depende de
- `[[fase04-04-03]]` — o modelo de tenants/planos (SA_TENANT).
- `[[fase06-06-01]]` — a fachada `Backend`.

## Arquivos afetados
- `src/backend/tenant.ts` (criar) — escopo de tenant.
- `src/backend/adaptadores/rls_supabase.sql`, `rules_firebase.txt` (criar) — políticas por provedor.

## Nomes & variáveis
- `pipoca.tenant.v1` — tenant/plano/limites.
- `escopoTenant(sessao)` — deriva `tenantId` de `SessaoAuth` e filtra toda leitura/escrita.

## Interfaces / contratos
- `SessaoAuth`, `Backend` ([[_contratos/tipos-core]]); schema `pipoca.tenant.v1` ([[_contratos/schemas-json]]).

## Regras de negócio
1. **Isolamento por tenant:** nenhum dado cruza tenants.
2. **Paridade entre provedores:** a mesma regra existe como RLS (Supabase) e Security Rules (Firebase).
3. **Limites por plano** (perfis, cota de IA) vêm de `pipoca.tenant.v1`.
4. Escopo derivado de `SessaoAuth.tenantId` ([[fase06-06-02]]).

## Passos de implementação
1. Definir `pipoca.tenant.v1` e `escopoTenant`.
2. Escrever as políticas RLS (Supabase) e Security Rules (Firebase) equivalentes.
3. Aplicar o escopo em todos os adaptadores de persistência ([[fase06-06-03]]).

## Estados / edge-cases
- usuário sem tenant → acesso negado (exceto super admin).
- super admin → vê todos os tenants (escopo elevado).

## Critérios de aceitação / verificação
- [ ] Leitura/escrita fora do tenant é bloqueada nos dois provedores.
- [ ] Limites do plano são respeitados.

## Relações com outros docs
- Depende de: `[[fase04-04-03]]`, `[[fase06-06-01]]`
- É consumido por: `[[fase06-06-06]]`
- Reconcilia / conserta: —
