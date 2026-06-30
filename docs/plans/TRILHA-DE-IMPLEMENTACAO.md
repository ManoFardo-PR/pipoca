# Pipoca · Trilha de implementação (roteiro mestre)

> Roteiro **vivo** da sequência a partir do estado atual. Cada doc de sub-passo já implementado/parcial
> carrega um selo `STATUS` que aponta para cá. Atualizado: **2026-06-29**.
> Visão por fase: [README.md](README.md) · vocabulário: [`_contratos/`](_contratos/) · checker: `node docs/plans/check_plans.mjs`.

## O fato dominante do estado atual
Existem **duas implementações paralelas do caminho verde que não se encontram**:

- **Track canônica (`src/`)** — CORE, Motor A, `ValidadorOrdem`, fábrica, persistência, telas `.dc.html`.
  Construída e testada: `tsc --noEmit` limpo, `motor.test.ts` **36/36**.
- **Track runtime (`index.html`)** — o monólito portado do protótipo que **efetivamente roda**. Ele
  **reimplementa** motor/validador/CORE inline (`_motorAbertura`/`_motorAoAdicionar`/`_validarOrdem`/
  `_ordemCanonica`, index.html:567-610) e **nunca instancia** `criarMotor`/`validarGrafo`/`ValidadorOrdem`.

Consequência: a **lei do contrato** (telas falam só com `MotorNarrativa`/`ValidadorOrdem`) vale nos módulos,
mas **não no app que roda**. Toda fase futura assume o CORE/seam canônico como base — por isso o **Marco 1 é
pré-requisito** de tudo que vem depois.

## Mapa de status (resumo)
| Fase | Status | Onde |
|------|--------|------|
| 00 Fundação | 🟢 módulos prontos (desvios corrigidos) | `Economia` conformada, `spendPct` corrigido, `ValidadorOrdem` incremental |
| 01 MVP linha verde | 🟢 **convergido** | `index.html` consome o seam canônico via `pipoca.bundle.js` (e2e 19/19) |
| 02 Controle parental | 🟡 PINGATE ligado · HH_LOGIN/KIDMODE/PC_AI núcleo | T1 usa `acesso.ts` (e2e); `contaFamilia`/`modoApp`/`autorizarIA` prontos; falta wiring (telas) + PC_HOME/PROF/LIM/RULES/PRIV |
| 03 Telemetria/painel | 🟢 TELE/03-03 · 🔴 PC_DASH | `telemetria.ts`+`captura.ts`+`telemetria_repo.ts` (testados); falta painel PC_DASH e captura ligada ao fluxo |
| 04 Super admin | 🔴 não iniciado | — |
| 05 IA e fala | 🔴 / 🟡 stub | fallback Motor B na fábrica; tipos `ProvedorIA`/`ServicoASR` |
| 06 Backend | 🟡 migração pronta | `migrar(de,para)` em `src/backend/migracao.ts` (testado); adaptadores BaaS aguardam 06-01 |
| 07 QA/A11y/CI | 🔴 não iniciado | `motor.test`/`persistencia.test`; `check_plans.mjs` sem CI |
| 08 Conteúdo | 🔴 não iniciado | só `quintal_grafo.json`; SVGs dos 4 cenários sem grafo |

Dívidas de contrato da fase00 (corrigidas no Marco 1): `Economia.objetosCreditados` (fora de `tipos-core`
`{vagalumes,poupado}`); `spendPct` devolve fração **poupada**, não gasta (`src/core/economia.ts:85`).

Checker: **10/10 PASS** (resolvido em 2026-06-29 — a checagem #5 lia `motor_a.ts` na raiz; agora lê os tipos
canônicos em `src/core/grafo/tipos.ts` + `src/motores/`, com fallback ao layout antigo).

### Progresso 2026-06-29 (pré-convergência, na track canônica)
Concluído o núcleo testável de 5 parciais (99 asserts no total; `tsc` limpo; checker 10/10):
- **03-01 TELE** 🟢 — `src/core/telemetria.ts` + `src/core/captura.ts` (5 pontos, `ts` injetado, fire-and-forget, idempotente).
- **03-03** 🟢 — `src/servicos/telemetria_repo.ts` (retenção) + `RepositorioLocalStorage.carregarTelemetria`/`podarTelemetria`.
- **02-08 PC_AI** 🟢 — `modos.autorizarIA` + tela `IaToggle.dc.html`; fábrica respeita a flag.
- **02-03 PINGATE** 🟡 — `src/core/acesso.ts` (PIN+lockout) + tela `PortaoParental.dc.html`; nav p/ PC_HOME na convergência.
- **06-03** 🟡 — `migrar(de,para)` em `src/backend/migracao.ts`; adaptadores BaaS reais aguardam 06-01 + backend.
Testes em `src/core/parciais.test.ts` (rodam com `npm test`). Falta apenas a **ligação ao fluxo vivo**, que acontece no Marco 1.

