# E3 — O cliente envia só o pacote; a edge monta o prompt; destino da edge `proxy-ia`; redeploy

> Status: concluída (2026-09-03 · b13911f)
**Unidade de deploy:** BUNDLE app (`src/backend/proxy_realizador.ts`) + EDGE `realizador`
(+ `proxy-ia` se aposentada). **Depende de:** E1, E2. **Desbloqueia:** D4 (remoção de
`proxy_ia.ts` se a edge for aposentada).

## Objetivo
O "pacote único" do dono: o request à IA é `{pacote, tenantId?}`; o prompt nasce no servidor
a partir dele (uma fonte de verdade, sem prompt arbitrário vindo do cliente); e a edge da
Geração 1 tem destino decidido.

## Por quê (evidência)
- Hoje o cliente monta o prompt e o envia junto: `src/backend/proxy_realizador.ts:71`
  (`montarPromptRealizador(pacote)`) e `:80` (`body: {pacote, prompt, temperatura?, tenantId?}`);
  a edge exige `prompt.system`/`prompt.user` (`functions/realizador/index.ts:464-476`) e usa o
  que recebeu (`:500-537`). Duas fontes de verdade (mudar o prompt = rebuild do bundle) e
  superfície de prompt arbitrário para quem tem sessão (mitigada pelo validador/guardrails, mas
  desnecessária).
- Edge é self-contained por decisão (`functions/realizador/index.ts:23-24`); o validador já é um
  espelho verificável (E2) — o template do prompt seguiria o mesmo padrão.
- `proxy-ia` (Geração 1): deployada v4 ACTIVE com `verify_jwt`; o cliente vivo **não** a chama
  (`proxyIA` instanciado em `src/backend/backend.ts:204-209` e devolvido em `:216`, mas
  `src/app/bridge.ts` não expõe `proxyIA`; nenhuma tela usa) — superfície e cota consumíveis sem
  uso. `src/backend/proxy_ia.ts` (`criarProxyIA`, POST `/functions/v1/proxy-ia`) é vivo apenas
  por instanciação.
- Temperatura default 0.4 na edge (`:479`), sobrescrevível pelo cliente (`corpo.temperatura`) —
  remover do contrato do cliente (se houver "tom da casa", é campo de `config_ia`).

## Escopo (arquivos)
- `src/backend/proxy_realizador.ts:60-97`; `src/core/realizador/prompt_template.ts` (fica como
  canônico e para o fallback/testes).
- `functions/realizador/index.ts:456-541` (+ bloco `PARIDADE:` com o template espelhado).
- Se aposentar: `functions/proxy-ia/` (remover do projeto via painel/CLI), `src/backend/proxy_ia.ts`,
  `backend.ts:60,204-209,216`, tipo `ProxyIA` (`:75`), `src/backend/backend.test.ts` (asserts do proxy).

## Passos
1. Edge: portar `montarPromptRealizador` (`prompt_template.ts:183-262`, incl. `FEWSHOT_POR_NIVEL`
   `:92-143`, `personalizarExemplo` `:165-181`, `DESCRICAO_NIVEL` `:40-45`, `MAXIMO_PALAVRAS`) para
   `functions/realizador/index.ts` num bloco delimitado para o script de paridade; o corpo aceito
   passa a ser `{pacote, tenantId?}`; `prompt` no corpo é ignorado (transição) e depois rejeitado.
2. Cliente: `proxy_realizador.ts` deixa de montar/enviar `prompt` e `temperatura`; mantém sessão,
   `tenantId`, e o contrato de resposta PASS-only (`:86-97`) intacto.
3. Transição segura: deploy da edge aceitando ambos → rebuild do bundle enviando só o pacote →
   segundo deploy rejeitando `prompt` (ou aceitar para sempre e ignorar — decisão).
4. `proxy-ia`: decisão abaixo. Se aposentar: remover a função no Supabase, `git rm functions/proxy-ia`,
   `proxy_ia.ts` + fábrica + tipo + testes (D4/D5 executam a remoção no repo).
5. `check:paridade` (E2) cobre o template; `smoke-realizador.mjs` verde; e2e geracao2.

## Critérios de aceite
- Corpo do POST = `{pacote, tenantId?}` (inspecionar `page.on("request")` no e2e geracao2 com
  backend fake ou log da edge).
- Edge devolve o mesmo contrato `{texto, paragrafos, veredito, origem, metadados}`.
- `npm run check:paridade` verde incluindo o template.
- Se aposentada: `list_edge_functions` sem `proxy-ia`; `grep -rn "proxy-ia\|proxyIA\|criarProxyIA" src/ functions/` → 0.

## Verificação
```
bun x tsc --noEmit && npm test && npm run check:paridade
node tests/e2e/run-geracao2-canonico.mjs
node scripts/smoke-realizador.mjs      # com secrets/config reais
```
+ `list_edge_functions` (MCP) e uma geração real observando `origem.modelo`/`metadados`.

## Riscos e cuidados
- Ordem do deploy (edge aceita ambos primeiro) evita quebrar clientes com bundle antigo em cache.
- O fallback A+ e os testes do cliente continuam usando `prompt_template.ts` — ele não morre; vira
  canônico verificado.

## Decisões do dono (default)
- Aposentar a edge `proxy-ia` (default: **sim** — sem consumidor; menos superfície e cota).
- Rejeitar `prompt` no corpo após a transição (default: **sim**).
