# A1 — Gate único de consentimento no cliente

> Status: concluída (2026-08-28 · 5ecc07d)
**Unidade de deploy:** BUNDLE app (toca `src/app/estado.js` — CRU — e possivelmente
`src/app/bridge.ts`/`src/core` — BUNDLE). **Depende de:** nada. **Desbloqueia:** A2, E1.

## Objetivo
Garantir que o realizador remoto (edge `realizador`, que envia nome, gênero e nível da
criança a um provedor de LLM) só seja chamado quando a IA está **efetivamente ligada**:
autorização do cuidador (`modos.iaLigada`) **e** kill-switch global não ativo.

## Por quê (evidência)
- Cadeia viva sem nenhuma checagem: `src/telas/Tela4Heroi.dc.html:226` →
  `prepararLeituraPortao` (`src/app/estado.js:899-923`) → `_dispararRealizacao`
  (`src/app/estado.js:806-842`; a única condição é `G.realizadorRemoto` existir, :825-829) →
  `src/app/bridge.ts:197-203` (`obterBackend().realizador ?? null`) →
  `src/backend/proxy_realizador.ts:67-85` (exige só sessão) → edge.
- `grep iaLigada src/app/estado.js` → só `:77` e `:324` (escrita de default). `geracao.ts`,
  `proxy_realizador.ts`, `bridge.ts`: zero leituras. Os únicos leitores são a UI
  (`Regras.dc.html:143,236`, `IaToggle.dc.html`) e `src/admin/flags.ts:70` (kill-switch escreve
  `iaLigada=false` nos modos efetivos — mas ninguém lê).
- A doc do módulo descreve uma fábrica que não existe: `src/core/modos.ts:15` ("a fábrica lê
  esta flag (Motor A vs B)") e `:25`.
- Os e2e de flags (`tests/e2e/run-admin.mjs`: "kill-switch derruba a IA…") testam a
  propagação flags→modos, não o gate da chamada — por isso passam.
- Produção tem `uso_ia` com 2 linhas: as edges estão sendo chamadas de verdade.

## Escopo (arquivos)
- `src/app/estado.js:806-842` (`_dispararRealizacao`) — ponto do gate.
- `src/core/modos.ts` (helper puro `iaEfetiva(modos, flags)` opcional) e `src/app/bridge.ts:228`
  (`modos`) / `:273` (`flags`: `carregarFlags`, `killSwitchAtivo`, `aplicarFlagsAosModos`).
- `src/core/modos.ts:15,25` — corrigir o comentário (a fábrica não existe; o gate vive no app).
- Teste: `src/core/geracao/geracao.test.ts` (unit) e/ou `tests/e2e/run-geracao2-canonico.mjs`.

## Passos
1. Criar um helper puro no core: `iaEfetivamenteLigada(modos, flags): boolean` =
   `modos.iaLigada === true && !flags.killSwitchAtivo(flags)`. Reusar
   `aplicarFlagsAosModos` (`src/admin/flags.ts`) se ele já produz o `iaLigada` efetivo —
   verificar a assinatura antes de duplicar lógica. Expor via `bridge.ts` no grupo `modos`
   ou `flags`.
2. Em `_dispararRealizacao` (`estado.js:806`), antes de `if (G.realizadorRemoto)`:
   se `!iaEfetivamenteLigada(state.modos, flagsCarregadas)` → **não** anexar
   `opcoes.realizador` (o `gerar` cai no A+ v3 local, `geracao.ts:223-227`, com
   `origem.fonte = "fallback-a-mais"` e `motivo = "ia-desligada"`). Nenhuma outra mudança de
   fluxo: a prévia e a captura seguem iguais.
3. Registrar o motivo na observabilidade já existente (`estado.js:932-937` `_contarOrigem`),
   para o log da sessão distinguir "desligada" de "falhou".
4. Corrigir os comentários de `modos.ts:15,25` para apontar o gate real.
5. Teste unitário: `gerar(entrada, {realizador: spy})` com modos desligados ⇒ spy não chamado
   e `origem.fonte === "fallback-a-mais"`. Teste e2e (geracao2): injetar
   `PIPOCA_CONFIG` + `App.setState({modos:{...iaLigada:false}})`, entrar no portão, assertar
   que nenhuma requisição a `/functions/v1/realizador` saiu (`page.on("request")`).
6. Não tocar no default `iaLigada:false` (`estado.js:77,324`) — fail-closed continua.

## Critérios de aceite
- Com `iaLigada=false` OU kill-switch ativo: zero requisições à edge; história vem do A+ local.
- Com `iaLigada=true` e sem kill-switch: comportamento idêntico ao atual.
- `npm test` e os 4 e2e verdes; teste novo verde.

## Verificação
```
bun x tsc --noEmit
bun run src/core/geracao/geracao.test.ts
node tests/e2e/run-geracao2-canonico.mjs
node tests/e2e/run-admin.mjs
```

## Riscos e cuidados
- O `IaToggle` hoje sempre mostra "sem provedor" (PS-02): o cuidador pode ter `iaLigada=true`
  gravado sem saber — após A1 isso passa a ter efeito real. Coordenar com A2 (que torna o
  toggle honesto) na mesma onda.
- Não confundir com `modos.verificacao`/`palco` — só `iaLigada` entra no gate.

## Decisões do dono (default)
- Kill-switch também bloqueia **server-side** (edge lê `flags_admin`)? Default: **não nesta
  onda** — o gate no cliente + a cota fechada (A3/A4) bastam; anotar como follow-up.
