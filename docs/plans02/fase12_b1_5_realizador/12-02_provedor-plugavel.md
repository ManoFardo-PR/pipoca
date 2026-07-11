# fase12 · 12-02 · Provedor de LLM plugável

> ✅ **STATUS · 2026-07-10 · IMPLEMENTADA** — `ProvedorRealizador` em `src/core/realizador/provedor_realizador.ts:36` (gerarTexto → texto+metadados com modelo/tentativas/duração/tokens); adaptador Gemini keyless (`apiKey` por parâmetro, :89) reusando o `Transporte` injetável de `src/ia/provedor.ts:70-83`; recusa tipada antes de ler conteúdo. Grep de chave em `src/` segue zero. Deploy edge é fase 13. Roteiro: ../TRILHA-plans02.md

## Identidade
- id: `fase12-12-02`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Especificar a interface de provedor do realizador — entrada texto+config, saída texto+metadados, implementações intercambiáveis — e o mapa do que se reutiliza da infraestrutura de IA já existente no repo.

## Pré-requisitos / Depende de
- `[[fase12-12-00]]` — o contrato do realizador que consome esta interface.

## Arquivos afetados
PLANEJADO: `src/core/realizador/provedor_realizador.ts` (proposta). A infraestrutura EXISTENTE citada abaixo não é tocada nesta fase; reuso é por import ou por padrão, decidido na implementação.

## Nomes & variáveis
- `ProvedorRealizador` — a interface planejada: `gerarTexto(prompt, config) → { texto, metadados }` (metadados: modelo, tentativas, duração, tokens quando disponível).
- Reaproveitados do código existente (citados por caminho, geração 1):
  - `ProvedorIA` — a interface do fluxo do Motor B (`src/ia/provedor.ts:16-24`): `gerar(prompt, schema, opts) → Promise<Trecho>` — tipada ao `Trecho` do Motor B, NÃO serve crua ao realizador (que produz prosa longa, não trechos).
  - `Transporte` / `transportePadrao` (`src/ia/provedor.ts:70-83`) — o transporte injetável, já reutilizado por todo o backend: REUTILIZAR.
  - `criarOrquestrador` (`src/ia/orquestrador.ts:35`) — cadeia primário→fallbacks com cota/custo: precedente direto da cascata ([[fase12-12-04]]).
- Reaproveitados com grafia idêntica: `realizar`, `opcoes` ([[fase12-12-00]]).

## Interfaces / contratos

### A interface planejada
```jsonc
// ProvedorRealizador
// gerarTexto(prompt: string, config: { modelo, temperatura, maxTokens? }) →
{ "texto": "…", "metadados": { "modelo": "…", "tentativas": 1, "duracaoMs": 0 } }
```
O realizador NÃO sabe qual provedor está atrás da interface — trocar Gemini/Claude/OpenAI/DeepSeek não muda uma linha do realizador (mesmo princípio da interface única do Motor B, `src/ia/provedor.ts:1-10`).

### Mapa de reuso (VERIFICADO no repo)

| peça existente | onde | veredicto para o realizador |
|---|---|---|
| `Transporte`/`transportePadrao` | `src/ia/provedor.ts:70-83` | REUTILIZAR — transporte injetável (testes com fake, produção com fetch) |
| Padrão edge/proxy | `functions/proxy-ia/index.ts` — Supabase Edge Function (`Deno.serve` :243); chaves SÓ como secrets (`SECRET_POR_PROVEDOR` :121-126, `Deno.env.get` :154-156); servidor decide provedor/modelo do `config_ia` (:266-270); cota verificada ANTES da chamada (:272-277) | REUTILIZAR O PADRÃO — o realizador ganha rota própria no proxy (ou proxy irmão), mesma disciplina |
| Cliente keyless | `src/backend/proxy_ia.ts:27` (`criarProxyIA`; só o bearer do usuário :41) e `provedorViaProxy` :54-60 | REUTILIZAR O PADRÃO |
| `criarOrquestrador` | `src/ia/orquestrador.ts:35` (cadeia + cota/custo :60-84) | PRECEDENTE da cascata do [[fase12-12-04]] (adaptar à interface nova) |
| Guardrails | `src/ia/guardrails.ts` (embrulho em `selecionar.ts:43`); espelho lite no proxy (`index.ts:34-48`) | REUTILIZAR O PADRÃO (entrada e saída filtradas) |
| Recusa de provedor | `ErroRecusaProvedor` (`src/ia/provedor.ts:38-43`); SAFETY do Gemini vira recusa ANTES de ler conteúdo (`src/ia/adaptadores/gemini.ts:60-66`) | REUTILIZAR — recusa é falha de PROVEDOR na política do 12-04 |
| `ProvedorIA` → `Trecho` + `TRECHO_JSON_SCHEMA` + `montarPrompt`/`PROMPT_BASE` | `src/ia/provedor.ts:22-35`, `src/ia/prompt.ts` | FLUXO ANTIGO (Motor B) — não reusar cru; o realizador tem prompt e shape próprios |

