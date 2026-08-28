# A4 — Edges: cota atômica via RPC e MODELO_PADRAO alinhado

> Status: pendente

**Unidade de deploy:** EDGE `realizador` + EDGE `proxy-ia` (redeploy na A5) + BUNDLE admin
se tocar `src/admin/ia_global.ts`. **Depende de:** A3 (RPC fechada e existente).
**Desbloqueia:** A5.

## Objetivo
As duas edges que consomem cota passam a registrar uso pela RPC atômica
`registrar_uso_ia` (o wire planejado na auditoria anterior) e param de ter um default de
modelo diferente do que o admin mostra.

## Por quê (evidência)
- `grep -rn registrar_uso_ia functions/` → 0 hits. O deploy v4 do `realizador` (fonte lido via
  MCP) confirma: `registrarUso` faz `POST /rest/v1/uso_ia?on_conflict=tenant_id,mes` com
  `chamadas: uso.chamadas + chamadas` (read-then-write; `functions/realizador/index.ts:123-143,
  524, 540`; `functions/proxy-ia/index.ts:154-174, 386-391, 420`). Duas famílias gerando em
  paralelo no mesmo tenant perdem incrementos.
- A RPC existe desde `src/backend/migrations/2026-08-28_otimizacao-rls-cascade-cota.sql:34-47`
  (`registrar_uso_ia(p_tenant, p_mes, p_custo)` — upsert atômico, `grant service_role`).
- `MODELO_PADRAO` nas edges (`functions/proxy-ia/index.ts:193-198` ≡ `functions/realizador/index.ts:331-336`):
  `{claude:"claude-haiku-4-5", openai:"gpt-5.4-mini", gemini:"gemini-2.5-flash", deepseek:"deepseek-chat"}`.
  No admin (`src/admin/ia_global.ts:45-48`): `modeloPadrao: {claude:null, gemini:"gemini-2.5-flash", openai:null, deepseek:null}`.
  O operador vê "sem modelo padrão" e a edge usa `claude-haiku-4-5` em silêncio (PS-12).
  Catálogo validado no cliente (`src/admin/ia_config.ts:41-49`) não existe na edge.
- `.env.example:9,14` documenta só `GEMINI_API_KEY` e `OPENAI_API_KEY`;
  `SECRET_POR_PROVEDOR` (3 cópias em `functions/*`) usa também `ANTHROPIC_API_KEY` e
  `DEEPSEEK_API_KEY`.

## Escopo (arquivos)
- `functions/realizador/index.ts` (`lerUso` :123, `registrarUso` :138-143, chamadas :524, :540,
  `MODELO_PADRAO` :331-336, checagem de cota :492-496).
- `functions/proxy-ia/index.ts` (`lerUso` :154, `registrarUso` :169-174, :420, `MODELO_PADRAO` :193-198).
- `src/admin/ia_global.ts:45-48` (`CONFIG_IA_GLOBAL_PADRAO.modeloPadrao`).
- `.env.example`.

## Passos
1. Nas duas edges, trocar `registrarUso(url, chave, tenant, mes, chamadasTotais, custoTotal)`
   por uma chamada à RPC com **deltas**:
   `POST {url}/rest/v1/rpc/registrar_uso_ia` body `{p_tenant, p_mes, p_custo}` com os
   headers de service role (`cabecalhosServico`). Conferir a assinatura real da função
   (a RPC incrementa `chamadas` em 1 por chamada? ou recebe o delta?) lendo o SQL :34-47 —
   adaptar: se ela incrementa 1 fixo, chamar N vezes ou estender a função (nova migração
   pequena, na A3) para receber `p_chamadas int default 1`.
2. Manter `lerUso` como está (a checagem de cota ANTES da chamada continua sendo leitura).
3. Manter o comportamento "telemetria de uso nunca derruba a geração" (catch vazio ali é
   intencional — o comentário do arquivo diz isso).
4. `MODELO_PADRAO`: decidir a fonte de verdade (decisão abaixo) e aplicar nos 3 lugares
   (`proxy-ia`, `realizador`, `ia_global.ts`). Default recomendado: **edge fail-closed como o
   admin** — se `config.modelo` for `null` e não houver default explícito no global, retornar
   `503 nao_configurado` em vez de escolher um modelo escondido. Isso mantém a promessa
   "sem configuração válida, o tenant fica SEM IA".
5. `.env.example`: adicionar `ANTHROPIC_API_KEY=` e `DEEPSEEK_API_KEY=` com comentário de
   que vivem só nos secrets das edges.
6. Não redeployar aqui — A5 faz o redeploy das duas edges de uma vez.

## Critérios de aceite
- Após uma geração real (ambiente de teste com `config_ia` válida), `uso_ia.chamadas`
  incrementa via RPC (`select * from pg_stat_user_functions where funcname='registrar_uso_ia'`
  mostra `calls > 0`).
- Nenhum `POST /rest/v1/uso_ia` restante nas edges (grep).
- Admin e edge concordam sobre o modelo efetivo (screenshot de SA_IA_GLOBAL vs `origem.modelo`
  na resposta da edge).

## Verificação
```
grep -rn "rest/v1/uso_ia\|registrar_uso_ia\|MODELO_PADRAO" functions/ src/admin/
bun run src/admin/admin.test.ts
node scripts/smoke-realizador.mjs      # exige secrets/config reais — opcional
```

## Riscos e cuidados
- Sem paridade automática entre `src/` e `functions/`, esta é exatamente a classe de deriva da
  DM-D; a subtarefa E2 cria o script de paridade — até lá, conferir à mão os 3 arquivos.
- Alterar o default de modelo pode "desligar" a IA de um tenant que dependia do default
  escondido: checar `config_ia` real (3 linhas em prod) antes de decidir.

## Decisões do dono (default)
- Fonte de verdade do modelo padrão: admin fail-closed (default) vs edge com default explícito
  documentado no admin.
- Estender a RPC para receber `p_chamadas` (default: sim, se a função hoje incrementa 1 fixo).
