# Pipoca · Trilha de implementação (roteiro mestre)

> Roteiro **vivo** da sequência a partir do estado atual. Cada doc de sub-passo já implementado/parcial
> carrega um selo `STATUS` que aponta para cá. Atualizado: **2026-07-01**.
> Visão por fase: [README.md](README.md) · vocabulário: [`_contratos/`](_contratos/) · checker: `node docs/plans/check_plans.mjs`.

## O estado atual (2026-07-01)
O caminho verde roda **inteiro sobre os módulos canônicos** — a convergência do Marco 1 aconteceu e foi além
(o registro das duas tracks divergentes que motivou o Marco 1 está preservado no "Feito" do próprio marco):

- **Composição autoral v2 implementada e viva** — `src/core/composicao.ts` (funções puras; o grafo do
  cenário viaja dentro do `EstadoComp`), grafo `docs/quintal.v2.json` (esquema `pipoca.grafo-autoral.v2`),
  exposta no bridge como `PipocaCanonico.composicao` e consumida por `src/app/estado.js` e pelas telas
  T3/T4/T5. Mecânica: R1 revela 4 objetos e a criança escolhe e **ordena 3** (as pontas travam como
  âncoras); R2–R4 revelam +1 cada e a escolha entra **só no miolo**; banco = novas + sobras (objeto
  revelado e não escolhido segue disponível; nada repete); história = abertura + contas (na ordem da
  linha) + desfecho (`convergente`/`aberto` por `Modos.desfecho`); tempero `tem:X` é sabor, nunca portão.
  Prévia vs commit: T4 monta um `gatePendente` e mostra prévia pura (`preverComposicao`, sem efeito
  colateral); o commit acontece só na confirmação em T5 — voltar de T5 é sem perdas.
- **Monólito aposentado** — `index.html` é entry fino (~70 linhas): carrega `pipoca.bundle.js` +
  `src/app/estado.js` e compõe `Shell.dc.html` + telas canônicas de `src/telas/` via `<dc-import>`;
  o cérebro do app é `window.PipocaApp` (`src/app/estado.js`).
- **Fluxo do cuidador montado no app** — T2 → T1 (`PortaoParental`, PIN via `acesso.ts`) → `Onboarding`
  (T10, quando não há perfis) → T2. Perfis persistem em localStorage chave `pipoca.perfis.v1` via
  `PipocaApp.repo`.
- **Dívida conhecida (coexistência v1/v2)** — `_initMotor()` em `src/app/estado.js` ainda carrega
  `quintal_grafo.json` (v1 / Motor A) em paralelo à v2; o Motor A segue instanciado, mas a linha verde
  usa a composição.

### Pendências reais (2026-07-01)
- Captura de telemetria exportada no bridge (`capturar*`) mas não chamada por nenhuma tela.
- Telas do cuidador faltantes: `LoginFamilia`, `Perfis`, `Limites`, `Regras`, `Privacidade`,
  `PainelEvolucao` — núcleos prontos e testados no bridge.
- Caminho Windows hardcoded (`PW_CORE`) em `tests/e2e/run-linha-verde-canonico.mjs`.
- Fases 04–08 não iniciadas.

