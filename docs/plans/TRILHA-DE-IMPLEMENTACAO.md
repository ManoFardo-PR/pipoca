# Pipoca · Trilha de implementação (roteiro mestre)

> Roteiro **vivo** da sequência a partir do estado atual. Cada doc de sub-passo já implementado/parcial
> carrega um selo `STATUS` que aponta para cá. Atualizado: **2026-07-02**.
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
- **Fluxo do cuidador completo no app (2026-07-02)** — boot sem sessão de conta válida → `LoginFamilia`
  (tela 9, HH_LOGIN stub MVP) → T2. T2 → T1 (`PortaoParental`, PIN via `acesso.ts`) → `Onboarding` (T10,
  1º uso sem perfis) ou hub `PainelCuidador` (T11), que abre `Perfis` (12), `Limites` (13), `Regras & IA`
  (14, com `IaToggle` embutido), `Privacidade` (15) e `PainelEvolucao` (8). KIDMODE ligado: guarda em
  `setState` sobre as superfícies adultas [8, 10–15]. Perfis persistem pelo repo canônico
  (`criarRepositorio`, chave `pipoca.perfil.v1`), com migração única da chave legada `pipoca.perfis.v1`.
- **Telemetria ligada ao fluxo vivo (2026-07-02)** — `src/app/estado.js` captura na borda (fire-and-forget,
  respeitando a coleta de PC_PRIV): sessão iniciada ao começar a composição; leitura confirmada + objeto
  destravado na confirmação do portão (T5); história concluída + sessão encerrada na convergência e nas
  bordas de saída. O painel (T8) lê pelo seam e agrega com `PipocaCanonico.agregados`.
- **Plataforma do operador no ar (2026-07-02, MVP local)** — entry separado `admin.html` (fino, espelho
  do index) com bundle próprio `pipoca.admin.bundle.js` (`npm run build:admin`) e cérebro
  `window.PipocaAdmin` (`src/admin/estadoAdmin.js`, guard fail-closed no `setState`); núcleos em
  `src/admin/` expostos como `window.PipocaAdminCanonico`. Telas: SaLogin (1º uso semeia credencial
  local), SaHome (4 cartões por escopo), SaTenant (planos gratis/familia/escola, envelopes
  `pipoca.tenant.v1`), Conteudo (validação dupla + rascunho/versão/publicação), ConfigIA (sem chaves —
  server-side fase06) e Seguranca (kill-switches, defaults seguros). Storage próprio nas chaves
  `pipoca.admin.credencial.v1` / `pipoca.admin.sessao.v1` / `pipoca.admin.tenants.v1` /
  `pipoca.admin.contas.v1` / `pipoca.admin.conteudo.v1` / `pipoca.admin.ia.v1` / `pipoca.admin.flags.v1`
  — o admin não toca os dados da família (provado no e2e `npm run test:e2e:admin`, 22 asserts).
- **IA e fala no app da criança (2026-07-02, MVP local)** — Motor B de verdade atrás da fábrica:
  `MotorIA` (`src/motores/motor_ia.ts`) preserva o contrato SÍNCRONO com cache pré-aquecido
  (`aquecer`) e Motor A interno memoizado como degradação; falha total do provedor ⇒ saída idêntica
  ao Motor A. `src/ia/`: prompt base com bloco de segurança infantil, guardrails sempre no caminho,
  orquestrador de fallback/cotas/custo e provedor SIMULADO local (sem rede/chave; adaptadores
  Claude/Gemini/OpenAI prontos e testados com transporte fake — chamada real = ProxyIA fase06).
  O runtime consome os kill-switches do SA_SAFE: `state.modos` guarda a INTENÇÃO do cuidador e os
  modos efetivos nascem na borda (`aplicarFlagsAosModos`, agora também degradando fala→cuidador),
  com remontagem ao vivo do motor (`state.motorAtivo`). Modo fala no portão: `ServicoASR`
  (`src/servicos/asr.ts`, irmão do tts) avalia participação — não perfeição; sem microfone o portão
  degrada acolhedor para o caminho do cuidador (e2e cobre).
