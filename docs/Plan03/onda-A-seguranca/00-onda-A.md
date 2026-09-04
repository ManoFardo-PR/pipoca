# Onda A — Segurança e consentimento de IA (grupo G1)

**Fim:** nenhuma chamada a LLM sem consentimento efetivo do cuidador; a cota de IA não pode
ser inflada por terceiros; o cuidador vê a indisponibilidade ANTES de decidir.

**Por quê esta onda existe (achados):** PS-01 (o fluxo vivo de geração não lê
`modos.iaLigada` — nome+gênero da criança vão ao LLM com a IA "desligada"), PS-02 (`C.ia`
não existe → toggle inerte), PS-03 (`registrar_uso_ia` executável por `anon` e sem uso nas
edges), PS-12 (`MODELO_PADRAO` divergiu cliente↔edge), PS-14 (índices/políticas), UI-A24
(o toggle só avisa depois de ligar).

**Unidade de deploy:** BUNDLE app (`build:app`) + EDGE `realizador` e `proxy-ia` + 1 migração SQL.
Tudo converge na subtarefa A5 (um build, dois redeploys, uma migração).

## Subtarefas e ordem

| # | Arquivo | O que entrega | Depende de |
|---|---|---|---|
| A1 | `A1-gate-consentimento-cliente.md` | gate único em `_dispararRealizacao` + teste "IA desligada ⇒ realizador não chamado" | — |
| A2 | `A2-toggle-ia-honesto.md` | `provedorPronto` real + IaToggle que informa antes do gesto, em linguagem do cuidador | A1 (usa o mesmo conceito de "IA efetiva") |
| A3 | `A3-migracao-rpc-indices-politicas.md` | migração: revoke anon/authenticated na RPC, índices FK, políticas permissivas; leaked-password no painel | — |
| A4 | `A4-edges-rpc-e-modelo-padrao.md` | edges chamam a RPC; `MODELO_PADRAO` alinhado; `.env.example` documentado | A3 (a RPC precisa estar fechada e existir) |
| A5 | `A5-fechamento-onda-A.md` | build:app, redeploy ×2, migração aplicada, verificação completa | A1–A4 |

## Branch e commits sugeridos
`git switch -c onda-A-seguranca 28_08_26` (conferir HEAD antes). Um commit por subtarefa;
o bundle entra no commit da A5 junto com a última fonte.

## Definição de pronto da onda
- `get_advisors security` sem WARN de `anon` em `registrar_uso_ia`.
- `select proacl from pg_proc where proname='registrar_uso_ia'` sem `anon`.
- Teste novo verde: com `modos.iaLigada=false` (ou kill-switch), `realizador` não é chamado.
- `uso_ia` incrementado por RPC (ver `pg_stat_user_functions` ou log da edge) após uma geração real.
- 175 checks e2e + 143 unit verdes; `pipoca.bundle.js` commitado com a fonte.
