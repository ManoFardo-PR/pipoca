# fase03 · 03-03 · Persistência da telemetria

## Identidade
- id: `fase03-03-03`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: admin

## Objetivo
Definir onde a telemetria aterrissa em SAVE e o ponto de migração local→backend na Fase 1.5.

## Pré-requisitos / Depende de
- `[[fase03-03-01]]` — os eventos de telemetria.
- `[[fase00-00-12]]` — o seam de persistência.

## Arquivos afetados
- `src/servicos/telemetria_repo.ts` (criar) — gravação/retenção de eventos.

## Nomes & variáveis
- `RepositorioPersistencia.registrarTelemetria(evento)`.
- `retencaoDias` — política de retenção.

## Interfaces / contratos
- `RepositorioPersistencia`, `EventoTelemetria` ([[_contratos/tipos-core]]); schema `pipoca.telemetria.v1` ([[_contratos/schemas-json]]).

## Regras de negócio
1. **Privada por construção** (LGPD; [[fase02-02-09]]).
2. **Local no MVP → Supabase na Fase 1.5** (ponto de migração).
3. **Retenção/anonimização** configuráveis.

## Passos de implementação
1. Implementar `registrarTelemetria` na impl local.
2. Definir formato de armazenamento e retenção.
3. Demarcar o ponto de troca para backend.

## Estados / edge-cases
- armazenamento cheio → poda por retenção.
- apagar dados (LGPD) → remove telemetria do perfil.

## Critérios de aceitação / verificação
- [ ] Eventos persistem em `pipoca.telemetria.v1`.
- [ ] Retenção remove eventos antigos.

## Relações com outros docs
- Depende de: `[[fase03-03-01]]`, `[[fase00-00-12]]`
- É consumido por: `[[fase03-03-02]]`
- Reconcilia / conserta: —
