# D6 — Branches mergeadas, `.gitignore`, `post-merge.sh`

> Status: concluída (2026-09-03 · fc66881)
**Unidade de deploy:** nenhuma (git/config). **Depende de:** nada. **Desbloqueia:** —.

## Objetivo
Navegação de branches limpa; `.gitignore` que cobre o que o repo produz; hook do Replit sem
no-op caro.

## Por quê (evidência)
- `git branch -a`: 21 locais / 30 remotas. `git branch --merged 28_08_26` lista **18 locais já
  mergeadas**: `analise/ciclo-perfil`, `analise/modularidade-identidade`, `analise/realizacao-producao`,
  `analise/superficies-leitura`, `chore/fechar-fase10-status`, `docs/guia-do-codigo`,
  `exp/recalibracao-validacao-fase10`, `feat/fase02-03-telas`, `feat/fase04-admin`,
  `feat/fase05-ia-fala`, `feat/fase06-backend`, `feat/fase11-compositor`, `feat/fase12-realizador`,
  `feat/fase13-integracao`, `fix/geracao2-em-producao` (**checked-out em outro worktree** — não
  deletável agora), `fix/identidade-personagem`, `fix/paragrafos-leitura`, `main`. Não mergeadas:
  `26_08_2026`, `feat/fase15-migracao-firebase` (abandonada). Remotas órfãs adicionais:
  `origin/chore/migracao-pendente-supabase`, `origin/chore/trilha-*`, `origin/exp/validacao-em-escala-fase10`,
  `origin/feat/{admin-espelho-postgrest,kill-switch-global,telemetria-retencao-remota,teto-perfis-app,vinculo-conta-tenant}`.
- `.gitignore` = 3 linhas (`.env`, `.env.*.local`, `node_modules/`). Não cobre `.thumbnail`,
  `.canvas/`, `.agents/` (se o Replit recriar), `dist`/saídas de teste, `*.log`.
- `scripts/post-merge.sh` é hook do Replit (`.replit:41-43` `[postMerge] path = "scripts/post-merge.sh"`),
  **não** do git (`.git/hooks` só tem `.sample`); conteúdo `npm install --legacy-peer-deps` — a
  única devDependency é `typescript` (`package.json:22-24`). Não remover o arquivo (o `.replit`
  referencia o path).

## Passos
1. Conferir a branch atual e o worktree de `fix/geracao2-em-producao` (`git worktree list`).
2. Apagar locais mergeadas (exceto a atual, `main` e a que está em worktree):
   `git branch -d <nome>` (o `-d` recusa se não mergeada — segurança).
3. Remotas: para cada mergeada em `origin/main` ou `origin/28_08_26`
   (`git branch -r --merged origin/28_08_26`), `git push origin --delete <nome>` **só após o dono
   confirmar a lista** (ação externa e irreversível para quem não tem clone).
4. `feat/fase15-migracao-firebase`: apagar local e remota (decisão registrada de abandono) —
   ou manter como tag `arquivo/fase15-firebase` antes de apagar.
5. `.gitignore`: acrescentar `.thumbnail`, `.canvas/`, `.agents/` (se recriado), `*.log`,
   `.DS_Store`, `Thumbs.db`, saídas de screenshots se algum script as gerar no repo.
6. `post-merge.sh`: trocar por `bun install` (ou `npm ci`) só se houver lockfile útil; caso
   contrário, `echo "nada a instalar"` — manter o arquivo.

## Critérios de aceite
- `git branch --merged 28_08_26` → só a atual, `main` e a do worktree.
- `.gitignore` cobre os artefatos listados; `git status` limpo após rodar o harness de screenshots.

## Verificação
```
git branch -a | wc -l
git status --porcelain
```

## Riscos e cuidados
- Sessões/worktrees paralelos: **nunca** `-D` (force); `-d` recusa o que não está mergeado.
- Deleção remota é irreversível para terceiros — lista explícita aprovada antes.

## Decisões do dono (default)
- Apagar remotas mergeadas (default: **sim, após lista aprovada**); tag antes de apagar a
  fase15 (default: **sim**).