- **Backend trocável no ar (2026-07-02, Supabase real)** — fachada `Backend { auth, repo, proxyIA }`
  (`src/backend/backend.ts`) com adaptadores local / supabase (REST puro, sem SDK) / firebase (stub);
  config pública em `pipoca.config.js` (fail-safe → local; o e2e força "local" e segue 100% offline).
  Projeto real `pipoca` (sa-east-1, free) com RLS aplicado e verificado ao vivo, Edge Function
  `proxy-ia` deployada (chaves dos 4 provedores — Anthropic/OpenAI/Gemini/DeepSeek — só nos secrets;
  cota/custo persistidos checados antes de cada chamada). Estratégia "remoto com fallback local":
  leitura sempre local, escrita espelhada fire-and-forget, tombstones para apagar offline e
  sincronização inicial no login (união com preferência local). Sem rede/config, o app é exatamente o
  de antes. Passos operacionais restantes em fase06_backend/PARIDADE.md.
- **UX por perfil (2026-07-03)** — o save por perfil deixou de ser letra morta: `src/app/estado.js`
  projeta um EstadoApp mínimo (`_projetarSave`, nunca o state cru) com debounce (perfilId capturado
  no agendamento) e flush nas bordas; `selecionarPerfil` é o ÚNICO caminho que hidrata (troca real
  zera os slices — cada criança começa do zero; mesmo id retoma a composição). O `pipoca.save.v1`
  ganhou slices ADITIVO-OPCIONAIS saneados (limites, cardapio, cenariosLiberados, coletaTelemetria —
  `schemas.ts` sanea, nunca rejeita por eles; regra de versão emendada: aditivo-opcional ok,
  renomear/mudar tipo/remover = v2). Telas do cuidador (Limites/Regras & IA/Privacidade) configuram
  POR CRIANÇA via chips (`lerPrefsPerfil`/`gravarPrefsPerfil`; IaToggle keyado de verdade — a coleta
  de PC_PRIV agora persiste por perfil). T7 consome o cardápio configurado (com scroll) e T3 obedece
  `cenariosLiberados`. Dashboards: cartão do pote no T8, saldos por criança no T11, T3 como casinha
  (saudação + guardado à vista). Engrenagem: o modal "Do meu jeito" ganhou "🔒 Sou o adulto"
  (→ PINGATE) e `aoVoltarParaCrianca` retoma a tela onde a criança estava (`_telaCriancaAnterior`,
  invalidação central na troca de perfil). Pelo repo sincronizado (fase06), cada gravação de save
  espelha no Supabase quando há sessão.
- **Histórias salvas (2026-07-06)** — toda história CONCLUÍDA é capturada automaticamente na
  convergência (`_capturarHistoriaSalva` em `src/app/estado.js`: texto completo tecido na hora —
  fonte fiel mesmo se a IA um dia tecer a linha verde — + linha/nível/desfecho/título/emoji) e
  guardada por perfil em `pipoca.historias.v1:<perfilId>` com **retenção de 20 dias**; a criança
  favorita (💛 na T6 e nos cartões da T3) e a história fica **para sempre** (`criadaEm` preservado
  ao (des)favoritar). Núcleo puro em `src/core/historias.ts` (validador rejeitador por item,
  `normalizarHistorias` com dedupe/poda/teto de 30 não-favoritas); 4 métodos ADITIVO-OPCIONAIS no
  seam `RepositorioPersistencia`; espelho Supabase na tabela `historias` (favorita/criada_em como
  colunas → a poda remota é um DELETE por filtro idempotente, sem tombstones por item);
  `sincronizarInicial`/`migrar` puxam/empurram as histórias junto dos perfis; LGPD cobre (export
  inclui, apagar limpa local+remoto). UI: faixa "Minhas histórias" na T3 + leitor em modal
  (`LeitorHistoria.dc.html`, padrão PainelA11y, fonte respeita a11y) + coração na T6.
- **Dívida conhecida (coexistência v1/v2)** — `_initMotor()` em `src/app/estado.js` ainda carrega
  `quintal_grafo.json` (v1) em paralelo à v2; o motor narrativo (A ou B desde a fase05) segue
  instanciado, mas a linha verde usa a composição.

### Pendências reais (2026-07-06)
- Histórias salvas: aplicar a migration da tabela `historias` no projeto Supabase real (bloco novo
  do `rls_supabase.sql`; via MCP `apply_migration` ou SQL editor) — sem ela o espelho remoto das
  histórias falha silencioso (fail-soft: o local funciona 100%). Gestão por item pelo cuidador
  (apagar UMA história) e teto para favoritas ficam como follow-up (favoritas ilimitadas = aceito).
