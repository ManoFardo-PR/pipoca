# 60 · scripts

← [Mapa geral](00-MAPA-GERAL.md) · [Glossário](90-GLOSSARIO.md)

Ferramentas fora do runtime do app. A antiga pasta de experimentos (bancadas de
calibração beats→prosa e fichas→histórias) foi removida do repositório — o
capítulo antigo (60-scripts-e-experimentos) descrevia código que não existe
mais; o que era offline e testável já tinha sido promovido ao runtime canônico
(`src/core/realizador/`).

## ⚠️ O que GASTA API paga vs o que é OFFLINE

| GASTA dinheiro (chama LLM pago) | Offline / grátis |
|---|---|
| [`scripts/smoke-realizador.mjs`](../../scripts/smoke-realizador.mjs) (edge de produção) | [`scripts/plan03.mjs`](../../scripts/plan03.mjs) (monitor do Plan03) |
| | [`scripts/post-merge.sh`](../../scripts/post-merge.sh) (hook `npm install`) |

## O smoke de produção

- [`scripts/smoke-realizador.mjs`](../../scripts/smoke-realizador.mjs) — **⚠️ GASTA API
  paga.** POSTa um _Pacote_ real na edge `realizador` **de produção**, que chama o LLM
  pago. Prova que a edge COMPLETA uma realização de verdade: assere `origem.fonte ===
  "llm"` (não fallback) e `veredito.pass === true`. O script em si é keyless.
  Roda por: `node scripts/smoke-realizador.mjs` com env `SUPA_URL` / `ANON_KEY` /
  `SMOKE_EMAIL`. **Não há script npm** para ele — é manual, de propósito.

## O monitor do Plan03

- [`scripts/plan03.mjs`](../../scripts/plan03.mjs) — fonte de verdade do progresso do
  plano de execução pós-varredura (`docs/Plan03/`): `status`, `proximo`,
  `iniciar`/`concluir`, `verificar` (tsc + unit + e2e), `gate`, `relatorio`.
  Offline; regenera `docs/Plan03/STATUS.md`.

## Hook de merge

- [`scripts/post-merge.sh`](../../scripts/post-merge.sh) — conveniência de pós-merge
  (instalação de dependências). Ver [D6](../Plan03/onda-D-bundle-app-admin/D6-branches-gitignore-hooks.md)
  para o estado atual dos hooks.