---

## Marco 1 — Convergência runtime → `src/` · ✅ **CONCLUÍDO (2026-06-29)**
Objetivo: o app que roda passa a consumir os módulos canônicos; o caminho verde fica "implementado de verdade".

**Feito:** `src/app/bridge.ts` → `pipoca.bundle.js` (`npm run build:app`), carregado pelo `index.html`, que agora
instancia `{ motor, ordem }` pela fábrica canônica e cujos métodos inline viraram delegadores (sem lógica de grafo
duplicada; `_avaliarCondicao` removido). `ValidadorOrdem` aceita ordem parcial consistente; `Economia` conformada a
`{vagalumes,poupado}` (idempotência via `HISTORIA.objetos`); `spendPct` corrigido; desfecho via `motor.desfecho()`.
Travado por e2e em chromium real (`tests/e2e/linha-verde.spec.ts` para CI + `npm run test:e2e` standalone, 19/19) e
pelos portões `tsc` (0), unidade (100 asserts) e `check_plans` (10/10). O `index.html` segue como app; a substituição
pela versão definitiva baseada em `src/telas/*.dc.html` (x-import) é um refino opcional posterior.

1. **Build TS→browser.** Criar entry `src/app/bridge.ts` expondo em `window.PipocaCanonico`: `criarMotor`
   (`src/motores/fabrica.ts`), `validarGrafo` (`src/core/grafo/validarGrafo.ts`), CORE
   (`estado`/`historia`/`economia`/`perfil`/`sessao`/`modos`/`a11y`), `criarRepositorio`
   (`src/core/persistencia/index.ts`), `tts` (`src/servicos/tts.ts`), helpers de `leitura.ts`. Bundle:
   `bun build src/app/bridge.ts --target=browser --outfile=pipoca.bundle.js`; script npm `build:app`;
   `index.html` carrega o bundle antes do script da app.
2. **Religar `index.html`.** No `componentDidMount`: `const grafo = PipocaCanonico.validarGrafo(raw);
   const { motor, ordem } = PipocaCanonico.criarMotor(grafo.cenario, modos);`. Os métodos inline
   (index.html:567-610) viram **delegadores finos** para `this._motor`/`this._ordem`; usar `motor.desfecho()`
   no desfecho. Remover a lógica duplicada. `window.PipocaApp.motor/ordem` apontam para as instâncias canônicas.
3. **Reconciliar `ValidadorOrdem`** (docs `00-18`/`00-20`): a mecânica é **incremental** (coloca 1 objeto, lê,
   destrava o próximo). Ajustar `validar()` para (a) aceitar ordens **parciais** consistentes com dependências
   — critério 00-18: `validar(["vagalume","frasco"]) → ok:true` — e (b) validar `strip ∪ committed`, sem
   regredir a leitura do 2º objeto. Adicionar o caso parcial a `motor.test.ts`.
4. **Corrigir desvios de contrato fase00.** Conformar `Economia` a `{vagalumes,poupado}` (realocar o ledger de
   idempotência: derivar de `HistoriaState.objetos`, não num campo extra); corrigir `spendPct` (fração gasta);
   alinhar `index.html`/`Tela7PoteCardapio`.
5. **Travar com e2e (`07-01`).** `tests/e2e/linha-verde.spec.ts` (Playwright — cache `ms-playwright` presente)
   percorrendo T2→T7 pelo seam canônico, fixtures convergente + aberto.