- Reabrir a Sessao de leitura ao voltar do portão: `_entrarCuidador` encerra com calma (correto) e a
  retomada via `_telaCriancaAnterior` devolve a criança à tela onde estava, mas uma nova Sessao só
  nasce na próxima composição — aceito no MVP, follow-up.
- Caminho Windows hardcoded (`PW_CORE`) em `tests/e2e/run-linha-verde-canonico.mjs`.
- Runner legado `tests/e2e/run-linha-verde.mjs` desalinhado das telas canônicas (não é portão; candidato a `old/`).
- Fase 06 (operacional, fora do código): desligar "Confirm email" no dashboard, configurar os secrets
  dos 4 provedores de IA na função e semear o operador na tabela `operadores` — passos no
  fase06_backend/PARIDADE.md. Sem eles o app funciona igual (fail-soft: simulado/local).
- Fase 06 (código, próxima iteração): telas do admin (tenants/conteúdo/flags) sobre PostgREST — hoje só
  a config de IA é espelhada no servidor; vínculo explícito conta↔tenant (`contas_tenant`); telemetria
  remota com retenção; adaptadores Firebase reais (stubs + paridade documentada); teto de perfis por
  plano no app da família (o trigger cobre o dado remoto com tenant).
- Fase 08 depende de conteúdo; fase 07 (QA/A11y/CI) não iniciada.

Aposentados em 2026-07-02 (movidos para `old/`): `app.html` (entry duplicado; o e2e canônico agora aponta
para `/`) e `src/motores/jogar.ts` (inlinado em `motor.test.ts`).

## Mapa de status (resumo)
| Fase | Status | Onde |
|------|--------|------|
| 00 Fundação | 🟢 módulos prontos (desvios corrigidos) | `Economia` conformada, `spendPct` corrigido, `ValidadorOrdem` incremental |
| 01 MVP linha verde | 🟢 **vivo na composição v2** | telas canônicas de `src/telas/` sobre `PipocaCanonico.composicao`; entry fino `index.html` + `Shell.dc.html` via `<dc-import>` |
| 02 Controle parental | 🟢 **completa no app** (2026-07-02) | `LoginFamilia` (9) + KIDMODE (guarda em `setState`) + PINGATE (1) + Onboarding (10) + hub `PainelCuidador` (11) + `Perfis` (12) + `Limites` (13) + `Regras & IA` (14) + `Privacidade` (15), todas sobre `PipocaCanonico.*` |
| 03 Telemetria/painel | 🟢 **completa no app** (2026-07-02) | captura ligada em `src/app/estado.js` (portão/recompensa/sessão/desfecho, respeitando PC_PRIV) + tela `PainelEvolucao` (8) sobre `PipocaCanonico.agregados` |
| 04 Super admin | 🟢 **completa no app (MVP local)** (2026-07-02) | entry `admin.html` + `src/admin/*` (auth/guard/tenants/conteúdo/IA/flags) + 6 telas SA_* + e2e próprio (`test:e2e:admin`, 22 asserts); auth/persistência reais e chaves de IA = fase06 |
| 05 IA e fala | 🟢 **completa no app (MVP local)** (2026-07-02) | Motor B (`MotorIA`) atrás da fábrica + `src/ia/*` (prompt/guardrails/orquestrador/simulado; adaptadores testados com transporte fake) + ASR no portão (T5) e "Pela voz" nas Regras; kill-switches consumidos pelo runtime; chamada real de IA = fase06 |
| 06 Backend | 🟢 **completa no app (Supabase real)** (2026-07-02) | fachada `Backend{auth,repo,proxyIA}` + adaptadores REST puros (`src/backend/*`); projeto real sa-east-1 com RLS aplicado + Edge Function `proxy-ia` deployada (4 provedores via secrets); remoto com fallback local (sem rede, tudo segue); Firebase = stub + PARIDADE.md |
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

## Marco 2 — Fase 02 · Acesso e controle parental · ✅ **CONCLUÍDO (2026-07-02)**
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

