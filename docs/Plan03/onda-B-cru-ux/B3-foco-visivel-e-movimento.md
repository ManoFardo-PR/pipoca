# B3 — Foco visível global, movimento pelo token, admin com a11y transversal

> Status: pendente

**Unidade de deploy:** CRU (`src/tokens.css`, `index.html`, `admin.html`, componentes/telas com
transições inline). **Depende de:** B1. **Desbloqueia:** B4, B8, C11.

## Objetivo
Navegar por Tab mostra onde o foco está em qualquer tela; "reduzir movimento" desliga de fato
todo movimento (incluindo hover) pelo sistema, sem o blanket `!important`; o operador do admin
recebe as mesmas preferências de acessibilidade.

## Por quê (evidência)
- `:focus-visible`: **zero ocorrências no repo** (UI-C44). Os únicos `:focus` são inputs de telas
  adultas/admin com `outline:none` + `border-color` (`Onboarding:14`, `LoginFamilia:17`,
  `Limites:12`, `Perfis:12`, `ContaCuidador:13`, `ConfigIA:15`, `IaGlobal:16`, `Conteudo:14`,
  `SaLogin:12`, `SaTenant:12`). Botões-chave (`↩ Painel`, chips, cartões do hub, toggles) são
  `<button>` com `border:none` e nenhum estilo de foco (UI-A40). WCAG 2.4.7 falha em todo o app.
- Movimento fora do token: `PainelA11y:84` `transition:left .15s`, `Tela5:51` `transition:width .25s`,
  `Tela4:306,399` `transition:transform .12s` (UI-C50); `Tela4:16` `.pip-chip:hover{transform:translateY(-3px)}`
  não é coberto pelo blanket — com "reduzir movimento" ligado o chip continua saltando, só que
  instantâneo (UI-C51); animações infinitas por token: `Vagalume:32`, `CartaoHistoria:32` (UI-C49);
  `backdrop-filter: blur()` em 8 superfícies sem desligamento (UI-C52, opcional).
- `admin.html:21-24` tem só reset; `index.html:35-44` traz `.pip-dyslexia/.pip-contrast/.pip-reduce-motion`
  — o operador não tem nenhuma preferência (UI-A34). O admin importa `tokens.css` e usa
  `var(--pip-` zero vezes (fora 2 em `AdminShell`).

## Escopo (arquivos)
- `src/tokens.css` (novo bloco de foco; tokens de movimento).
- `index.html:35-53`, `admin.html:21-24`.
- `src/telas/Tela4Heroi.dc.html:16,306,399`, `Tela5Portao.dc.html:51`, `PainelA11y.dc.html:84`,
  `src/componentes/{Vagalume,Botao,ChipObjeto,BarraLeitura,ModalCuidador}.dc.html` (já usam `--pip-mov`).

## Passos
1. Foco global em `tokens.css`: `:where(a,button,[role=button],[role=switch],input,select,textarea,[tabindex]):focus-visible { outline:3px solid var(--pip-heeler); outline-offset:3px; border-radius: inherit }`
   e `:focus:not(:focus-visible){outline:none}`. Incluir em `admin.html` (já importa `tokens.css`).
2. Remover os `outline:none` dos inputs listados (manter o `border-color`).
3. Tokenizar as transições inline: `transition: left calc(var(--pip-dur-rapido) * var(--pip-mov))` etc.
4. Hover sob reduce-motion: `.pip-reduce-motion .pip-chip:hover{transform:none}` (ou usar
   `transform: translateY(calc(-3px * var(--pip-mov)))`).
5. Só então remover o blanket `index.html:40-44` (ou reduzi-lo a `animation-iteration-count:1`
   como rede para animações infinitas legadas).
6. `admin.html`: copiar o bloco transversal de `index.html:35-44` (versão pós-B1) e aplicar as
   classes na raiz do `AdminShell` lendo uma preferência local (`localStorage` `pipoca.admin.a11y.v1`)
   — a UI para alternar pode ficar em B11 ou ser só respeito a `prefers-*` do sistema (default).
7. `backdrop-filter` (opcional): `.pip-reduce-motion * { backdrop-filter:none }`.

## Critérios de aceite
- Tab por T2→T7 e T9→T16 e admin: anel de foco visível em todos os controles.
- `reduceMotion:true`: nenhum `transform`/`animation` ativo (inspecionar `getAnimations()` = []).
- `index.html` sem `!important` de movimento (ou só o de iteração).
- Admin respeita `prefers-reduced-motion` e `prefers-contrast` do sistema.

## Verificação
```
grep -rn "focus-visible" src/tokens.css | head
grep -rn "outline:none\|outline: none" src/ | wc -l     # deve cair
node tests/e2e/run-linha-verde-canonico.mjs
node tests/e2e/run-admin.mjs
```

## Riscos e cuidados
- Anéis de foco aparecem em toque em alguns browsers antigos — `:focus-visible` cobre; testar no tablet.
- Não remover `:focus` de campos de texto sem substituto visível.

## Decisões do dono (default)
- Admin com toggles de a11y próprios (default: **só respeitar `prefers-*` do sistema** nesta onda).