6. **Atualizar `check_plans.mjs`** para os novos caminhos dos tipos (resolve a checagem #5).
7. **Portões verdes:** `tsc --noEmit`, `bun run src/motores/motor.test.ts`, `node docs/plans/check_plans.mjs`
   (alvo 10/10), smoke manual (`npm run serve` → T2→T7).

**Pronto quando:** o app roda sem motor/validador inline; e2e verde; checker 10/10; nenhum desvio de contrato.

---

## Marco 2 — Fase 02 · Acesso e controle parental · 🟡 **em progresso**
Ordem por dependência: **HH_LOGIN → KIDMODE → PINGATE → PC_HOME → PC_PROF → PC_LIM → PC_RULES → PC_AI → PC_PRIV**.
Reusa `Perfil`/`Modos`/`Sessao` e `RepositorioPersistencia` já prontos.

**Divisão de trabalho:** o app/usuário implementa as **telas** (index.html); o núcleo canônico em `src/` (lógica +
testes) é consumido via `window.PipocaCanonico`.

**Feito (2026-06-29):**
- **PINGATE (02-03)** ligado — o T1 do `index.html` consome `src/core/acesso.ts` via `src/servicos/acesso_repo.ts`
  (`pipoca.acesso.v1`): cria o PIN no 1º uso, verifica com lockout suave e dica acolhedora; e2e cria/recusa/aceita.
- **KIDMODE (02-02)** núcleo — `src/core/modoApp.ts` (`ModoApp`, guarda `aplicarGuarda`/`podeNavegar`, transições),
  no bridge `PipocaCanonico.modoApp`; falta o app fazer o wiring no roteador/T2.
- **PC_AI (02-08)** núcleo — `modos.autorizarIA` + `IaToggle`.
- **HH_LOGIN (02-01)** núcleo — `src/core/contaFamilia.ts` (`entrarFamilia` stub + `sessaoValida`) + `src/servicos/conta_repo.ts`
  (sessão persistida); bridge `PipocaCanonico.conta`. Auth real = fase06.

**A fazer (telas a cargo do app):** wiring do KIDMODE no roteador; tela `LoginFamilia` + rota inicial sessão-válida→KIDMODE;
`PC_HOME (02-04)` onboarding (dono da criação/recuperação do PIN, grava PERF/MODES/SESS); `PC_PROF/LIM/RULES/PRIV`.
Nota infra: a porta 5000 está ocupada por outro dev server (vite); o e2e do Pipoca usa 5137.

## Marco 3 — Fase 03 · Telemetria + Painel do cuidador (Tela 8)
Pontos de captura em sessão/leitura/recompensa emitindo `EventoTelemetria` (`ts` injetado fora do motor);
payloads `pipoca.telemetria.v1`; agregados; tela `PC_DASH`. Aproveita `registrarTelemetria` já no seam.

## Marco 4 — Fase 04 · Super admin / multi-tenant
`src/admin/*` (login SA, home, tenants, conteúdo, IA, segurança); schema `pipoca.tenant.v1`. Mantém o seam:
`EstadoApp` não ganha campos admin.

## Marco 5 — Fase 05 · IA e fala (eixo `AIPROV`)
Motor B (`MotorIA` implements `MotorNarrativa`), `ProvedorIA` + adaptadores Claude/Gemini/OpenAI, guardrails,
ASR. Troca A↔B **só na fábrica**; `iaLigada` (já existe) autoriza. Telas não mudam.

## Marco 6 — Fase 06 · Backend trocável (Supabase | Firebase)
`ServicoAuth`, adaptadores de `RepositorioPersistencia` (completar `RepositorioSupabase`), RLS/Security Rules,
`ProxyIA` server-side (chaves nunca no cliente). Login agnóstico via seam.

## Marco 7 — Fase 07 · QA / A11y / CI
Auditoria de acessibilidade automatizada; `.github/workflows/ci.yml` com `check_plans.mjs` como gate +
motor/e2e/a11y. (O e2e da linha verde já entrou no Marco 1.)

## Marco 8 — Fase 08 · Conteúdo
Guia de autoria + grafos `pipoca.grafo-autoral.v1` dos 4 cenários (`quarto`/`floresta`/`espaço`/`fundomar`) —
arte SVG já existe em `src/telas/cenas.ts`; falta o grafo. Cada cenário valida contra schema + Motor A +
`ValidadorOrdem`.

---

## Alternativa registrada
Se a prioridade virar "features primeiro", o Marco 1 pode ser adiado e a Fase 02 sobe — ao custo de manter a
duplicação `index.html`↔`src/` e as divergências do runtime (ex.: `_avaliarCondicao` ignora `nao_tem:`,
validador simplificado, desfecho não roteado pelo seam). A escolha atual é **convergir primeiro**.
