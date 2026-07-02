# fase05 · 05-08 · Guardrails de conteúdo infantil (GUARD)

> 🟢 **STATUS · 2026-07-02 · IMPLEMENTADO** — `src/ia/guardrails.ts`: `filtrarEntrada`/`filtrarSaida` (blocklist PT-BR por palavra inteira, links, e-mail, telefone, vazio, tamanho) + `envolverComGuardrails` (decorator que garante GUARD sempre no caminho; violação → throw → degradação para Motor A). Motivos sem PII. MVP não usa `trechoReformulado` (degrada em vez de reescrever). Testes em `src/ia/ia.test.ts`.

## Identidade
- id: `fase05-05-08`
- nó(s) da arquitetura: GUARD
- tela(s) do brief: —
- classe: f2

## Objetivo
Filtrar entrada e saída da IA de forma independente de provedor, garantindo conteúdo seguro para crianças.

## Pré-requisitos / Depende de
- `[[fase05-05-04]]` — fica entre AIPROV e os provedores.
- `[[fase00-00-17]]` — Motor A como alvo de degradação.

## Arquivos afetados
- `src/ia/guardrails.ts` (criar) — filtros de entrada/saída.

## Nomes & variáveis
- `filtrarEntrada(prompt)` / `filtrarSaida(trecho)`.
- `decisao` — `permitir | degradar`.

## Interfaces / contratos
- `Trecho`, `ProvedorIA` ([[_contratos/tipos-core]]).

## Regras de negócio
1. `AIPROV --> GUARD --> {GEMINI,OPENAI,CLAUDE}`: sempre no caminho.
2. **Independente de provedor.**
3. **Inseguro/recusa → degrada para Motor A** ([[fase00-00-17]]).
4. **Logs sem PII.**
5. Conteúdo seguro para crianças (brief).

## Passos de implementação
1. Pré-filtro do prompt.
2. Pós-filtro da saída; revalidar como `Trecho`.
3. Em violação/recusa, degradar para Motor A.

## Estados / edge-cases
- saída marginal → reescreve/degrada.
- provedor recusa → Motor A.

## Critérios de aceitação / verificação
- [ ] Saída insegura nunca chega à criança.
- [ ] Degradação para Motor A funciona.

## Relações com outros docs
- Depende de: `[[fase05-05-04]]`, `[[fase00-00-17]]`
- É consumido por: `[[fase05-05-03]]`, `[[fase05-05-05]]`, `[[fase05-05-06]]`, `[[fase05-05-07]]`
- Reconcilia / conserta: —
