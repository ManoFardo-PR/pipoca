# fase06 · 06-02 · Auth: serviço e adaptadores (família + super admin)

> 🟢 **STATUS · 2026-07-02 · IMPLEMENTADO (Supabase real; Firebase stub)** — `ServicoAuth`/`SessaoAuth` ipsis litteris em `src/backend/auth.ts`; adaptador GoTrue via REST (`adaptadores/auth_supabase.ts`): password grant com signup automático no 1º uso da família (espelha o stub), espelhos síncronos que o boot do app já lê (contrato `sessaoAtual()` síncrono preservado), refresh de token sob demanda regravado, operador exige linha na tabela `operadores` (SEM signup automático) e erro NEUTRO em toda falha. Telas LoginFamilia/SaLogin agnósticas via seam; `sessaoAtual().tipo` separa família de operador (critério testado). Passo manual: Confirm email OFF (PARIDADE.md). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase06-06-02`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Implementar a autenticação atrás de um seam único (`ServicoAuth`), com adaptadores Supabase e Firebase, cobrindo login da família e do super admin.

## Pré-requisitos / Depende de
- `[[fase06-06-01]]` — a fachada `Backend`.
- `[[fase02-02-01]]` — a tela/fluxo de login da família (HH_LOGIN).
- `[[fase04-04-01]]` — o login do super admin (SA_LOGIN).

## Arquivos afetados
- `src/backend/auth.ts` (criar) — `ServicoAuth`.
- `src/backend/adaptadores/auth_supabase.ts`, `auth_firebase.ts` (criar).

## Nomes & variáveis
- `ServicoAuth` — `entrarFamilia(cred)`, `entrarSuperAdmin(cred)`, `sair()`, `sessaoAtual()`.
- `SessaoAuth` — `{ uid, tipo: "familia"|"superadmin", tenantId? }`.
- adaptadores: `AuthSupabase`, `AuthFirebase`.

## Interfaces / contratos
- `ServicoAuth`, `SessaoAuth`, `Backend` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Mesmo seam** para família e super admin; o tipo é distinguido por `SessaoAuth.tipo`.
2. **Trocável:** a UI de login (HH_LOGIN/SA_LOGIN) não conhece o provedor.
3. **Escopo de tenant:** `SessaoAuth.tenantId` alimenta o multi-tenant ([[fase06-06-04]]).
4. **Sem segredos no cliente** além de chaves públicas anon/web do provedor.

## Passos de implementação
1. Declarar `ServicoAuth`.
2. Implementar `AuthSupabase` (auth do Supabase) e `AuthFirebase` (Firebase Auth).
3. Ligar HH_LOGIN/SA_LOGIN ao `Backend.auth`.

## Estados / edge-cases
- credencial inválida → erro acolhedor (na UI), sem vazar detalhes.
- sessão expirada → re-login; modo criança permanece local até re-auth.

## Critérios de aceitação / verificação
- [ ] Trocar provedor não muda as telas de login.
- [ ] `sessaoAtual().tipo` separa família de super admin.

## Relações com outros docs
- Depende de: `[[fase06-06-01]]`, `[[fase02-02-01]]`, `[[fase04-04-01]]`
- É consumido por: `[[fase06-06-04]]`
- Reconcilia / conserta: —
