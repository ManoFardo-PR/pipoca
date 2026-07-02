# fase05 · 05-10 · Fallback, cotas e custo

> 🟡 **STATUS · 2026-07-02 · PARCIAL (MVP local)** — `src/ia/orquestrador.ts`: cadeia primário → fallback com cotas/custo (`cotaRestante`/`custoAcumulado`) e telemetria de uso sem PII (só números); o degrau final "motorA" da cadeia é o throw que faz o consumidor degradar. Pool de cota/custo é LOCAL em memória com teto injetável — a leitura da config real por tenant (SA_AI) e a persistência/medição de verdade chegam com o backend (fase06).

## Identidade
- id: `fase05-05-10`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: f2

## Objetivo
Orquestrar fallback entre provedores, cotas e custo, conforme a configuração do SA_AI.

## Pré-requisitos / Depende de
- `[[fase05-05-04]]` — o `ProvedorIA` que esta camada orquestra.
- `[[fase04-04-05]]` — a config de provedor/cotas/custo.

## Arquivos afetados
- `src/ia/orquestrador.ts` (criar) — fallback/cotas/custo.

## Nomes & variáveis
- `cadeiaFallback` — `[primario, ...secundarios, "motorA"]`.
- `custoAcumulado`, `cotaRestante`.

## Interfaces / contratos
- `ProvedorIA`, `Trecho` ([[_contratos/tipos-core]]); config de [[fase04-04-05]].

## Regras de negócio
1. **Cadeia:** provedor primário → fallback → Motor A ([[fase00-00-17]]).
2. **Cotas/custo** por tenant; ao estourar, próximo da cadeia.
3. **Telemetria de custo sem PII**.

## Passos de implementação
1. Ler `cadeiaFallback`/cotas do SA_AI.
2. Tentar em ordem; ao falhar/estourar, avançar.
3. Registrar custo (sem PII).

## Estados / edge-cases
- todos os provedores falham → Motor A.
- cota zerada → Motor A.

## Critérios de aceitação / verificação
- [ ] Falha do primário aciona o próximo da cadeia.
- [ ] Cota estourada degrada para Motor A.

## Relações com outros docs
- Depende de: `[[fase05-05-04]]`, `[[fase04-04-05]]`
- É consumido por: `[[fase05-05-04]]`
- Reconcilia / conserta: —
