# D4 — Remoção segura: Geração 1, `roteador.ts`, `playwright.config.ts`, assets, exports, dirs vazios

> Status: pendente

**Unidade de deploy:** BUNDLE app + admin (remoções em `src/`) + CRU (assets).
**Depende de:** decisão de E3 sobre a edge `proxy-ia` (define se `src/backend/proxy_ia.ts`
sai junto). **Desbloqueia:** D5.

## Objetivo
Tirar do repo ~1.400 linhas de código + ~1.100 de teste + ~85 KB de assets **com prova de
zero uso**, sem mudar comportamento.

## Por quê (evidência — grep de importadores excluindo `*.test.*` e os 3 bundles)
| Item | Prova |
|---|---|
| `src/ia/{orquestrador,prompt,simulado}.ts` + `src/ia/adaptadores/{claude,gemini,openai,deepseek,selecionar}.ts` (~800 L) + `src/ia/ia.test.ts` (493 L) | subgrafo fechado: nenhum import a partir de `src/app/bridge.ts:49-172` nem `src/admin/bridge_admin.ts:38-124`; `criarOrquestrador`/`criarProvedorSimulado`/`selecionarAdaptador`/`envolverComGuardrails` com **0 ocorrências** nos 3 bundles; `prompt.ts` tem zero importadores (nem teste); o `montarPrompt` dos bundles é `montarPromptRealizador` (`src/core/realizador/prompt_template.ts:183`) |
| **NÃO remover:** `src/ia/provedor.ts` | 11 importadores vivos (`transportePadrao`: `backend.ts:64`, `proxy_realizador.ts:48`, `repo_supabase.ts:53-54`, `auth_supabase.ts:49-50`, `espelho_admin.ts:67`, `limites_familia.ts:44`, `flags_globais.ts:42`, `provedor_realizador.ts:35`…) |
| **Decisão (E2):** `src/ia/guardrails.ts` | morto no cliente, mas `functions/proxy-ia/index.ts:31,44,69` e `functions/realizador/index.ts:81` o declaram "o CANÔNICO" do qual são espelho |
| **Decisão (E3):** `src/backend/proxy_ia.ts` + `criarProxyIA` (`backend.ts:60,204`) | vivo (instanciado no caminho default de produção) mas sem consumidor na UI; sai se a edge `proxy-ia` for aposentada |
| `src/core/roteador.ts` (51 L) | zero importadores (cabeçalho `:5,:11` admite); o vivo é `src/core/roteador.js` (`index.html:12`, `admin.html:12`, global em `:66`); contrato **divergente** (`roteador.js:17`: assinante recebe `n`; no `.ts` não) — é armadilha |
| `playwright.config.ts` | `@playwright/test` não está em `devDependencies` (`package.json:22-24` = só `typescript`); nenhum script o invoca (`:13-17` são `node tests/e2e/run-*.mjs`); espera `*.spec.ts` que não existem; única citação: `docs/guia-do-codigo/50-testes.md:45` |
| `.thumbnail` (WebP 3 KB), `.canvas/assets/asset_-925357819.png` | zero referências |
| `attached_assets/image_1783432997224.png`, `image_1783433051494.png` (81 KB) | zero referências; **manter** `og-pipoca.png` (`landing.html:20,21,29`) e decidir `Pasted--Prompt-*.txt` (E6) |
| Exports de `src/core/perfil.ts` | após C4: remover os que C4/C9 não reativaram (`RepositorioPerfil` :152 com certeza) |
| `old/`, `docs/plans02/fase15_migracao_firebase/` | vazios e untracked (`git ls-files` vazio) — remover do filesystem |

## Escopo (arquivos)
- Os listados acima; `package.json:10` (script `test` inclui `bun run src/ia/ia.test.ts` — remover
  da cadeia); `docs/guia-do-codigo/{50-testes,10-core,00-MAPA-GERAL}.md` (citações).

## Passos
1. Confirmar a decisão de E3 (`proxy-ia`) e E2 (`guardrails.ts`).
2. `git rm` dos arquivos da tabela; ajustar `package.json` (`test`); remover `ia.test.ts` da cadeia.
3. `bun x tsc --noEmit` — corrigir imports órfãos (esperado: nenhum fora de `src/ia/`).
4. `grep -rn "src/ia/\|from \"../ia/" src/ functions/` → só `provedor.ts` (e `guardrails.ts` se ficar).
5. Atualizar o guia (D5 consolida).

## Critérios de aceite
- `tsc` limpo; `npm test` verde (cadeia sem `ia.test.ts`); 4 e2e verdes.
- Bundles rebuildados em D9 **menores** (≈ −5 ocorrências de firebase em D5, símbolos da Geração 1
  já eram 0).

## Verificação
```
bun x tsc --noEmit && npm test
node tests/e2e/run-linha-verde-canonico.mjs && node tests/e2e/run-admin.mjs
```

## Riscos e cuidados
- `src/ia/adaptadores/selecionar.ts:33-37` importa `admin/ia_config.js` — remover o arquivo não
  afeta `ia_config` (direção inversa).
- Não remover `provedor.ts` por engano de glob.

## Decisões do dono (default)
- `proxy_ia.ts`/edge `proxy-ia` (E3); `guardrails.ts` (E2).
