# A5 — Fechamento da Onda A: build, redeploy, migração e prova

**Unidade de deploy:** BUNDLE app (+ admin se A4 tocou `src/admin`) + EDGE ×2 + SQL.
**Depende de:** A1–A4 mergeadas na branch da onda.

## Objetivo
Levar a onda a produção numa única sequência: migração aplicada → edges redeployadas →
bundle(s) rebuildados e commitados com a fonte → verificação completa → registro.

## Passos (ordem importa)
1. `git rev-parse --abbrev-ref HEAD` = `onda-A-seguranca`; `git status --porcelain` limpo.
2. **SQL:** aplicar a migração da A3 (`apply_migration`), conferir `proacl`, advisors.
3. **Edges:** `deploy_edge_function` de `realizador` e depois de `proxy-ia` (ou
   `supabase functions deploy <nome>`); conferir `list_edge_functions` (versão incrementada,
   ACTIVE, `verify_jwt: true`).
4. **Bundles:**
   ```
   bun x tsc --noEmit
   bun run build:app
   bun run build:admin        # se A4 tocou src/admin/ia_global.ts
   git status --porcelain     # deve listar só os bundles + fontes desta subtarefa
   ```
5. **Testes:**
   ```
   npm test
   node tests/e2e/run-reordenar-miolo.mjs
   node tests/e2e/run-linha-verde-canonico.mjs
   node tests/e2e/run-admin.mjs
   node tests/e2e/run-geracao2-canonico.mjs
   ```
6. **Prova de produção (read-only):** `get_advisors security` sem WARN de anon;
   `select proacl …` sem anon; uma geração real (se houver config) → `pg_stat_user_functions`
   mostra chamadas da RPC; `uso_ia` incrementa.
7. **Commit:** `git add` das fontes + bundles + migração; mensagem
   `feat(seguranca): gate de consentimento na geração 2, RPC de cota fechada e usada pelas edges (varredura A)`.
   Bundle e fonte no MESMO commit.
8. Atualizar `docs/auditorias/varredura-2026-08-26.md`: marcar PS-01, PS-02, PS-03, PS-12,
   PS-14, UI-A24 como resolvidos (data + commit).

## Critérios de aceite (definição de pronto da onda)
- Tudo do "Definição de pronto" em `00-onda-A.md`.
- `git log -1 -- pipoca.bundle.js` = mesmo commit que a última fonte alterada.

## Riscos e cuidados
- Ordem SQL → edge → bundle evita janela em que a edge chama uma RPC ainda aberta a anon ou
  inexistente.
- Se o redeploy de uma edge falhar, a outra já redeployada continua compatível (ambas só
  passam a usar a RPC; a tabela `uso_ia` não muda de forma).
- Sessões paralelas: conferir a branch no output de CADA comando git.