**Feito (2026-07-02) — telas ligadas no app:** `LoginFamilia.dc.html` (tela 9; boot por `sessaoValida`,
logout via `sairDaConta()`), wiring do KIDMODE em `src/app/estado.js` (`state.modoApp` + guarda em `setState`),
`Onboarding` mantida na T10 (1º uso), hub `PainelCuidador.dc.html` (tela 11, destino pós-PIN com perfis),
`Perfis.dc.html` (12, CRUD + em uso), `Limites.dc.html` (13), `Regras.dc.html` (14, com `IaToggle` embutido)
e `Privacidade.dc.html` (15, exportar/apagar + toggle de coleta) — cada uma consome o respectivo
`PipocaCanonico.*` pelo seam. Coberto pelo e2e canônico (25/25 contra `/`).
Nota infra: a porta 5000 é outro dev server (vite); o e2e do Pipoca usa 5137.

## Marco 3 — Fase 03 · Telemetria + Painel do cuidador (Tela 8) · ✅ **CONCLUÍDO (2026-07-02)**
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

**Feito (2026-07-02):** tela `PainelEvolucao.dc.html` (tela 8: frase calorosa → cartões grandes → gráficos
SVG estáticos via `ref`+`_inject`, estado vazio encorajador, períodos semana|mês|tudo) consumindo
`PipocaCanonico.agregados` + `repo.carregarTelemetria`; link "Evolução da leitura" no `PainelCuidador` (11);
captura ligada aos fluxos reais em `src/app/estado.js` (portão→`capturarLeituraConfirmada`+`capturarObjetoDestravado`,
início da composição→`capturarSessaoIniciada` + poda de retenção, convergência→`capturarHistoriaConcluida`+
`capturarSessaoEncerrada`, saídas do modo criança→`capturarSessaoEncerrada`), todos com `Date.now()` injetado
na borda e respeitando `coletaTelemetria` (PC_PRIV). Validado com runner Playwright (11 eventos, distribuição exata).

## Marco 4 — Fase 04 · Super admin / multi-tenant · ✅ **CONCLUÍDO (2026-07-02, MVP local)**
`src/admin/*` (login SA, home, tenants, conteúdo, IA, segurança); schema `pipoca.tenant.v1`. Mantém o seam:
`EstadoApp` não ganha campos admin.

**Feito (2026-07-02):** plataforma inteira num entry separado (`admin.html` + `pipoca.admin.bundle.js` via
`npm run build:admin`; `server.js` resolve `src/admin/telas|componentes|.`) — o app da criança não carrega
nada do admin. Núcleos puros e testados (91 asserts em `src/admin/admin.test.ts`, `npm test` = 249):
`avaliarLogin` (1º uso semeia credencial hash+sal, erro neutro, atraso progressivo), sessão de 12h,
`guardarRotaAdmin` fail-closed, `RepositorioTenant` com escopo preso na instância (isolamento provado),
planos gratis/familia/escola com rebaixamento não-destrutivo, `validarGrafoAutoral` (validação dupla:
schema + simulação Motor A/ValidadorOrdem nos 4 níveis), biblioteca rascunho→versão→publicação com teto
do plano, `ConfigIaTenant` SEM campo de chave (gate triplo plano∧config∧flag) e flags com kill-switch
(`aplicarFlagsAosModos` ignora `Modos.iaLigada` com IA global desligada). Telas SA_LOGIN/HOME/TENANT/
CONTENT/AI/SAFE sóbrias sobre `window.PipocaAdmin`/`PipocaAdminCanonico`. e2e dedicado
`npm run test:e2e:admin` (porta 5138, 22 asserts) prova isolamento do app da criança, guard, defaults
restritivos e persistência do kill-switch. **Pendências (fase06):** auth/sessão do operador em servidor
(`ServicoAuth`, 06-02), RLS/vínculo tenant↔família (06-04 — enforcement de `maxPerfis`/retenção no app),
chaves + teste de conexão de IA server-side, consumo da CONFIG de IA por tenant pelo runtime (as flags já
são consumidas pelo runtime da criança desde a fase05).

## Marco 5 — Fase 05 · IA e fala (eixo `AIPROV`) — ✅ CONCLUÍDO (2026-07-02, MVP local)
Motor B (`MotorIA` implements `MotorNarrativa`), `ProvedorIA` + adaptadores Claude/Gemini/OpenAI, guardrails,
ASR. Troca A↔B **só na fábrica**; `iaLigada` (já existe) autoriza. Telas não mudam.

