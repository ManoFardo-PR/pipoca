# Contrato · Eventos e ações canônicos das telas

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — Handlers nas telas (`escolherObjeto`/`colocarNaTira`/`devolverParaBandeja`/`validarTira`/`ouvirPalavra`/`proximaPalavra`/`confirmarLeitura`/`creditarVagalumes`/`irParaTela`/`abrirAjustesA11y`); `autorizarIA`/`abrirPortaoParental` ficam p/ fase02. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

> Nomes de handlers/ações que as telas expõem (via `renderVals()` do dc-runtime). Substituem os handlers
> ad-hoc do protótipo. Todo doc de tela deve mapear seus botões/gestos para **estes** nomes e indicar, na
> coluna "do protótipo", de onde veio.

| Ação canônica | Assinatura | O que faz | Do protótipo (Pipoca.dc.html) |
|---------------|-----------|-----------|-------------------------------|
| `escolherObjeto` | `(objetoId: string)` | seleciona um objeto da bandeja para colocar na tira | `trayCards[].onTap` / `tc.onDragStart` |
| `colocarNaTira` | `(objetoId: string, slot: number)` | coloca o objeto num slot do `strip` | `_placeInSlot` / `slotN.onDrop` |
| `devolverParaBandeja` | `(objetoId: string)` | tira do strip e devolve à bandeja | `_returnToTray` / `slotN.onTap` |
| `validarTira` | `()` → `{ ok, dica? }` | valida a ordem via `ValidadorOrdem` | `_checkStory` (era contra `_order` fixo) |
| `lerEmVozAlta` | `()` | vai da cena (T4) para o portão (T5) | `onReadAloud` |
| `ouvirPalavra` | `(i: number)` | TTS da palavra `i` do trecho atual | `_onWordTap` / `ouvirAtual` |
| `proximaPalavra` | `()` | avança o destaque de leitura / conclui o trecho | `gateNext` / `_gateNext` |
| `confirmarLeitura` | `(resultado: "sozinho"\|"juntos")` | confirma a leitura no portão (verificação) | `confirmRead` |
| `aoDestravarProximo` | `()` | destrava o próximo objeto e volta à cena | `addToScene` |
| `creditarVagalumes` | `(n: number)` | soma vaga-lumes (transação ECON, idempotente) | parte de `confirmRead` (`fireflies + 3`) |
| `gastarVagalumes` | `(n: number)` | gasta vaga-lumes ao resgatar recompensa | `rw.redeem` |
| `irParaTela` | `(n: number)` | navega entre telas | `go` / `goN` |
| `abrirAjustesA11y` | `()` | abre o painel "Do meu jeito" | `openSettings` |
| `fecharAjustesA11y` | `()` | fecha o painel | `closeSettings` |
| `abrirPortaoParental` | `()` | dispara o PINGATE a partir do modo criança | `backToOnboarding` (era atalho direto) |
| `autorizarIA` | `(perfilId: string, on: boolean)` | liga/desliga Motor B para a criança (PC_AI) | — (não existe no protótipo) |

Regras de nomenclatura:
- ações em **camelCase**, verbo no infinitivo PT-BR;
- toda ação que muda saldo/estado persiste via [[../fase00/00-12_persistencia-seam-SAVE]];
- `creditarVagalumes` é **idempotente** por objeto commitado (ver [[../fase01/01-10_tela6-recompensa]]).
