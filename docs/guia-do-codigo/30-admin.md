# 30 · admin

← [Mapa geral](00-MAPA-GERAL.md) · [Glossário](90-GLOSSARIO.md)

A plataforma do operador (super-admin). Mora em [`src/admin/`](../../src/admin/).
O app da criança nunca carrega este bundle e vice-versa.

## Como o admin sobe (boot)

[`admin.html`](../../admin.html):

```
admin.html
   → support.js
   → src/core/roteador.js
   → pipoca.config.js
   → pipoca.admin.bundle.js   (bundle gerado de src/admin/bridge_admin.ts)
   → src/admin/estadoAdmin.js  (window.PipocaAdmin — estado do operador)
   → monta <dc-import name="AdminShell">
```

## A fronteira da família

- [`bridge_admin.ts`](../../src/admin/bridge_admin.ts) — bundlada por
  `bun run build:admin` em [`pipoca.admin.bundle.js`](../../pipoca.admin.bundle.js);
  expõe `window.PipocaAdminCanonico` (auth, rotas, tenants, conteúdo, ia, iaGlobal,
  flags, backend). É o **único** importador de
  [`src/backend/espelho_admin.ts`](../../src/backend/espelho_admin.ts) (o espelho
  remoto admin-only) — por isso nenhum código de admin vaza para o bundle da criança.
- [`estadoAdmin.js`](../../src/admin/estadoAdmin.js) — `window.PipocaAdmin`, estado do
  operador + guarda de navegação **fail-closed** (sem auth → login).

## Arquivos

- [`rotasAdmin.ts`](../../src/admin/rotasAdmin.ts) — tabela de rotas `SA_*` + `guardarRotaAdmin`.
- Auth (super-admin):
  [`auth/autenticacaoSuperAdmin.ts`](../../src/admin/auth/autenticacaoSuperAdmin.ts) (login, lockout),
  [`auth/sessaoSuperAdmin.ts`](../../src/admin/auth/sessaoSuperAdmin.ts) (sessão + escopos),
  [`auth/tiposAdmin.ts`](../../src/admin/auth/tiposAdmin.ts) (tipos).
- _Tenants_ (multi-inquilino):
  [`tenant/repositorioTenant.ts`](../../src/admin/tenant/repositorioTenant.ts) (planos, CRUD, tetos de perfil),
  [`tenant/tiposTenant.ts`](../../src/admin/tenant/tiposTenant.ts) (modelo de conta/tenant/plano).
  ⚠️ No código, `novoTenant` nasce no **Freemium** (`PLANO_INICIAL` — 60 dias com os
  limites do plano Família, IA permitida); vencido, degrada aos limites do **Grátis**
  (`PLANO_MAIS_RESTRITIVO`, IA desligada). A prosa mais antiga fala em "plano mais
  restritivo" — a verdade do código é o Freemium inicial.
- [`validar_grafo.ts`](../../src/admin/validar_grafo.ts) — biblioteca de conteúdo `SA_CONTENT`:
  validação dupla dos grafos autorais + rascunho→versão→publicação.
- [`ia_config.ts`](../../src/admin/ia_config.ts) — config de IA **por tenant**
  (provedor/modelo/cota/custo/fallback). ⚠️ **Sem campo de chave** — "CHAVES NUNCA NO CLIENTE".
- [`ia_global.ts`](../../src/admin/ia_global.ts) — modelos-padrão da plataforma + cadeia de
  fallback (tarefa #31). Conhece só o **status MASCARADO** da chave.
- [`flags.ts`](../../src/admin/flags.ts) — flags globais / kill-switches (`SA_SAFE`),
  padrões seguros para criança, `aplicarFlagsAosModos`.

## Telas do admin (`.dc.html` — dados/DOM, sem cabeçalho)

`telas/AdminShell` · `telas/SaLogin` · `telas/SaHome` · `telas/SaTenant`; vistas de
topo `ConfigIA` · `Conteudo` · `IaGlobal` (painel de chaves `SA_IA_GLOBAL`) ·
`Seguranca`; componente `componentes/CartaoArea`.

## Como rodar
`bun run build:admin` gera o bundle; `bun run serve` sobe o servidor (o admin fica em
`/admin`). Cobertura e2e: `bun run test:e2e:admin` (ver [50 · testes](50-testes.md)).
A suíte unitária do admin roda em `bun run test`.