## Mapa de status (resumo)
| Fase | Status | Onde |
|------|--------|------|
| 00 Fundação | 🟢 módulos prontos (desvios corrigidos) | `Economia` conformada, `spendPct` corrigido, `ValidadorOrdem` incremental |
| 01 MVP linha verde | 🟢 **vivo na composição v2** | telas canônicas de `src/telas/` sobre `PipocaCanonico.composicao`; entry fino `index.html` + `Shell.dc.html` via `<dc-import>` |
| 02 Controle parental | 🟢 núcleos completos · fluxo parcial no app | PINGATE (T1) e Onboarding (T10) ligados (T2→T1→T10→T2); núcleos HH_LOGIN/KIDMODE/PC_PROF/LIM/RULES/PRIV/AI no bridge; faltam as demais telas |
| 03 Telemetria/painel | 🟢 núcleos completos · telas no app | `telemetria.ts`+`captura.ts`+`telemetria_repo.ts`+`agregadosTelemetria.ts` (testados); falta tela `PainelEvolucao` e captura ligada ao fluxo (app) |
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
pelos portões `tsc` (0), unidade (100 asserts) e `check_plans` (10/10). ✅ Concluído (2026-07-01): o monólito foi
aposentado — `index.html` é entry fino (~70 linhas) que compõe `Shell.dc.html` + telas canônicas de `src/telas/`
via `<dc-import>`; o cérebro do app é `window.PipocaApp` (`src/app/estado.js`).

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
   *(Superado em 2026-07-01: a linha verde vigente é a composição autoral v2 — ver "O estado atual".)*
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
- **PC_HOME (02-04)** núcleo — `src/core/onboarding.ts` (`montarEstadoOnboarding` PERF/MODES/SESS → T2); bridge `PipocaCanonico.onboarding`.
- **PC_PROF (02-05)** — CRUD via seam; `apagarPerfil` adicionado ao contrato `RepositorioPersistencia` (LGPD).
- **PC_LIM (02-06)** núcleo — `src/core/limites.ts` (`definirBlocoFoco` + tempo de tela); bridge `PipocaCanonico.limites`.
- **PC_RULES (02-07)** núcleo — `modos.definirVerificacao/definirDesfecho` + `src/core/cardapio.ts`; bridge `.modos`/`.cardapio`.
- **PC_PRIV (02-09)** núcleo — `src/core/lgpd.ts` (`exportarDados`/`apagarDados`); bridge `PipocaCanonico.lgpd`.

**Todos os núcleos da Fase 02 prontos e testados no bridge.** A fazer (a cargo do app/telas): `LoginFamilia`, wiring do
KIDMODE no roteador, `Onboarding`, `Perfis`, `Limites`, `Regras`, `Privacidade` — cada uma consome o respectivo
`PipocaCanonico.*`. Nota infra: a porta 5000 é outro dev server (vite); o e2e do Pipoca usa 5137.

## Marco 3 — Fase 03 · Telemetria + Painel do cuidador (Tela 8)
Pontos de captura em sessão/leitura/recompensa emitindo `EventoTelemetria` (`ts` injetado fora do motor);
payloads `pipoca.telemetria.v1`; agregados; tela `PC_DASH`. Aproveita `registrarTelemetria` já no seam.

### Progresso 2026-06-29 — núcleos da Fase 03 completos (track canônica)
Núcleo de agregados do painel pronto e testado no bridge (`tsc` limpo; parciais 86/86; checker 10/10; e2e 27/27):
- **03-02 PC_DASH** 🟡 — `src/core/agregadosTelemetria.ts`: `resumir` (minutos/palavras/histórias/diasAtivos/sequenciaDias),
  `gerarSeries` (minutos·palavras por dia, histórias por semana, engajamento por dia), `calcularEngajamento`
  (heurística calorosa 0..1 — regularidade·volume·variedade, nunca nota). Puras, `agora` injetado, dia em UTC
  determinístico, clamp de outlier (`TETO_MINUTOS_SESSAO=60`). No bridge: `PipocaCanonico.agregados`.
- **Seam:** `carregarTelemetria(perfilId): Promise<EventoTelemetria[]>` promovido ao contrato
  `RepositorioPersistencia` (LocalStorage async + stub Supabase) — o painel lê eventos **pelo seam**, nunca do
  localStorage direto.

**A fazer (a cargo do app/telas):** tela `PainelEvolucao.dc.html` (frase calorosa → cartões grandes → gráficos
via `ref`+`_inject`, `reduceMotion` estático) consumindo `PipocaCanonico.agregados` + `criarRepositorio().carregarTelemetria`;
link "Evolução da leitura" no `PainelCuidador`; **ligar a captura aos fluxos reais** (portão→`capturarLeituraConfirmada`,
recompensa→`capturarObjetoDestravado`, borda de sessão→`capturarSessao*`, desfecho→`capturarHistoriaConcluida`),
todos com `Date.now()` injetado na borda.

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
