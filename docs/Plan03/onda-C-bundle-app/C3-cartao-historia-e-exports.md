# C3 — Remover `CartaoHistoria.dc.html` (órfão) e exports mortos de `historias.ts`

> Status: pendente

**Unidade de deploy:** CRU (remoção de `.dc.html`) + BUNDLE app (exports).
**Depende de:** C2 (para não apagar algo que a estante nova decidiu reaproveitar).
**Desbloqueia:** —.

## Objetivo
Tirar do repo o componente de cartão do modelo antigo e as exportações sem consumidor —
depois que a estante nova existe.

## Por quê (evidência)
- `src/componentes/CartaoHistoria.dc.html` (179 linhas): nenhuma das 22 tags `dc-import` do repo
  o monta (lista completa verificada: Shell, AdminShell, IaToggle, Tela2..7, Onboarding,
  PainelEvolucao, LoginFamilia, PainelCuidador, Perfis, Limites, Regras, Privacidade,
  ContaCuidador, PainelA11y, LeitorHistoria, PedirGenero, PortaoParental). O próprio cabeçalho
  (`:3-6`) declara-o órfão; `docs/plans02/analise-superficies-leitura.md:100` também. Carrega o
  default legado "A Joana viu um vaga-lume…" (`:76`) — resíduo de identidade catalogado em
  `docs/plans02/analise-modularidade-identidade.md:135` (C8).
- `src/core/historias.ts:63` `OrigemHistoria` (interface) — zero consumidores fora do arquivo.
- `src/core/historias.ts:51` `MAX_INTERMEDIARIAS_NAO_FAVORITAS` — zero consumidores externos
  **hoje**; C1 pode passar a usá-lo (checar antes de remover).

## Escopo (arquivos)
- `src/componentes/CartaoHistoria.dc.html` (remover).
- `src/core/historias.ts:51,63` (remover export ou tornar interno).
- `docs/guia-do-codigo/20-app-e-telas.md` se listar o componente (grep `CartaoHistoria docs/`).

## Passos
1. `grep -rn "CartaoHistoria" src/ index.html admin.html tests/` → deve retornar só o próprio arquivo.
2. `git rm src/componentes/CartaoHistoria.dc.html`.
3. `OrigemHistoria`: remover `export` (manter tipo interno se usado no arquivo) ou apagar.
4. `MAX_INTERMEDIARIAS_NAO_FAVORITAS`: `grep -rn` após C1; se sem consumidor, remover o `export`.
5. Atualizar o guia se citado.

## Critérios de aceite
- `bun x tsc --noEmit` limpo; `npm test` verde; e2e linha-verde verde.
- `grep -rn "CartaoHistoria" .` → só em `docs/` histórico.

## Verificação
```
bun x tsc --noEmit && npm test && node tests/e2e/run-linha-verde-canonico.mjs
```

## Riscos e cuidados
- Se C2 decidiu usar `CartaoHistoria` como base do cartão novo, esta subtarefa vira "renomear e
  atualizar" em vez de remover.

## Decisões do dono (default)
- Remover (default) vs manter como referência histórica em `old/` (a pasta existe vazia).
