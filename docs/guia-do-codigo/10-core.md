# 10 · core-lógica

← [Mapa geral](00-MAPA-GERAL.md) · [Glossário](90-GLOSSARIO.md)

O cérebro puro do Pipoca. Funções determinísticas, sem estado de módulo, testáveis
sem rede. Mora em [`src/core/`](../../src/core/) (+ [`src/dados/`](../../src/dados/),
[`src/ia/`](../../src/ia/), [`src/servicos/`](../../src/servicos/)).

## A fronteira da família: o contrato compositor → realizador

O coração é um pipeline de duas metades separadas por um **contrato de dados**, o
_Pacote de Composição_:

- **Compositor** (determinístico): decide e arranja. Consome _fichas_ e devolve um
  _Pacote_. Não escreve prosa.
- **Realizador** (LLM): recebe o _Pacote_ e escreve a prosa. Nunca vê fichas.
- **Costura**: [`geracao/geracao.ts`](../../src/core/geracao/geracao.ts) é a única
  ponte entre o app e os dois motores. Aplica a _rota por nível_ e a política de falha.
- **Rede de segurança**: [`composicao.ts`](../../src/core/composicao.ts) (Motor A+
  v3) é o _fallback_ — quando o LLM esgota, ele tece o texto fiel no dispositivo.

## O pipeline (subpastas)

### `src/core/compositor/` — decide e arranja (fase 11)
- [`pacote.ts`](../../src/core/compositor/pacote.ts) — tipos do contrato
  `pipoca.pacote-composicao.v1`, a fronteira entre compositor e realizador.
- [`compor.ts`](../../src/core/compositor/compor.ts) — função pura, sem RNG:
  `(estado, fichas, perfil) → PacoteComposicao`. ⚠️ Homônima do `compor()` de
  `composicao.ts` (que recompõe o miolo v3) — não confundir.
- [`gramatica.ts`](../../src/core/compositor/gramatica.ts) — a gramática de decisão
  v3 (condições, seleção de relações D5, arranjo de _eco_), escolhendo fichas de
  relação em vez de temperos-de-frase.

### `src/core/realizador/` — escreve a prosa (fase 12)
- [`realizar.ts`](../../src/core/realizador/realizar.ts) — entrada: valida o Pacote,
  monta o prompt, delega à cascata; retorna `{texto, paragrafos, veredito, origem, metadados}`.
- [`prompt_template.ts`](../../src/core/realizador/prompt_template.ts) — monta o
  prompt 100% derivado do Pacote (matéria no `user`; as 3 leis editoriais + few-shots
  no `system`); nunca toca fichas.
- [`provedor_realizador.ts`](../../src/core/realizador/provedor_realizador.ts) —
  interface plugável de provedor + adaptador Gemini. **A chave chega por parâmetro,
  nunca é lida aqui.**
- [`validador.ts`](../../src/core/realizador/validador.ts) — validador determinístico
  de fidelidade (a "Camada 1" do experimento promovida a runtime): âncora por beat,
  gênero bidirecional, teto de crescimento, ritmo n1. `pass = motivos.length === 0`.
- [`cascata.ts`](../../src/core/realizador/cascata.ts) — máquina de política de falha:
  falha de provedor (retry curto) vs falha de fidelidade (próximo provedor), teto
  global de chamadas, e o _fallback_ final A+ v3.

### `src/core/geracao/` — a costura (fase 13)
- [`geracao.ts`](../../src/core/geracao/geracao.ts) — aplica a _rota por nível_
  (`"realizador"` = compor→realizar; `"ap_cru"` = A+ v3 direto), chama os motores e a
  política de falha. O app nunca aprende se o texto veio do LLM ou do fallback — só
  recebe a **origem**.

### `src/core/fichas/` — o modelo de conteúdo (fase 10)
- [`tipos.ts`](../../src/core/fichas/tipos.ts) — tipos do contrato `pipoca.fichas.v1`
  (identidade, relação, cenário; tudo por nível).
- [`lint_fichas.ts`](../../src/core/fichas/lint_fichas.ts) — linter de conteúdo do
  JSON das fichas.

### `src/core/grafo/` — tipos congelados (v1, legado)
- [`tipos.ts`](../../src/core/grafo/tipos.ts) — tipos v1 do grafo (`Nivel`,
  `ModoDesfecho`, `Trecho`, `MotorNarrativa`…). O grafo/leitor v1 foram
  aposentados no Motor A+ (o arquivo histórico saiu do repo no D4), mas o
  vocabulário genérico segue vivo em core/ia/backend.

### `src/core/persistencia/` — a lei da fronteira de dados
- [`index.ts`](../../src/core/persistencia/index.ts) — fábrica `criarRepositorio()`;
  nenhuma tela toca `localStorage`/Supabase direto.
- [`RepositorioLocalStorage.ts`](../../src/core/persistencia/RepositorioLocalStorage.ts) — a implementação localStorage.
- [`chaves.ts`](../../src/core/persistencia/chaves.ts) — nomes de chaves + envelopes versionados.