### Chaves e configuração
- **Chave NUNCA no cliente** — fato verificado: grep por chaves de API em `src/` = zero ocorrências; os adaptadores existentes são explicitamente keyless (`src/ia/adaptadores/gemini.ts:6-8`); as 4 chaves reais vivem como secrets da Edge Function (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY` — `functions/proxy-ia/index.ts:3-4,121-126`).
- Config via env no servidor; o `.env`/`.env.example` da raiz é do EXPERIMENTO (`.env.example:1-15` — `GEMINI_API_KEY`, `GEMINI_MODEL`, `OPENAI_API_KEY` etc.), precedente de FORMATO, não de runtime.

## Regras de negócio
1. **Plugável de verdade:** o realizador conhece só `ProvedorRealizador`; provedores concretos são detalhe de implementação atrás da interface.
2. **Chave só em edge/proxy** — invariante herdado e verificado; qualquer PR que ponha chave em `src/` está errado por definição.
3. **Servidor decide o modelo em produção** (precedente `config_ia`); `opcoes` do realizador com provedor/modelo explícitos é para teste/calibração.
4. **Recusa ≠ erro de rede:** recusa (SAFETY/refusal) e falha técnica são sinais distintos para a política de falha ([[fase12-12-04]]).
5. **Metadados sempre:** toda chamada retorna modelo/tentativas/duração — a calibração ([[fase12-12-05]]) e a telemetria dependem disso.

## Passos de implementação
1. Declarar `ProvedorRealizador` e um provedor fake determinístico para testes.
2. Implementar o provedor real via padrão proxy/edge (rota própria; secrets no servidor).
3. Adaptar o padrão do orquestrador à interface nova (consumido por [[fase12-12-04]]).
4. Testes: nenhum header de chave sai do cliente (precedente: `src/ia/ia.test.ts:236-237` assere exatamente isso no fluxo antigo).

## Estados / edge-cases
- Provedor atrás do proxy indisponível (5xx/timeout) → falha de PROVEDOR → cascata ([[fase12-12-04]]).
- Recusa de conteúdo (SAFETY) → falha de PROVEDOR com marca de recusa; nunca reapresentar o mesmo prompt ao mesmo modelo na mesma cascata.
- Resposta sem texto ou JSON malformado → falha de PROVEDOR (contrato de erros do proxy existente: 401/400/503/403/422/502, `functions/proxy-ia/index.ts:14-17`).
- Cota do tenant estourada → o proxy nega ANTES de chamar (precedente :272-277) → o realizador cai para o fallback final sem gastar tentativa de LLM.

## Critérios de aceitação / verificação
- [ ] Interface `ProvedorRealizador` declarada (entrada texto+config, saída texto+metadados).
- [ ] Mapa de reuso completo com veredicto por peça e caminho:linha.
- [ ] Invariante da chave (nunca no cliente) registrado com a evidência (grep zero + secrets do proxy).
- [ ] Distinção recusa × falha técnica registrada e apontada para o 12-04.

## Relações com outros docs
- Depende de: `[[fase12-12-00]]`
- É consumido por: `[[fase12-12-04]]` (a cascata orquestra provedores desta interface), `[[fase12-12-01]]` (o prompt montado entra por aqui)
- Reconcilia / conserta: —
