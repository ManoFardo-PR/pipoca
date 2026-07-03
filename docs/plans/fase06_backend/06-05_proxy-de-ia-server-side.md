# fase06 · 06-05 · Proxy de IA server-side

> 🟢 **STATUS · 2026-07-02 · IMPLEMENTADO (deployado; chaves via secrets)** — Edge Function `functions/proxy-ia/` DEPLOYADA no projeto real com verify_jwt (sem bearer → 401, verificado ao vivo). As chaves dos 4 provedores (Anthropic, OpenAI, Gemini e DeepSeek) vivem SÓ nos secrets da função — nenhuma no bundle (critério verificado por teste). O SERVIDOR decide provedor/modelo pela config de IA do tenant e checa cota/custo persistidos ANTES da chamada; guardrails server-side na entrada e na saída (espelho do canônico da fase05 — defesa em profundidade); fallback da config; erros limpos (401/400/403/422/502/503). Cliente `src/backend/proxy_ia.ts` + `provedorViaProxy` entram na cadeia do orquestrador: qualquer falha degrada para o provedor simulado → Motor A (a criança nunca vê erro). Sem secrets configurados o proxy responde 503 e o app segue como antes (passo manual na PARIDADE.md). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase06-06-05`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Expor as chamadas de IA por trás de um `ProxyIA` server-side (Edge/Cloud Function) para que as chaves nunca cheguem ao cliente.

## Pré-requisitos / Depende de
- `[[fase04-04-05]]` — config de provedor/chaves/cotas (SA_AI).
- `[[fase05-05-04]]` — o `ProvedorIA` que, em produção, chama este proxy.
- `[[fase06-06-01]]` — a fachada `Backend`.

## Arquivos afetados
- `src/backend/proxy_ia.ts` (criar) — cliente `ProxyIA`.
- `functions/proxy-ia/` (criar) — Edge Function (Supabase) / Cloud Function (Firebase).

## Nomes & variáveis
- `ProxyIA` — `gerar(req: { prompt, schema, opts? }): Promise<Trecho>`.
- a função server-side lê a chave do ambiente, aplica guardrails ([[fase05-05-08]]) e chama o provedor.

## Interfaces / contratos
- `ProxyIA`, `Trecho`, `ProvedorIA`, `Backend` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Chaves só no servidor** (variáveis de ambiente da função).
2. `ProvedorIA` em produção aponta para `ProxyIA`; em dev pode chamar o SDK direto.
3. **Guardrails no servidor** ([[fase05-05-08]]); refusal/inseguro → degrada p/ Motor A.
4. **Cotas/custo** verificados antes da chamada ([[fase05-05-10]]).

## Passos de implementação
1. Declarar `ProxyIA` (cliente) e a função server-side.
2. Implementar a função em Supabase Edge Function e em Firebase Cloud Function (paridade).
3. Apontar `ProvedorIA` ([[fase05-05-04]]) para `ProxyIA` em produção.

## Estados / edge-cases
- função indisponível → degrada p/ Motor A.
- cota estourada → fallback ([[fase05-05-10]]) ou Motor A.

## Critérios de aceitação / verificação
- [ ] Nenhuma chave de IA aparece no bundle do cliente.
- [ ] `ProxyIA.gerar` devolve `Trecho` válido ou degrada.

## Relações com outros docs
- Depende de: `[[fase04-04-05]]`, `[[fase05-05-04]]`, `[[fase06-06-01]]`
- É consumido por: `[[fase06-06-06]]`
- Reconcilia / conserta: —
