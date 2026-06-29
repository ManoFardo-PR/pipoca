# fase04 · 04-06 · Segurança global e feature flags (SA_SAFE)

## Identidade
- id: `fase04-04-06`
- nó(s) da arquitetura: SA_SAFE
- tela(s) do brief: —
- classe: admin

## Objetivo
Controlar segurança global e feature flags da plataforma, com defaults seguros para crianças.

## Pré-requisitos / Depende de
- `[[fase04-04-02]]` — acessível pelo painel do Super Admin.
- `[[fase00-00-11]]` — flags afetam `Modos`.

## Arquivos afetados
- `src/admin/Seguranca.dc.html` (criar) — flags globais.
- `src/admin/flags.ts` (criar) — modelo de flags.

## Nomes & variáveis
- `featureFlags` (mapa nome→bool).
- `killSwitch(recurso)`.

## Interfaces / contratos
- `Modos` ([[_contratos/tipos-core]]).

## Regras de negócio
1. `SA_SAFE --> MODES`: flags podem forçar/limitar modos.
2. **Defaults seguros** (IA off, conteúdo filtrado).
3. **Kill-switch** desativa recursos globalmente.

## Passos de implementação
1. Editor de flags.
2. Aplicar overrides a `Modos`.
3. Kill-switch por recurso.

## Estados / edge-cases
- flag desliga IA globalmente → ignora `Modos.iaLigada`.

## Critérios de aceitação / verificação
- [ ] Flags afetam o comportamento dos modos.
- [ ] Kill-switch desativa o recurso.

## Relações com outros docs
- Depende de: `[[fase04-04-02]]`, `[[fase00-00-11]]`
- É consumido por: `[[fase00-00-11]]`
- Reconcilia / conserta: —
