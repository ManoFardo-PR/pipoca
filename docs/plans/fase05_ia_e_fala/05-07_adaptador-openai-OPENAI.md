# fase05 · 05-07 · Adaptador OpenAI (OPENAI)

> 🟡 **STATUS · 2026-07-02 · PARCIAL (pronto, sem chamada real)** — `src/ia/adaptadores/openai.ts`: structured outputs estritos (`response_format` json_schema) restritos ao Trecho, campo `refusal` tratado ANTES do conteúdo, mesma interface intercambiável. Chamada real com chave server-side = fase06 (ProxyIA).

## Identidade
- id: `fase05-05-07`
- nó(s) da arquitetura: OPENAI
- tela(s) do brief: —
- classe: f2

## Objetivo
Implementar o `ProvedorIA` sobre a API da OpenAI, com a MESMA interface dos demais adaptadores.

## Pré-requisitos / Depende de
- `[[fase05-05-04]]` — a interface `ProvedorIA`.

## Arquivos afetados
- `src/ia/adaptadores/openai.ts` (criar) — adaptador OpenAI.

## Nomes & variáveis
- `gerar(prompt, schema, opts)` → structured outputs (JSON schema do `Trecho`).
- `modelo` configurável por SA_AI.

## Interfaces / contratos
- `ProvedorIA`, `Trecho` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Mesma interface** → intercambiável.
2. Geração com JSON schema do `Trecho` (structured outputs).
3. Chave server-side ([[fase04-04-05]]); mapear cotas/erros.

## Passos de implementação
1. Cliente OpenAI com chave do SA_AI.
2. Pedir structured output (schema do `Trecho`).
3. Mapear erros/cotas para o contrato comum.

## Estados / edge-cases
- saída inválida → revalida/degrada ([[fase05-05-08]]).
- cota estourada → fallback ([[fase05-05-10]]).

## Critérios de aceitação / verificação
- [ ] Saída válida como `Trecho`.
- [ ] Intercambiável sem mudar Motor B.

## Relações com outros docs
- Depende de: `[[fase05-05-04]]`
- É consumido por: `[[fase05-05-08]]`
- Reconcilia / conserta: —
