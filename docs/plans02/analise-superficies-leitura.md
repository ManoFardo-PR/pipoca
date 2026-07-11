# Análise A2 · Superfícies de leitura — o que a criança lê, onde, e de qual motor

> 📋 **RELATÓRIO DE ANÁLISE · 2026-07-11** — mapeamento factual das superfícies onde texto de
> história aparece para a criança, com a origem (motor) de cada texto e a temporização no fluxo
> real T4→T5→T6→leitor. **Este documento não corrige nada** — nenhuma linha de código foi
> alterada. Fatos citados com `caminho:linha` verificados no working tree em 2026-07-11
> (branch `main`, pós-merge PR #27, commit `5013a73`). Hipóteses e opções ficam em seções
> próprias, separadas dos fatos. Contexto do incidente: perfil "Pietro", overlay de gênero
> respondido, história lida saiu "Joana" sem flexão (`forense-personagem.md`).

## §0 · Escopo e vocabulário

Dois motores produzem texto de história:

- **v3 determinístico (A+)** — `montar` em `src/core/composicao.ts:505`; conteúdo do grafo
  `docs/quintal.v3.json`, cujo protagonista é fixo: `"personagem": "a Joana"`
  (`docs/quintal.v3.json:13`). O nome "Joana" também é o fallback de nome protegido do motor
  (`src/core/composicao.ts:328`) — mas esse fallback só protege a capitalização; **quem põe
  "Joana" no texto é o conteúdo autoral do grafo**.
- **Geração 2 (realizado LLM)** — `gerar` em `src/core/geracao/geracao.ts:129`:
  compositor (`src/core/compositor/compor.ts:101`) → realizador via edge
  (`src/backend/proxy_realizador.ts:46`, `functions/realizador/index.ts`) → validador.
  Identidade parametrizada: `personagem.nome` é SEMPRE o nome do perfil
  (`geracao.ts:18-24`, implementação `:159-167`) — nunca "Joana".
- **Fallback A+** — quando a geração 2 falha ou atrasa, o texto vem do próprio motor v3
  (`montar`), em três camadas: `src/core/realizador/cascata.ts:152-167`,
  `src/core/geracao/geracao.ts:139-151` e `src/app/estado.js:784-790`. Consequência direta:
  **o texto de fallback também diz "Joana"** (é o mesmo conteúdo do grafo), sinalizado no
  registro por `origem.fonte: "fallback-a-mais"`.

## §1 · Inventário das superfícies (todas)

Exaustividade verificada por busca: `gateTrecho` só é lido em Tela5Portao e contado em
telemetria (`estado.js:1003`); `leitorHistoria` só é consumido por LeitorHistoria, Shell e
Tela3; `speechSynthesis` só aparece em Tela5Portao e no serviço órfão `src/servicos/tts.ts`.

### 1.1 Tela5Portao (T5) — a ÚNICA leitura de história durante a sessão · motor v3

- Renderização palavra a palavra: template `src/telas/Tela5Portao.dc.html:29-74`;
  tokenização e `gateWords` em `:354-390` (`const trecho = estado.gateTrecho || ''` na `:354`).
- Dado consumido: **`gateTrecho`** (estado global), também lido em `:273` e `:292`.
- Cadeia de origem: `gateTrecho` é escrito pela T4 em `src/telas/Tela4Heroi.dc.html:226`,
  com `texto = App.preverComposicao(pendente, nivel)` (`Tela4Heroi.dc.html:222`) →
  `preverComposicao` (`src/app/estado.js:986-990`) → `C.montar(...)` =
  `src/core/composicao.ts:505` = **motor v3, "Joana"**. O comentário de seam da própria tela
  confirma: "texto vem de window.PipocaApp.gateTrecho (motor já chamado em T4)"
  (`Tela5Portao.dc.html:7`).
- Nenhum caminho alternativo alimenta `gateTrecho` (busca exaustiva acima).

### 1.2 TTS (dentro da T5) — fala o MESMO texto v3

- Único TTS ativo do app: `_speak` (`Tela5Portao.dc.html:141-152`) e `_speakSeq`
  (`:156-168`), voz pt-BR via `_pickVoz` (`:132-138`).
- Disparos: toque na palavra `ouvirPalavra` (`:270-278`, lê `App.estado.gateTrecho` na
  `:273`); leitura corrida `alternarOuvirTudo` (`:289-309`, lê `gateTrecho` na `:292`).
- Ou seja: **tudo que o app fala em voz alta é o texto v3 do portão** ("Joana").
- Por completude: existe um serviço `ServicoTTS` (`src/servicos/tts.ts:13-44`) exposto no
  seam (`src/app/bridge.ts:111`, `:244`), mas **nenhuma tela o chama** — a T5 usa
  `speechSynthesis` inline diretamente.

### 1.3 Tela4Heroi (T4) — produz o texto, não exibe prosa

- Não renderiza história; monta o move pendente e a prévia em `lerEmVozAlta`
  (`src/telas/Tela4Heroi.dc.html:199-233`): calcula a prévia v3 (`:222`) e grava
  `gatePendente/gateObjId/gateTrecho` + `tela: 5` (`:223-230`).
- O comentário em `:207-208` registra a intenção: "A composição só é aplicada na
  confirmação da leitura (T5), para que voltar seja sem perdas."

### 1.4 Tela6Recompensa (T6) — nenhum texto de história

- Só celebração (+vaga-lumes, objeto desbloqueado). O coração "Guardar para sempre"
  (`src/telas/Tela6Recompensa.dc.html:77-85`) apenas favorita o registro apontado por
  `ultimaHistoriaSalvaId` (`:80`) — **não exibe o texto**. O id é definido de forma síncrona
  na captura (`src/app/estado.js:1071-1072`), antes mesmo de a realização terminar.

### 1.5 LeitorHistoria (overlay) — a ÚNICA superfície que exibe o texto da geração 2

- Renderiza a história salva por parágrafo: `src/telas/LeitorHistoria.dc.html:30-32`
  (template) e `:80-83` (usa `h.paragrafos` quando o realizador segmentou; senão deriva de
  `h.texto` por linha em branco).
- Dado consumido: `state.leitorHistoria` (um `HistoriaSalva`, `src/core/historias.ts:50-79`),
  setado ao tocar um cartão em `src/telas/Tela3SelecaoCenario.dc.html:269`. Montado pelo
  Shell quando existe (`src/telas/Shell.dc.html`).
- Motor de origem: **depende do registro**. O campo `origem` (`historias.ts:65`, gravado em
  `estado.js:1044`) diz `fonte: "llm"` (realizado, nome do perfil) ou
  `fonte: "fallback-a-mais"` (texto v3, "Joana"). A superfície é a mesma para os dois casos —
  **o LeitorHistoria pode perfeitamente exibir "Joana"** se o registro nasceu de fallback.

### 1.6 Tela3SelecaoCenario (T3) — só títulos

- "Minhas histórias": cartões com `titulo/emoji/quando`
  (`src/telas/Tela3SelecaoCenario.dc.html:264-271`), carregados via
  `App.repo.carregarHistorias` (`:111-125`). O título é gerado do último objeto da linha
  (`estado.js:1037-1039`), não contém o nome do personagem.

### 1.7 Tela7PoteCardapio (T7) — nenhum texto de história

- Pote/cardápio de recompensas apenas.

### 1.8 CartaoHistoria — componente ÓRFÃO (legado)

- `src/componentes/CartaoHistoria.dc.html` renderiza prop `texto` (`:53`) com default
  **"A Joana viu um vaga-lume brilhar no quintal."** (`:76`). Busca no repositório: nenhuma
  tela o monta. Não participa do fluxo atual; relatado por completude (é "Joana" de
  demonstração, permitida pela regra pós-PR#26).

## §2 · Fluxo T4→T5→T6→leitor: temporização dos dois motores

Sequência de UMA rodada (fatos verificados no código):

```
T4 (palco)     criança arranja a cena → lerEmVozAlta (Tela4Heroi:199)
               └─ prévia v3 = preverComposicao (estado.js:986) → gateTrecho → tela 5
T5 (portão)    criança LÊ o gateTrecho (v3, "Joana") + TTS do mesmo texto
               └─ confirmação: _commit (Tela5Portao:237-267)
                  ├─ aplicarComposicao (estado.js:993) — commit do move
                  │   └─ _dispararRealizacao (estado.js:999 → :747-779)  ← LLM COMEÇA AQUI
                  └─ abrirProximaRodadaComposicao (estado.js:919-949)
                      └─ captura consome a realização com TETO DE 8s
                         (_resultadoRealizacao :783-801, TETO_ESPERA_REALIZACAO_MS :720)
                         → _salvarRegistroHistoria (:1024-1061) → PERSISTÊNCIA, não UI
T6 (recompensa) celebração sem texto; coração favorita o id síncrono (:1071-1072)
(depois)        T3 → cartão → LeitorHistoria exibe o registro salvo (llm OU fallback)
```

Os dois fatos de temporização que decidem a pergunta do prompt:

1. **A realização LLM só dispara no commit da leitura** — `aplicarComposicao` tem o comentário
   "o arranjo da rodada acabou de estabilizar (commit do move): dispara a realização por LLM
   em BACKGROUND (13-01…)" (`estado.js:997-999`), e `aplicarComposicao` é chamado
   exclusivamente pelo `_commit` da T5 (`Tela5Portao.dc.html:253`). Logo, **quando a criança
   lê o portão, a geração 2 daquela rodada ainda nem começou** — é logicamente impossível a
   T5 exibir o realizado da rodada corrente.
2. **O resultado da realização vai só para a persistência** — a captura (intermediária por
   rodada, `estado.js:948` → `:1080-1087`; completa na convergência, `:944` → `:1066-1076`)
   grava via `_salvarRegistroHistoria` e nenhum caminho o injeta em `gateTrecho` ou em
   qualquer elemento de tela da sessão.

## §3 · Quantificação: sessão completa de 4 rodadas

Sessão = 4 rodadas (R1 ordena 3, R2–R4 inserem 1 — `docs/plans/TRILHA-DE-IMPLEMENTACAO.md:14-17`;
grafo com 4 rodadas em `docs/quintal.v3.json`; clamp 1..4 em `estado.js:756`).

| Leitura | Quantas | Motor |
|---|---|---|
| Portão T5 (visual, palavra a palavra) | **4** (uma por rodada) | **v3 "Joana", 4 de 4** |
| TTS (palavra tocada / "Ouvir") | 0..N releituras | mesmo texto v3 |
| Texto realizado (LLM) exibido durante a sessão | **0** | — |
| Registros gravados p/ releitura | 3 intermediárias + 1 completa | `llm` OU `fallback-a-mais`, decidido pela corrida de 8s por registro |

**Resposta direta ao prompt:** o texto realizado **não é lido em nenhum momento da sessão**.
Ele só chega aos olhos da criança na **releitura posterior** (T3 → LeitorHistoria) — e mesmo
lá, apenas se o registro tiver `origem.fonte: "llm"`; um registro de fallback exibe o texto
v3 ("Joana") na mesma superfície.

## §4 · Veredito

**O incidente "li Joana" é explicável SÓ pela superfície, sem nenhum bug — desde que a
leitura tenha acontecido no portão (T5).** A T5 lê o v3 por design: a prévia do portão é
deterministicamente o texto do Motor A+ v3, decisão fixada D-13.2
(`docs/plans02/fase13_integracao_modularizacao/13-01_orquestracao-no-app.md:50`, rótulo
D-13.2 e prova e2e em `13-01:3`; e2e `tests/e2e/run-geracao2-canonico.mjs:9,189` assevera
zero chamadas de LLM antes do commit). O selo de linhagem do 08-00 reconhece exatamente esse
arranjo: "o texto realizado por LLM é o que se salva e relê; a prévia lida no portão segue
sendo o texto determinístico deste motor"
(`docs/plans/fase08_conteudo/08-00_motor-a-plus-grafo-v3.md:3`). Como o personagem do grafo é
"a Joana" (`quintal.v3.json:13`), toda leitura de portão diz "Joana" para qualquer perfil —
Pietro incluído — sem que nenhuma regra de código seja violada.

**Discriminador (limite deste relatório):** se a leitura do incidente foi no
**LeitorHistoria**, a superfície sozinha NÃO explica — depende do `origem` do registro salvo
(`fonte: "llm"` com "Joana" indicaria falha de realização/validação; `fonte:
"fallback-a-mais"` indicaria cascata esgotada ou teto de 8s estourado). Essa investigação —
contaminação do few-shot e logs da edge — é o território do Prompt A3, não deste.

**Divergência doc↔código a registrar:** a frase final da própria decisão D-13.2 diz
"a prévia crua mostra o efeito do arranjo; **o texto LIDO no portão é o realizado**"
(`13-01:50`), e a seção de latência desenha o portão abrindo "com o texto já pronto" e
indicador de espera com teto (`13-01:45`). O implementado é diferente: o texto lido no portão
é a **prévia v3** (a mesma coisa que a "prévia crua"), e a realização dispara **depois** da
leitura, no commit (`estado.js:997-999`). O STATUS do mesmo doc (`13-01:3`) e o selo do 08-00
descrevem o comportamento implementado. Ou seja: dentro do próprio 13-01 convivem duas
formulações — a intenção de 2026-07-09 (portão lê o realizado, com espera) e o estado
implementado (portão lê a prévia; realizado só na releitura). Nenhum teste cobre a frase
"o texto lido no portão é o realizado"; o e2e prova o oposto (zero LLM antes do commit).

## §5 · Tensão de produto (fato, não bug)

A regra pós-incidente do PR #26 — "o nome da criança NUNCA é substituído"
(`src/core/geracao/geracao.ts:18-24`; nota de linhagem `13-01:5`; forense
`docs/plans02/forense-personagem.md:110-117`) — protege a identidade **na geração 2** e
ressalva explicitamente que "'Joana' permanece apenas em conteúdo legado/demonstração".
A prévia do portão não viola a letra da regra (é conteúdo do motor legado, por design
D-13.2). Mas o §3 quantifica a tensão: **a superfície mais lida do app (4 de 4 leituras da
sessão, mais todo o TTS) apresenta "Joana" a qualquer criança**, enquanto a superfície que
carrega o nome real (LeitorHistoria) só é vista em releitura opcional — e ainda pode exibir
"Joana" quando o registro nasceu de fallback. Na experiência vivida da primeira sessão real,
a regra "o nome da criança nunca é substituído" é verdadeira no dado persistido e falsa na
tela em que a criança efetivamente lê.

## §6 · Opções (listadas, SEM decisão)

1. **Realizar a prévia (LLM no portão).** Elimina "Joana" da leitura principal. Custo: uma
   chamada de LLM por movimento da criança — exatamente o que D-13.2 rejeitou por orçamento
   de latência (`13-01:50`); quebraria o e2e de zero-LLM-por-movimento
   (`run-geracao2-canonico.mjs:189`).
2. **Neutralizar/parametrizar o nome no v3.** Substituir "Joana" na montagem determinística
   pelo nome do perfil (o grafo tem o nome em `cenario.personagem` e nas variantes autorais —
   ex.: `quintal.v3.json:19-20`; o motor já deriva nomes protegidos de `cenario.personagem`,
   `composicao.ts:322-330`). Manteria zero LLM por movimento; toca conteúdo autoral do grafo
   (esquema `pipoca.grafo-autoral.v3` é publicado — regra "nunca mutar .vN", `13-01:54`) ou
   exige transformação em runtime na montagem; a flexão de gênero das variantes autorais
   ("a Joana") precisaria do mesmo cuidado que motivou o PR #26.
3. **Ler o realizado no portão com espera.** Implementar o que `13-01:45` desenhou: disparar
   a realização quando o arranjo estabiliza ainda na T4 e abrir o portão com o realizado
   quando pronto, indicador curto com teto → fallback v3 no estouro. Preserva D-13.2 no
   sentido "zero LLM por MOVIMENTO" se o disparo for por arranjo estável (debounce), mas
   reintroduz espera na transição T4→T5 e reabre a decisão de latência; o fallback no estouro
   voltaria a exibir "Joana" exatamente nos piores momentos (rede lenta).

— fim do relatório —
