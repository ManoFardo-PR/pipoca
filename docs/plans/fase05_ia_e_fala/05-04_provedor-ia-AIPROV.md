# fase05 · 05-04 · Provedor de IA (abstração / AIPROV)

## Identidade
- id: `fase05-05-04`
- nó(s) da arquitetura: AIPROV
- tela(s) do brief: —
- classe: pivot

## Objetivo
Definir a interface única multi-provedor (eixo 2) que o Motor B usa, com adaptadores plugáveis e guardrails no meio.

## Pré-requisitos / Depende de
- `[[fase05-05-01]]` — Motor B consome este provedor.
- `[[fase04-04-05]]` — config (provedor/chaves/cotas) vem do SA_AI.

## Arquivos afetados
- `src/ia/provedor.ts` (criar) — interface `ProvedorIA` + roteamento.

## Nomes & variáveis
- `ProvedorIA` — `{ gerar(prompt, schema, opts): Promise<Trecho> }`.
- `selecionarAdaptador(config)` → Claude/Gemini/OpenAI.

## Interfaces / contratos
- `ProvedorIA`, `Trecho` ([[_contratos/tipos-core]]); config de [[fase04-04-05]].

## Regras de negócio
1. **Interface única** independente de provedor (pivot eixo 2).
2. `AIPROV --> GUARD --> {GEMINI,OPENAI,CLAUDE}`: guardrails sempre no caminho ([[fase05-05-08]]).
3. **Configurado por SA_AI** (provedor ativo, fallback).
4. **Geração com schema** do `Trecho`.

## Passos de implementação
1. Definir `ProvedorIA`.
2. Implementar roteamento por config (com fallback [[fase05-05-10]]).
3. Encadear guardrails antes do provedor concreto.

## Estados / edge-cases
- nenhum provedor configurado → indisponível (Motor A).
- provedor primário falha → fallback.

## Critérios de aceitação / verificação
- [ ] Trocar provedor não muda o Motor B.
- [ ] Guardrails sempre executam.

## Relações com outros docs
- Depende de: `[[fase05-05-01]]`, `[[fase04-04-05]]`
- É consumido por: `[[fase05-05-03]]`, `[[fase05-05-05]]`, `[[fase05-05-06]]`, `[[fase05-05-07]]`, `[[fase05-05-08]]`, `[[fase05-05-10]]`
- Reconcilia / conserta: —
