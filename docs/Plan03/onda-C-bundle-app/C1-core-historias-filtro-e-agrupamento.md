# C1 — Core de histórias: só completas na estante, agrupamento por dia (helpers puros)

> Status: concluída (2026-09-01 · 582a06a)
**Unidade de deploy:** BUNDLE app (`src/core/historias.ts`, `src/app/bridge.ts`).
**Depende de:** nada. **Desbloqueia:** C2, C3.

## Objetivo
Fornecer, no core puro e testado, o que a estante precisa: uma lista de exibição sem as
intermediárias (ou com elas colapsadas) e um agrupamento "hoje / ontem / há N dias".

## Por quê (evidência)
- `normalizarHistorias` (`src/core/historias.ts:197-222`) devolve completas **e** intermediárias
  misturadas, ordenadas por `criadaEm` desc, com tetos separados (`MAX_NAO_FAVORITAS` :44 = 30;
  `MAX_INTERMEDIARIAS_NAO_FAVORITAS` :51 = 30).
- O app grava uma intermediária **a cada rodada lida**: `src/app/estado.js:1078-1082` →
  `_capturarHistoriaIntermediaria` (:1217-1225) → `_salvarRegistroHistoria` (:1157-1194, campo
  `intermediaria` em :1181). Uma sessão de 4 rodadas gera ~3 cartões quase idênticos ao lado da
  história completa — na T3 aparece como duplicação/bug.
- A T3 já normaliza na exibição: `Tela3SelecaoCenario.dc.html:119-121` chama
  `Canon.historias.normalizarHistorias(lista, Date.now())` e monta `cartoesHistorias` em `:262-271`.
- `dataRelativa(criadaEm, agora)` (`historias.ts:235-240`) devolve "hoje"/"ontem"/"há N dias" —
  só rotula o cartão; não há agrupamento.
- Produção hoje: 5 histórias (3 completas, 2 intermediárias) — o ruído já existe com uso mínimo.
- `historias.ts` é puro (cabeçalho :15,30), com teste dedicado em `src/core/persistencia/persistencia.test.ts`
  e cobertura de retenção no e2e linha-verde ("poda de 20 dias…", "favorita de 21 dias fica").

## Escopo (arquivos)
- `src/core/historias.ts` (novos exports; tipos `HistoriaSalva` :71-100 já têm `intermediaria?`).
- `src/app/bridge.ts:233-241` (grupo `historias`: adicionar os helpers).
- Teste: `src/core/persistencia/persistencia.test.ts` (ou `src/core/historias.test.ts` novo,
  incluído no script `test` do `package.json:10`).

## Passos
1. `apenasCompletas(lista: HistoriaSalva[]): HistoriaSalva[]` — filtra `intermediaria !== true`.
   Alternativa (decisão): `colapsarIntermediarias(lista)` que agrupa intermediárias pela
   `rodada`/linha da completa correspondente (campo `rodada` :82-99) como "rascunhos".
2. `agruparPorDia(lista, agora): Array<{ rotulo: string; historias: HistoriaSalva[] }>` usando
   `dataRelativa` como chave e preservando a ordem desc.
3. Expor os dois em `bridge.ts` no grupo `historias` (ao lado de `normalizarHistorias`, `dataRelativa`).
4. Testes: intermediárias saem/colapsam; agrupamento estável; favoritas intermediárias (se
   existirem) seguem a mesma regra de exibição.
5. Não mudar `normalizarHistorias` nem a poda: o armazenamento continua igual (as intermediárias
   têm valor para retomar a história — "salvo === lido").

## Critérios de aceite
- `npm test` verde com os casos novos; `bun x tsc --noEmit` limpo.
- Nenhuma mudança de comportamento na persistência (e2e linha-verde seção "Histórias salvas").

## Verificação
```
bun x tsc --noEmit
npm test
node tests/e2e/run-linha-verde-canonico.mjs
```

## Riscos e cuidados
- `MAX_INTERMEDIARIAS_NAO_FAVORITAS` está marcado como export morto (DM-A) — com C1 ele pode
  passar a ser consumido; **não podar em C3 sem checar**.
- Mudança em `bridge.ts` exige `build:app` (C12).

## Decisões do dono (default)
- Intermediárias somem da estante (default) ou viram "rascunhos" colapsados.
