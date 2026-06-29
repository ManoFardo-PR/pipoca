# fase05 · 05-05 · Adaptador Anthropic Claude (CLAUDE)

## Identidade
- id: `fase05-05-05`
- nó(s) da arquitetura: CLAUDE
- tela(s) do brief: —
- classe: f2

## Objetivo
Implementar o `ProvedorIA` sobre a API da Anthropic, gerando `Trecho` válido por schema.

## Pré-requisitos / Depende de
- `[[fase05-05-04]]` — a interface `ProvedorIA`.

## Arquivos afetados
- `src/ia/adaptadores/claude.ts` (criar) — adaptador Anthropic.

## Nomes & variáveis
- `client = new Anthropic()` (`@anthropic-ai/sdk`).
- `client.messages.create({ model, max_tokens, thinking, output_config, messages })`.
- modelos: `claude-opus-4-8` (padrão), `claude-sonnet-4-6`, `claude-haiku-4-5` (selecionáveis por SA_AI).

## Interfaces / contratos
- `ProvedorIA`, `Trecho` ([[_contratos/tipos-core]]).

## Regras de negócio
1. Chamada: `messages.create({ model:"claude-opus-4-8", max_tokens, thinking:{type:"adaptive"}, output_config:{ effort, format:{ type:"json_schema", schema } }, messages })`.
2. **NÃO** enviar `temperature`/`top_p`/`budget_tokens` (dão 400 no 4.8).
3. **Tratar `stop_reason === "refusal"` ANTES de ler o conteúdo** → degradar para Motor A ([[fase05-05-08]]).
4. O `schema` força o formato do `Trecho`.
5. Chave server-side ([[fase04-04-05]]).

## Passos de implementação
1. Criar o cliente Anthropic.
2. Montar `messages` com o prompt base ([[fase05-05-02]]).
3. Pedir `output_config.format` json_schema do `Trecho`.
4. Verificar `stop_reason` e mapear erros.

## Estados / edge-cases
- `refusal` → degrada para Motor A.
- erro 4xx/5xx/timeout → fallback ([[fase05-05-10]]).

## Critérios de aceitação / verificação
- [ ] Saída válida como `Trecho`.
- [ ] `refusal` não quebra a leitura (cai no Motor A).
- [ ] Sem parâmetros proibidos no 4.8.

## Relações com outros docs
- Depende de: `[[fase05-05-04]]`
- É consumido por: `[[fase05-05-08]]`
- Reconcilia / conserta: —
