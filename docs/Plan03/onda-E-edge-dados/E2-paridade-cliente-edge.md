# E2 — Paridade cliente↔edge: script que falha se divergir; canônico dos guardrails; gramática

**Unidade de deploy:** nenhuma (script + testes) — roda no CI (D8). **Depende de:** nada
(D8 para o CI). **Desbloqueia:** E3, D4 (decisão sobre `guardrails.ts`).

## Objetivo
As tabelas duplicadas entre `src/` e `functions/` deixam de derivar em silêncio: um script
compara e falha; a fonte de verdade dos guardrails fica decidida; a gramática espelhada tem teste.

## Por quê (evidência — DM-D)
| Tabela | Cópias |
|---|---|
| `MAXIMO_PALAVRAS` | `src/core/realizador/prompt_template.ts:55` × `functions/realizador/index.ts:193` |
| `ANCORAS_POR_OBJETO` | `validador.ts:56` × `functions/realizador/index.ts:206` |
| guardrails `RE_TERMOS` + `RE_URL/EMAIL/TELEFONE` | `src/ia/guardrails.ts:53,60+` × `functions/proxy-ia/index.ts:70,73-75` × `functions/realizador/index.ts:82,85-87` (**3 cópias**, conteúdo hoje idêntico) |
| `SECRET_POR_PROVEDOR` | `admin-chaves-ia:93` × `proxy-ia:199` × `realizador:337` (só em `functions/`) |
| `MODELO_PADRAO` | `proxy-ia:193` × `realizador:331` × `src/admin/ia_config.ts:41` × `ia_global.ts:45` (**já divergiu** — alinhado em A4) |
| 6 limiares do validador (`TETO_CRESCIMENTO`, `LIMIAR_*`, `SUFIXOS_PRETERITO`, `PRESENTES_EM_OU`) | `validador.ts:41-50` × `functions/realizador/index.ts:199-204` (até mensagens de erro copiadas) |
| `TERMOS_CORPO`/`ADJ_F`/`ADJ_M` | `validador.ts:67,74,75` × `functions/realizador/index.ts:215,220,221` |
| `PROVEDORES` | `src/admin/ia_global.ts:50` × `functions/admin-chaves-ia/index.ts:90` |
| gramática de condições (intra-src) | `src/core/composicao.ts:200-231` × `src/core/compositor/gramatica.ts:40-69` ("divergir aqui quebra a paridade", `gramatica.ts:19`) |
- As edges são self-contained por decisão (`functions/realizador/index.ts:23-24`: "nada importado
  do repo (Deno); fica FORA de src/") — espelho é o padrão; o que falta é **verificação**.
- `src/ia/guardrails.ts` é morto no cliente (D4) mas declarado "o CANÔNICO" pelas 2 edges
  (`proxy-ia:31,44,69`; `realizador:81`).

## Escopo (arquivos)
- Novo `scripts/paridade-edge.mjs`.
- `src/core/compositor/gramatica.test.ts` (ou caso em `compositor.test.ts`).
- Decisão sobre `src/ia/guardrails.ts` (mover para `src/core/seguranca/guardrails.ts` como fonte
  única exportando as regexes; edges continuam com cópia verificada).

## Passos
1. `paridade-edge.mjs`: para cada tabela, extrair o literal dos dois (ou três) arquivos por
   regex/AST leve (`node:fs` + `RegExp` sobre o texto entre `const NOME = {` e `};`), normalizar
   (JSON) e comparar; saída: tabela OK/DIVERGE com diff; `process.exit(1)` se divergir.
   Alternativa mais robusta: os literais canônicos em `src/` exportados; o script importa via
   `bun` e compara com os literais extraídos das edges.
2. Guardrails: mover as regexes para `src/core/seguranca/guardrails.ts` (puro), exportar;
   `src/ia/guardrails.ts` some (D4); as 2 edges ganham comentário apontando para o novo canônico;
   o script verifica.
3. Gramática: teste que aplica as mesmas condições (`tem:x`, `depois_de:y` …) em
   `composicao.ts` e `gramatica.ts` sobre o grafo do quintal e compara resultados.
4. `package.json`: `"check:paridade": "node scripts/paridade-edge.mjs"`; CI (D8) chama.

## Critérios de aceite
- `npm run check:paridade` verde após A4 (MODELO_PADRAO alinhado); introduzir uma divergência
  de propósito faz falhar.
- Teste de paridade da gramática verde.

## Verificação
```
npm run check:paridade
npm test
```

## Riscos e cuidados
- Extrair literais por regex é frágil a formatação — preferir a alternativa "importa do src e
  compara com a edge" e manter os literais das edges num bloco delimitado por comentários
  (`// PARIDADE:INICIO nome` … `// PARIDADE:FIM`).

## Decisões do dono (default)
- Fonte única dos guardrails em `src/core/seguranca/` (default: **sim**).
- Gerar as edges a partir do core (build) em vez de espelhar (default: **não** — mantém a
  decisão "self-contained"; a paridade verificada basta).