**Feito (2026-07-02):** `MotorIA` em `src/motores/motor_ia.ts` — contrato SÍNCRONO preservado com cache
pré-aquecido (`aquecer`: abertura → objetos na ordem canônica com história acumulada → desfechos nos 2
modos) e Motor A interno MEMOIZADO no miss (a mesma chamada nunca muda de texto; falha total do provedor ⇒
saída idêntica ao Motor A, verificada por igualdade de string nas fixtures); `ehFinal` imposto por tipo,
`objetoId` ecoado pelo motor. `src/ia/`: prompt base (05-02) puro com bloco de segurança infantil e um
nível por chamada; guardrails (05-08) sempre no caminho via decorator (blocklist por palavra inteira,
links/e-mail/telefone, tamanho; motivos sem PII); `ProvedorIA` (05-04) com schema do Trecho e validação
que descarta `objetoId`; adaptadores (05-05/06/07) como montador+parser sobre transporte injetável — sem
SDK, sem chave no cliente, refusal tratado ANTES do conteúdo, Claude sem temperature/top_p/budget_tokens;
orquestrador (05-10) primário→fallback com cotas/custo locais em memória e telemetria de uso sem PII;
provedor SIMULADO local determinístico no runtime. Borda: bridge expõe `ia`/`flags`/`asr`; `estado.js`
computa modos EFETIVOS na borda (a intenção do cuidador em `state.modos` fica intacta), remonta o motor ao
vivo por efetivo-vs-ativo (`state.motorAtivo`) e aquece fire-and-forget. ASR (05-09): `ServicoASR`
(`src/servicos/asr.ts`, irmão do tts, injetável, global lido lazy, nunca rejeita); modo fala na T5
(participação conta — baixa confiança inclusive; indisponível/silêncio → fallback acolhedor com os botões
do cuidador) e "Pela voz" nas Regras; `aplicarFlagsAosModos` estendida (kill-switch de fala degrada
`verificacao` para "cuidador"). Portões: 355 asserts bun · e2e canônico 34 · e2e admin 22.
**Pendências (fase06):** ProxyIA server-side (chaves/SDK/chamada real aos provedores), seleção de
adaptador pela `ConfigIaTenant` no runtime (vínculo tenant↔família), cotas/custo persistidos no backend,
telemetria de custo de verdade.

## Marco 6 — Fase 06 · Backend trocável (Supabase | Firebase) — ✅ CONCLUÍDO (2026-07-02, Supabase real)
`ServicoAuth`, adaptadores de `RepositorioPersistencia` (completar `RepositorioSupabase`), RLS/Security Rules,
`ProxyIA` server-side (chaves nunca no cliente). Login agnóstico via seam.

**Feito (2026-07-02):** fachada `Backend { auth, repo, proxyIA }` + `obterBackend(config)` em
`src/backend/backend.ts` — lei do backend cumprida (REST puro via `Transporte` injetável da fase05,
ZERO SDK; nada de provedor fora de `src/backend/`). Config pública `pipoca.config.js`
(`window.PIPOCA_CONFIG`, fail-safe → local; e2e injeta "local" e roda offline para sempre). Auth GoTrue
via REST: família com signup no 1º uso e espelhos síncronos (o boot não mudou de forma), refresh sob
demanda, operador via tabela `operadores` sem signup automático, erro neutro em tudo; telas
LoginFamilia/SaLogin agnósticas. Persistência: repo PostgREST (mesmos envelopes canônicos, revalidados),
repo SINCRONIZADO (leitura local; escrita local + espelho fire-and-forget com catch; tombstones para
apagar offline) e `sincronizarInicial` (união com preferência local). DeepSeek entrou como 4º provedor
(adaptador próprio em JSON mode; catálogo/telas do admin com 4 chips). ProxyIA: Edge Function deployada
no projeto real (verify_jwt; 401 sem bearer verificado ao vivo), servidor decide provedor/modelo pela
config do tenant e checa cota/custo persistidos ANTES da chamada, guardrails server-side; cliente
`provedorViaProxy` na cadeia do orquestrador — falha degrada p/ simulado → Motor A. Infra real via MCP:
projeto sa-east-1 (free), migrations de schema+RLS+hardening aplicadas, RLS provado ao vivo (anon lê 0 e
escreve negado). Portões: 465 asserts bun · e2e canônico 37 · e2e admin 24 — tudo OFFLINE mesmo com a
config real commitada.
**Pendências:** passos operacionais do dashboard (confirm-email OFF, secrets de IA, seed do operador —
PARIDADE.md) e a próxima iteração de código (telas admin sobre PostgREST, vínculo conta↔tenant,
telemetria remota com retenção, Firebase real).

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