## O motor autoral + o modelo do app (`src/core/*.ts`)

- [`composicao.ts`](../../src/core/composicao.ts) — **Motor de Composição Autoral A+
  (v3), ARQUIVO INTOCÁVEL.** A mecânica-coração (combinar objetos → história) e o
  _fallback_ de produção + a _prévia_ do portão. É chamado como função por
  `cascata.ts` e `geracao.ts`; mexer aqui quebra o fallback fiel. (Selo em
  [`docs/plans/`](../plans/) fase 08.)
- [`estado.ts`](../../src/core/estado.ts) — `EstadoApp`, a fonte única de verdade do app.
- [`perfil.ts`](../../src/core/perfil.ts) — perfil da criança + a tabela única dos avatars (`AVATARES_DEF`, C4).
- [`historia.ts`](../../src/core/historia.ts) — estado da história (mecânica tira/
  quebra-cabeça). Marcado SUPERSEDED pelo A+ v3, mantido como registro vivo.
- [`historias.ts`](../../src/core/historias.ts) — histórias salvas (puro): auto-guarda
  20 dias, favorita guarda para sempre.
- [`leitura.ts`](../../src/core/leitura.ts) — tokenização + detecção de palavra difícil
  para o _portão_ de leitura.
- [`sessao.ts`](../../src/core/sessao.ts) — sessão de leitura com bloco Pomodoro.
- [`modos.ts`](../../src/core/modos.ts) — modos narrativos (Palco vs Ateliê, desfecho,
  verificação do portão, `iaLigada`).
- [`modoApp.ts`](../../src/core/modoApp.ts) — visibilidade criança vs cuidador.
- [`acesso.ts`](../../src/core/acesso.ts) — portão parental por PIN (hash FNV-1a).
- [`economia.ts`](../../src/core/economia.ts) — economia de vaga-lumes (2/3 gasta, 1/3 poupa).
- [`cardapio.ts`](../../src/core/cardapio.ts) — menu de recompensas/cenários (controle parental).
- [`limites.ts`](../../src/core/limites.ts) — limites de tempo de tela e de foco (sem punição).
- [`onboarding.ts`](../../src/core/onboarding.ts) — onboarding do cuidador → `EstadoApp` inicial.
- [`contaFamilia.ts`](../../src/core/contaFamilia.ts) — conta/sessão da família (stub MVP).
- [`lgpd.ts`](../../src/core/lgpd.ts) — privacidade: exportar/apagar dados via a fronteira de persistência.
- [`telemetria.ts`](../../src/core/telemetria.ts) — tipo `EventoTelemetria` + fábrica pura (sem PII).
- [`captura.ts`](../../src/core/captura.ts) — pontos puros de captura de telemetria.
- [`agregadosTelemetria.ts`](../../src/core/agregadosTelemetria.ts) — agregação para o painel do cuidador.
- [`a11y.ts`](../../src/core/a11y.ts) — helpers de estilo de acessibilidade (fonte disléxica, contraste, etc.).
- [`lint_grafo.ts`](../../src/core/lint_grafo.ts) — lint autoral do conteúdo do grafo v3.
- [`roteador.js`](../../src/core/roteador.js) — roteador de telas mínimo (`irParaTela`;
  o espelho `.ts` sem importadores saiu no D4 — o contrato dele divergia do vivo).

## Dados, IA e serviços

- [`src/dados/niveis.ts`](../../src/dados/niveis.ts), [`schemas.ts`](../../src/dados/schemas.ts) — dados canônicos de níveis e schemas.
- [`src/ia/`](../../src/ia/) — o que sobrou após o D4 (a orquestração da geração 1
  saiu com os adaptadores): só [`provedor.ts`](../../src/ia/provedor.ts) (tipos
  `ProvedorIA`/`Transporte` + `transportePadrao`, usados por todo o backend).
- [`src/core/seguranca/guardrails.ts`](../../src/core/seguranca/guardrails.ts) —
  a FONTE ÚNICA dos guardrails infantis (E2); as edges carregam cópias
  verificadas por [`scripts/paridade-edge.mjs`](../../scripts/paridade-edge.mjs) no CI.
  ⚠️ A chave de provedor **não vive aqui** — vive nos secrets das edges.
- [`src/servicos/`](../../src/servicos/) — [`asr.ts`](../../src/servicos/asr.ts) (fala→texto),
  [`tts.ts`](../../src/servicos/tts.ts) (texto→fala), e os repos
  [`acesso_repo.ts`](../../src/servicos/acesso_repo.ts) / [`conta_repo.ts`](../../src/servicos/conta_repo.ts) / [`telemetria_repo.ts`](../../src/servicos/telemetria_repo.ts).

## Como rodar
Estes módulos entram no bundle do app (`bun run build:app`) e são exercitados pelos
testes: `bun run test` (ver [50 · testes](50-testes.md)).
