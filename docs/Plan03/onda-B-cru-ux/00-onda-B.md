# Onda B — UX servida crua (grupos G2, G5, G6, G9)

**Fim:** os ajustes de acessibilidade funcionam de verdade e o contraste passa (G2); a
criança troca de leitor, volta e acha o pote sem o portão (G5); a mecânica de compor e ler
é tocável, compreensível e acessível (G6); o operador vê a tela inteira (G9).

**Por quê juntas:** todas as subtarefas tocam apenas arquivos servidos **crus** pelo
`server.js` — `src/telas/*.dc.html`, `src/componentes/*.dc.html`, `src/admin/**/*.dc.html`,
`src/tokens.css`, `index.html`, `admin.html`, `server.js`, `src/app/estado.js`. **Commit =
deploy; nenhum bundle, nenhuma edge, nenhum SQL.** Por isso os itens de baixo risco
embarcam de graça: reabrir o mesmo `.dc.html` duas vezes custaria mais do que fazer tudo agora.

**Unidade de deploy:** CRU. Independente da Onda A (pode rodar em paralelo em branch própria).

## Subtarefas e ordem

| # | Arquivo | Grupo | O que entrega | Depende de |
|---|---|---|---|---|
| B1 | `B1-mecanismo-a11y-classe-atributo.md` | G2 | tokens escutam o que o Shell aplica; `.pip-contrast` deixa de destruir CTAs | — |
| B2 | `B2-paleta-com-contraste-e-tipografia.md` | G2 | CTAs ≥4,5:1; microcópia tokenizada; escala tipográfica; tokens = desenho praticado | B1 |
| B3 | `B3-foco-visivel-e-movimento.md` | G2 | `:focus-visible` global; `--pip-mov` real; hover sob reduce-motion; admin com classes a11y | B1 |
| B4 | `B4-painel-a11y.md` | G2 | PainelA11y com tokens, `Canon.a11y`, toggles ≥48px, `role=switch`, `role=dialog` | B1–B3 |
| B5 | `B5-saidas-da-crianca.md` | G5 | avatar→T2, saldo→T7, ⚙ em T2/T6, PedirGenero no lugar certo | — |
| B6 | `B6-cabecalhos-e-copy-t2-t7.md` | G5 | uma gramática de cabeçalho; alvos ≥48; "Leitor em ascensão" com concordância; T2 rola no celular | B5 |
| B7 | `B7-t4-palco.md` | G6 | ◀ ✕ ▶ ≥48; gap "+"; ordinais legíveis; copy sem "âncora" + 🔊; feedback nos toques; voltar sem perda | — |
| B8 | `B8-t5-portao-e-t6-aria.md` | G6 | palavras como `<button>`; progressbar; `aria-live` na T5 e na celebração da T6 | — |
| B9 | `B9-t7-pote.md` | G6 | `width:67%%` corrigido; "~2"→"2"; alvos 48; celebração ao resgatar | — |
| B10 | `B10-admin-shell-rota-assets.md` | G9 | overlap da barra (1 linha); rota `/admin`; allowlist de assets | — |
| B11 | `B11-admin-controles-e-copy.md` | G9 | switch × kill-switch; navegação mínima; vocabulário; estados de erro | B10 |

## Harness de screenshots (antes/depois)
A varredura capturou 33 telas com um script de playwright-core reaproveitável:
sobe `node server.js` em porta livre (`PORT=5139`), abre `http://localhost:5139/app` com
`window.PIPOCA_CONFIG = { provedor: "local" }` injetado via `addInitScript`, semeia estado
pelos seams (`App.criarConta`, `App.repo.salvarPerfil`, `App.selecionarPerfil(p, 3)`,
`App.repo.salvarHistoria`, `App.iniciarComposicao()` + `ordenarR1Composicao`, `setState`
de gate) e navega com `PipocaRoteador.irParaTela(n)` + `App.setState({tela:n})`; telas
adultas via roteador apenas. Admin em `/admin.html`, login local preenchendo
`[aria-label="Senha do operador"]`. Viewports 1280×800 e 390×844. Reconstruir a partir de
`tests/e2e/run-linha-verde-canonico.mjs:40-110` (mesmo boot).

## Definição de pronto da onda
- Cálculo WCAG dos pares reais (CTA, microcópia, contador, ordinais) ≥ 4,5:1 (texto) / 3:1 (UI).
- Com "alto contraste" ligado, os CTAs continuam legíveis; com "reduzir movimento", nada salta.
- `grep -c "aria-" src/telas/Tela2*.dc.html Tela4* Tela6* Tela7* PainelA11y*` > 0 em todos.
- Sonda de alvos: nenhum alvo de navegação/edição/ajuste < 44px nas telas da criança.
- T3 tem trocar-leitor e pote; T6 e T2 têm ⚙; 6/7 telas do admin sem overlap.
- 175 checks e2e verdes (ajustar MARCADORES de texto onde a copy mudou).
