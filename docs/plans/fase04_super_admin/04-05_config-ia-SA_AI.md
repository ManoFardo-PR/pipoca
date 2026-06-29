# fase04 · 04-05 · Configuração de IA (SA_AI)

## Identidade
- id: `fase04-04-05`
- nó(s) da arquitetura: SA_AI
- tela(s) do brief: —
- classe: admin

## Objetivo
Configurar provedor de IA, chaves, cotas, custo e fallback — a face administrativa da Fase 2.

## Pré-requisitos / Depende de
- `[[fase04-04-02]]` — acessível pelo painel do Super Admin.

## Arquivos afetados
- `src/admin/ConfigIA.dc.html` (criar) — configuração de IA.
- `src/admin/ia_config.ts` (criar) — modelo de configuração.

## Nomes & variáveis
- `provedor` (claude/gemini/openai), `chaves` (server-side), `cotas`, `custoMax`, `fallback`.
- seleção de modelo por tenant (ex.: `claude-opus-4-8` / `claude-sonnet-4-6` / `claude-haiku-4-5`).

## Interfaces / contratos
- Alimenta `ProvedorIA` ([[_contratos/tipos-core]]) e os guardrails ([[fase05-05-08]]).

## Regras de negócio
1. `SA_AI --> AIPROV` e `SA_AI --> GUARD`.
2. **Chaves nunca no cliente** (server-side only).
3. **Cotas/custo** por tenant; `fallback` entre provedores ([[fase05-05-10]]).
4. Default sem IA até configuração válida.

## Passos de implementação
1. Formulário de provedor/chave/cota/custo/fallback.
2. Validar conexão.
3. Expor a config a AIPROV.

## Estados / edge-cases
- chave inválida → IA indisponível (Motor A na prática).
- cota estourada → fallback ou Motor A.

## Critérios de aceitação / verificação
- [ ] Config alimenta AIPROV.
- [ ] Chaves não vazam ao cliente.

## Relações com outros docs
- Depende de: `[[fase04-04-02]]`
- É consumido por: `[[fase05-05-04]]`, `[[fase05-05-10]]`
- Reconcilia / conserta: —
