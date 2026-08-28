# B2 — Paleta com contraste real, tokens iguais ao desenho praticado, escala tipográfica

> Status: concluída (2026-08-28 · 8050627)
**Unidade de deploy:** CRU (`src/tokens.css` + as telas que trocam hex por `var()`).
**Depende de:** B1. **Desbloqueia:** B4, C2, C8 (reusam os tokens novos).

## Objetivo
Nenhum texto do app abaixo de 4,5:1 (3:1 para UI/texto grande), corrigido **nos tokens**
(um ajuste conserta todas as telas), e `tokens.css` passando a descrever o desenho que as
telas realmente praticam — para que voltar a usar tokens não "quebre" o visual.

## Por quê (evidência — razões calculadas dos hex reais)
| Par | Onde | Razão |
|---|---|---|
| `#fff` / gradiente `#e8965a→#d5713f` | **todo CTA**: `Tela3:54`, `Tela5:81,96`, `Tela6:63`, `Tela7:245,255`, `PainelA11y:63` | **2,35–3,35:1** ✗ |
| `rgba(122,106,84,.55)` / `#f6e3bf` | ordinais "1º 2º 3º", `Tela4:292` | 1,74:1 ✗ |
| `#e89132` / `#fff3da` | vaga-lume escuro sobre fundo âmbar (par nominal do token) | 2,24:1 ✗ |
| `#fff` / `#7da94f` | "🌱 Leu sozinho", `Tela5:96,120` | 2,74:1 ✗ |
| `#9a8a72` / `#fffdf7` | microcópia 11–13px: `PainelA11y:34,42,50,58`, `Tela3:79,96`, `Tela4:101`, `Tela5:48` | 3,30:1 ✗ |
| `#8a7a64` / `#f9eed8` | subtítulos: `Tela3:41`, `Tela7:79`, `Tela4:47` | 3,62:1 ✗ |
| `#b8693c` / `#fff3da` | contador de vaga-lumes em T3/T4/T5/T6/T7 | 3,72:1 ✗ |
| `#fff` / `#c8956c` | selo "🔒 âncora" a 10px, `Tela4:62` | 2,63:1 ✗ |
| `#3a2c20` / `#f6ecd7` | tinta/creme | 11,5:1 ✓ |
| `#fff` / `#3f6f9e` | branco/heeler | 5,3:1 ✓ |
- `tokens.css:42-45` tem 4 famílias de fonte e **nenhum** token de tamanho/entrelinha.
- Os tokens divergem do praticado: `--pip-raio-2`=16px vs 22px em todo cartão real;
  `--pip-creme`=`#f6ecd7` vs `#fffaf0` escrito nas telas adultas; `#b8693c` (terceira
  terracota) vive em `landing.html:95` e `PainelCuidador:35` sem token (UI-A33/A35).
- `IaToggle.dc.html` é o único arquivo 100% tokenizado e por isso parece "de outro app" —
  prova de que a correção é nos tokens, não no arquivo (UI-A12).

## Escopo (arquivos)
- `src/tokens.css` (paleta :8-39, tipografia :42-45, raios :55-58).
- Telas da criança onde os hex acima aparecem (substituir por `var()`): `Tela3:24,41,54,79,96`,
  `Tela4:47,62,101,292`, `Tela5:48,70,81,96,120`, `Tela6:52,63`, `Tela7:28,79,91,245,255`,
  `PainelA11y:34-63`.
- Opcional nesta subtarefa: `landing.html:95` e `PainelCuidador:35` (`#b8693c` → token).

## Passos
1. Novos/ajustados tokens: `--pip-cta` (gradiente começando em ≥`#c9622f`, texto branco ≥4,5:1)
   ou CTA com texto `var(--pip-tinta)`; `--pip-texto-suave` (≥`#6b5b44` sobre creme, ~5:1) para
   microcópia; `--pip-terracota-texto` (`#b8693c` → versão ≥4,5:1 sobre `#fff3da`, ex. `#9a4f1c`);
   `--pip-folha-texto` para "Leu sozinho"; ordinais com `--pip-texto-suave` sólido (sem rgba).
2. Aproximar os tokens do desenho praticado: `--pip-raio-3` = 22px (ou novo `--pip-raio-cartao`),
   `--pip-creme` conferido contra as telas — decidir por um valor e usá-lo.
3. Escala tipográfica: `--pip-fs-1..6` e `--pip-lh-*` (ex.: 12/13.5/15/17/22/26px) e aplicar nos
   arquivos tocados acima (não é obrigatório varrer todas as telas agora — B4/C2/C8 continuam).
4. Substituir os hex listados por `var()` nos pontos citados; recalcular as razões.
5. Documentar no cabeçalho de `tokens.css` a regra "hex cru só se o token não existir" já escrita
   em `:3-4` — agora verdadeira para as telas tocadas.

## Critérios de aceite
- Todas as razões da tabela ≥ 4,5:1 (texto) / 3:1 (UI, ≥24px).
- `grep -c "#9a8a72\|#8a7a64\|#b8693c\|#c8956c" src/telas/Tela[2-7]*.dc.html src/telas/PainelA11y.dc.html` → 0.
- Visual: screenshots antes/depois lado a lado — a linguagem visual se mantém (é ajuste de valor).

## Verificação
Script de cálculo WCAG (luminância relativa) sobre a lista de pares — reaproveitável de
`docs/auditorias/varredura-2026-08-26.md` (tabela UI-C21..C32). `node tests/e2e/run-linha-verde-canonico.mjs`.

## Riscos e cuidados
- O gradiente terracota é identidade de marca — escurecer ~15% mantém o caráter; alternativa é
  texto escuro sobre laranja (`#3a2c20`/`#e8965a` ≈ 6:1) — decisão de gosto.
- Não alterar `--pip-tinta`/`--pip-creme` sem checar `landing.html` (copia os mesmos valores).

## Decisões do dono (default)
- CTA: gradiente escurecido (default) vs texto escuro sobre laranja.
- Valor canônico do creme e do raio de cartão (default: o praticado nas telas, 22px / `#fffaf0` de superfície + `#f6ecd7` de fundo).
