# fase06 · 06-03 · Persistência: adaptadores e migração

> 🟡 **STATUS · 2026-06-29 · PARCIAL** — Utilitário `migrar(de,para)` (perfis+saves pelo seam) em `src/backend/migracao.ts`, testado; `RepositorioLocalStorage` funcional. Adaptadores BaaS reais (Supabase/Firebase) aguardam a fachada `Backend` (06-01) + backend — Marco 6. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

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
