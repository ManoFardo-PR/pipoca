# fase00 · 00-07 · Perfil ativo (PERF)

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/core/perfil.ts` (clamp idade 3..12, `AVATARES`, `normalizarNome`, `RepositorioPerfil` em memória). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase00-00-07`
- nó(s) da arquitetura: PERF
- tela(s) do brief: —
- classe: mvp

## Objetivo
Definir o perfil da criança (nome, idade, nível, avatar) que parametriza a narrativa e a economia.

## Pré-requisitos / Depende de
- `[[fase00-00-06]]` — `EstadoApp.perfil`.

## Arquivos afetados
- `src/core/perfil.ts` (criar) — `Perfil` + validações.

## Nomes & variáveis
- `Perfil` — `{ id, nome, idade, nivel, avatarId }`.
- `avatarId` — um de `pingo|fubá|cacau|lua|tuca` (de `_avatarDefs` do protótipo).
- mapeia `ob.name`/`ob.age`/`ob.level`.

## Interfaces / contratos
- `Perfil`, `Nivel` ([[_contratos/tipos-core]]); schema `pipoca.perfil.v1` ([[_contratos/schemas-json]]).

## Regras de negócio
1. **Idade 3..12** (clamp como no protótipo).
2. **Nome opcional** → cai no `childNameDefault`.
3. **`nivel`** seleciona o campo `Fragmento4[nivel]` em toda a narrativa.

## Passos de implementação
1. Definir `Perfil` e `perfilVazio`.
2. Validar idade/nível na criação/edição.
3. Persistir via `pipoca.perfil.v1` ([[fase00-00-14]]).

## Estados / edge-cases
- nome em branco → usa apelido padrão.
- idade fora de 3..12 → clamp.

## Critérios de aceitação / verificação
- [ ] `Perfil` valida idade e nível.
- [ ] O `nivel` muda o texto em todas as telas via [[fase00-00-16]].

## Relações com outros docs
- Depende de: `[[fase00-00-06]]`
- É consumido por: `[[fase01-01-01]]`, `[[fase01-01-02]]`, `[[fase02-02-05]]`
- Reconcilia / conserta: —
