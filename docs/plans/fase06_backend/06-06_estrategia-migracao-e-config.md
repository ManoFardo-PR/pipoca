# fase06 · 06-06 · Estratégia de migração e configuração

## Identidade
- id: `fase06-06-06`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Documentar como escolher/alternar o provedor de backend e migrar Supabase↔Firebase com baixo atrito.

## Pré-requisitos / Depende de
- `[[fase06-06-01]]` — a fachada `Backend` e a seleção por config.
- `[[fase04-04-06]]` — feature flags / segurança global que controlam o provedor ativo.

## Arquivos afetados
- `src/backend/config.ts` (criar) — `ConfigBackend` (provedor + chaves públicas).
- `docs/plans/fase06_backend/PARIDADE.md` (criar) — matriz de paridade de recursos.

## Nomes & variáveis
- `ConfigBackend` — `{ provedor: "supabase"|"firebase"|"local"; opcoes }`.
- `alternarProvedor(novo)` — usa `migrar()` ([[fase06-06-03]]) e troca o adaptador.

## Interfaces / contratos
- `Backend` ([[_contratos/tipos-core]]); consome adaptadores de auth/persistência/proxy ([[fase06-06-02]], [[fase06-06-03]], [[fase06-06-05]]).

## Regras de negócio
1. **Provedor selecionável** por config/flag (SA_SAFE [[fase04-04-06]]).
2. **Paridade obrigatória:** todo recurso usado existe nos dois provedores (auth, RLS/rules, functions, storage).
3. **Migração:** exportar do provedor A → importar no B via `migrar()` (mesmos schemas).
4. **Sem reescrita de telas** ao migrar (lei do backend).

## Passos de implementação
1. Definir `ConfigBackend` e `alternarProvedor`.
2. Escrever a matriz de paridade (Supabase × Firebase × local).
3. Roteiro de migração com checklist e verificação pós-migração.

## Estados / edge-cases
- recurso sem paridade → bloquear uso ou prover polyfill no adaptador.
- migração parcial/erro → rollback para o provedor anterior.

## Critérios de aceitação / verificação
- [ ] Alternar provedor não quebra nenhuma tela.
- [ ] Migração preserva perfis/saves/telemetria.

## Relações com outros docs
- Depende de: `[[fase06-06-01]]`, `[[fase04-04-06]]`
- É consumido por: `[[fase07-07-04]]`
- Reconcilia / conserta: —
