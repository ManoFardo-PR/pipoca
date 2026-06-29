# fase05 · 05-06 · Adaptador Google Gemini (GEMINI)

## Identidade
- id: `fase05-05-06`
- nó(s) da arquitetura: GEMINI
- tela(s) do brief: —
- classe: f2

## Objetivo
Implementar o `ProvedorIA` sobre a API do Google Gemini, com a MESMA interface dos demais adaptadores.

## Pré-requisitos / Depende de
- `[[fase05-05-04]]` — a interface `ProvedorIA`.

## Arquivos afetados
- `src/ia/adaptadores/gemini.ts` (criar) — adaptador Gemini.

## Nomes & variáveis
- `gerar(prompt, schema, opts)` → chamada Gemini com saída JSON estruturada.
- `modelo` configurável por SA_AI.

## Interfaces / contratos
- `ProvedorIA`, `Trecho` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Mesma interface** → intercambiável com Claude/OpenAI.
2. Geração com JSON schema do `Trecho`.
3. Chave server-side ([[fase04-04-05]]); mapear cotas/erros.

## Passos de implementação
1. Cliente Gemini com chave do SA_AI.
2. Pedir saída estruturada (schema do `Trecho`).
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
