# D1 — Leitura híbrida do espelho remoto e desempate por `atualizado_em` (ML-1 sync, D-07)

**Unidade de deploy:** BUNDLE app + admin (`src/backend/**`). **Depende de:** nada.
**Desbloqueia:** D2.

## Objetivo
Uma história gravada num aparelho aparece no outro mesmo quando o perfil já existe
localmente; quando as duas cópias divergem, vence a mais recente por `atualizado_em`.

## Por quê (evidência)
- `src/backend/adaptadores/repo_sincronizado.ts:128-129`: `carregarHistorias` lê **só o local**;
  escrita local `await` + remoto fire-and-forget (`:130-133`), idem apagar/podar (`:134-141`).
- `src/backend/sync.ts:71-84` (`sincronizarInicial`): o remoto só entra no boot e **só para perfis
  ausentes localmente** (`:71`). Trocou de aparelho/limpou o navegador com o perfil já presente →
  as histórias que EXISTEM no banco não aparecem. Produção tem 5 histórias no espelho.
- D-07 (`docs/auditorias/frente4-mapa-envelope-coluna.md:40-42`): sync só puxa ids ausentes e faz
  "último push vence"; a coluna `atualizado_em` já existe (`rls_supabase.sql:37-45`, tabela
  `historias`: `id text PK`, `perfil_id`, `dono`, `favorita`, `criada_em`, `dados jsonb` envelope
  `pipoca.historias.v1`, `atualizado_em`).
- Remoto: `src/backend/adaptadores/repo_supabase.ts:179-190` `carregarHistorias`
  (`GET /historias?select=dados&perfil_id=eq.…&order=criada_em.desc`), `:192-205` `salvarHistoria`
  (upsert `on_conflict=id`, envelope montado em `:201`), `:207-214` apagar, `:217-227` podar.
- Local: `src/core/persistencia/RepositorioLocalStorage.ts:188-197` (ler), `:207-227` (salvar com
  poda preventiva na quota), `:242-252` (podar). Modelo puro: `src/core/historias.ts:142-177`
  (`validarHistoriaSalva`), `:197-222` (`normalizarHistorias`: dedupe por id, "última vence").
- O doc frente4 pede explicitamente: "mudança de sync com risco de regressão; fazer com teste
  dedicado".

## Escopo (arquivos)
- `src/backend/adaptadores/repo_sincronizado.ts:120-142`.
- `src/backend/adaptadores/repo_supabase.ts:179-190` (`select=dados,atualizado_em`).
- `src/backend/sync.ts:60-90`.
- `src/core/historias.ts` (helper puro `mesclarHistorias(local, remoto)`).
- Testes: `src/backend/backend.test.ts`, `src/core/persistencia/persistencia.test.ts`.

## Passos
1. Helper puro `mesclarHistorias(local: HistoriaSalva[], remoto: Array<{historia, atualizadoEm}>)`
   em `historias.ts`: união por id; conflito → maior `atualizadoEm` (remoto) vs carimbo local
   (adicionar `atualizadoEm?: number` opcional ao `HistoriaSalva`, aditivo, gravado em
   `_salvarRegistroHistoria`/`favoritarHistoria`); sem carimbo local → remoto vence se
   `favorita`/`texto` diferirem; depois `normalizarHistorias`.
2. `repo_supabase.carregarHistorias` passa a selecionar `dados, atualizado_em` e devolver o par.
3. `repo_sincronizado.carregarHistorias`: devolve o local imediatamente **e** dispara a leitura
   remota; ao chegar, mescla, grava no local (via `salvarHistoria` local, sem eco ao remoto) e
   notifica (callback/`subscribe` já existente no app: a T3 recarrega no `App.subscribe`).
   Alternativa mais simples (decisão): mesclar no `sincronizarInicial` para **todos** os perfis
   (não só ausentes) — menos reativo, zero mudança de contrato do repo.
4. `sync.ts`: remover a condição "só perfil ausente" para histórias (manter para saves, cujo
   merge é outro problema — fora de escopo).
5. Teste "2 aparelhos": repo A (local com h1) + remoto (h1 favorita atualizada em B, h2 nova) →
   `carregarHistorias` em A devolve h1 favorita + h2; conflito com carimbo local mais novo → local
   vence. Teste de regressão: sem remoto, comportamento idêntico ao atual.

## Critérios de aceite
- Teste "2 aparelhos" verde; e2e linha-verde seção "Histórias salvas" verde (é o caminho local).
- Smoke manual: 2 navegadores contra o Supabase real (backend supabase): história gravada no 1º
  aparece no 2º após reload.

## Verificação
```
bun x tsc --noEmit && npm test
node tests/e2e/run-linha-verde-canonico.mjs
```

## Riscos e cuidados
- Eco: a mescla grava no local — **não** reenviar ao remoto (evitar loop de upsert).
- Quota do localStorage: a poda preventiva de `RepositorioLocalStorage:207-227` já existe — a
  mescla deve passar por ela.
- Não tocar D-09/D-10 (preservação de envelope desconhecido) — já resolvidos.

## Decisões do dono (default)
- Leitura reativa no repo (default) vs mescla só no boot.
