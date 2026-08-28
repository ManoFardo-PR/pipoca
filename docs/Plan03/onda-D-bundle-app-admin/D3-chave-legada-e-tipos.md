# D3 — Aposentar a chave legada `pipoca.perfis.v1` (D-21) e desfazer os 2 ciclos type-only

> Status: pendente

**Unidade de deploy:** CRU (`estado.js`, `Tela2`) + BUNDLE (`src/core/persistencia`, `src/backend`).
**Depende de:** nada. **Desbloqueia:** —.

## Objetivo
Uma única chave de perfis (`pipoca.perfil.v1`) e telas que só falam com o repo; interfaces
em arquivos próprios, sem barril-que-também-é-fábrica.

## Por quê (evidência)
- Perímetro real de `"pipoca.perfis.v1"` (plural, legada): constante `src/app/estado.js:63`;
  leitor bruto `:193-195`; migração one-shot `:219-230` (disparada em `:1292`); **fallback de
  LEITURA** `:233` e **de ESCRITA** `:235,242` (`localStorage.setItem(PERFIS_KEY_LEGADO, …)` sempre
  que `_repoBase()` falha — 11 pontos `_repoBase() || _fallbackRepo`, `:259-303`); e
  `src/telas/Tela2EntradaCrianca.dc.html:102` lê `localStorage.getItem('pipoca.perfis.v1')`
  **direto**, sem passar pelo repo (ramo `else` de `componentDidMount`, `:97-105`). O comentário
  de `:218` ("a chave antiga NÃO é apagada (fallback de leitura)") está incompleto.
- Chave canônica: `src/core/persistencia/chaves.ts:29` `CHAVE_PERFIS = "pipoca.perfil.v1"`.
- Ciclos (ambos type-only, inofensivos em runtime): `src/core/persistencia/index.ts:37` importa
  `RepositorioLocalStorage` e `RepositorioLocalStorage.ts:36` faz `import type { RepositorioPersistencia } from "./index.js"`;
  `src/backend/backend.ts:60` importa `criarProxyIA` e `proxy_ia.ts:40` faz `import type { ProxyIA } from "./backend.js"`
  (interface em `backend.ts:75`).

## Escopo (arquivos)
- `src/app/estado.js:63,193-195,218-242,259-303`.
- `src/telas/Tela2EntradaCrianca.dc.html:97-105`.
- `src/core/persistencia/{index.ts,RepositorioLocalStorage.ts}` → novo `tipos.ts`.
- `src/backend/{backend.ts,proxy_ia.ts}` → novo `src/backend/tipos.ts` (se `proxy_ia.ts`
  sobreviver a E3/D4).

## Passos
1. `Tela2:97-105`: remover o ramo que lê localStorage; usar sempre `App.repo.carregarPerfis()`
   (o `else` era para bundle antigo — o bundle é atual).
2. `_fallbackRepo` (`estado.js:231-250`): escrever/ler na chave canônica via
   `Canon.persistencia`/`RepositorioLocalStorage` se disponível; se o objetivo do fallback é "sem
   Canon", gravar em `pipoca.perfil.v1` com o mesmo envelope — nunca mais na legada.
3. Manter a migração one-shot por mais uma versão (lê a legada, grava a canônica, **apaga a
   legada** ao final — hoje não apaga); remover na versão seguinte.
4. `tipos.ts` em `persistencia/` com `RepositorioPersistencia` (e demais interfaces); `index.ts`
   re-exporta; `RepositorioLocalStorage.ts` importa de `./tipos.js`. Idem `ProxyIA` em
   `src/backend/tipos.ts`.
5. Testes: migração com dados na legada → canônica preenchida e legada removida; boot sem legada
   idêntico.

## Critérios de aceite
- `grep -rn "pipoca.perfis.v1" src/` → só a migração (com apagamento) ou 0.
- `grep -rn "localStorage" src/telas/` → 0 (telas não conhecem storage).
- Nenhum `import type … from "./index.js"` circular; `tsc` limpo.

## Verificação
```
bun x tsc --noEmit && npm test
node tests/e2e/run-linha-verde-canonico.mjs   # "PINGATE (1º uso)…" zera 'pipoca.acesso.v1' e perfis — conferir chaves usadas no runner
```

## Riscos e cuidados
- O e2e linha-verde manipula chaves de localStorage diretamente (`localStorage.removeItem("pipoca.acesso.v1")`)
  — se remover perfis pela legada em algum assert, ajustar.
- Apagar a legada só depois de gravar a canônica com sucesso (`gravarItem` → `true`).

## Decisões do dono (default)
- Apagar a chave legada na migração (default: **sim**).
