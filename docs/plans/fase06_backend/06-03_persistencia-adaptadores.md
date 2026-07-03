# fase06 · 06-03 · Persistência: adaptadores e migração

> 🟢 **STATUS · 2026-07-02 · IMPLEMENTADO (Supabase real; Firebase stub)** — adaptadores completos em `src/backend/adaptadores/`: repo_local (o repositório local canônico), repo_supabase (PostgREST via REST — os MESMOS envelopes canônicos em jsonb, revalidados na leitura; upsert idempotente; token relido a cada request; LGPD apaga nas 3 tabelas) e repo_sincronizado ("remoto com fallback local": leitura local, escrita local + espelho fire-and-forget, TOMBSTONES para apagar offline). `sincronizarInicial` (união com preferência local, reusa `migrar()`). Round-trip por adaptador e `migrar(local, supabase)` testados com PostgREST fake (critérios do doc). O stub antigo do core foi aposentado. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase06-06-03`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Implementar adaptadores concretos de `RepositorioPersistencia` (localStorage, Supabase, Firebase) e a migração de dados entre eles.

## Pré-requisitos / Depende de
- `[[fase00-00-12]]` — a interface `RepositorioPersistencia` (seam SAVE).
- `[[fase06-06-01]]` — a fachada `Backend`.

## Arquivos afetados
- `src/backend/adaptadores/repo_local.ts`, `repo_supabase.ts`, `repo_firebase.ts` (criar).
- `src/backend/migracao.ts` (criar) — exportar/importar entre adaptadores.

## Nomes & variáveis
- `RepositorioLocalStorage`, `RepositorioSupabase`, `RepositorioFirebase` (implementam `RepositorioPersistencia`).
- `migrar(de, para)` — copia perfis/saves/telemetria.

## Interfaces / contratos
- `RepositorioPersistencia`, `Perfil`, `EstadoApp` ([[_contratos/tipos-core]]); schemas `pipoca.perfil.v1`/`pipoca.save.v1` ([[_contratos/schemas-json]]).

## Regras de negócio
1. **Mesma interface** → trocar de provedor não muda chamadas da app.
2. **Migração fácil:** `migrar()` lê tudo de um adaptador e grava no outro (mesmos schemas).
3. **online-first com fallback local** quando offline.
4. **LGPD:** apagar/exportar opera em qualquer adaptador ([[fase02-02-09]]).

## Passos de implementação
1. Implementar os 3 adaptadores sobre `RepositorioPersistencia`.
2. Implementar `migrar(de, para)` usando os schemas congelados.
3. Selecionar o adaptador via `Backend`/config ([[fase06-06-01]]).

## Estados / edge-cases
- offline → usa `RepositorioLocalStorage`; sincroniza ao voltar.
- conflito de versão de schema → migração segura ([[fase00-00-14]]).

## Critérios de aceitação / verificação
- [ ] Round-trip salvar/carregar em cada adaptador.
- [ ] `migrar(local, supabase)` preserva perfis/saves.

## Relações com outros docs
- Depende de: `[[fase00-00-12]]`, `[[fase06-06-01]]`
- É consumido por: `[[fase06-06-06]]`
- Reconcilia / conserta: —
