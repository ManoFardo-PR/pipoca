# Análise A4 · Ciclo de vida do perfil e da realização pendente (timing)

> 📋 **RELATÓRIO DE ANÁLISE · 2026-07-11** — prompt A4 da caça ao "traço do
> sistema antigo" (identidade Joana/Pietro). Documento SOMENTE-LEITURA do
> código: nenhuma correção acompanha este PR. Fatos citados com
> `caminho:linha`; hipóteses marcadas como tal e separadas das evidências.
> Complementa o `forense-personagem.md` (causa-raiz do incidente) com a
> dimensão **timing**: quando o gênero entra no perfil, quando a realização
> dispara, e o que cada rodada realmente carrega.

## Sumário executivo

1. `definirGeneroPerfil` grava o gênero em `pipoca.perfil.v1` **imediatamente** (`estado.js:456`), além do estado vivo (`:454`) — não há espera por um "save posterior"; reload preserva a escolha (e2e já asserta).
2. O overlay pergunta na **ativação** do perfil (`estado.js:421`/`:432`) e é **não-bloqueante** ("Depois" só fecha) — a realização dispara no **commit de cada move** (`estado.js:999`), então **existe janela real** em que a R1 compõe com `genero: undefined`.
3. Nessa janela o comportamento pós-correção é benigno por regra: `geracao.ts:166` mantém o nome real e só aplica concordância padrão (f) — mas a realização pendente disparada **antes** da resposta fica **congelada** com `genero: undefined` e é consumida assim mesmo; responder o overlay não re-dispara nem corrige a pendente daquela rodada.
4. O snapshot `{nome, genero, nivel}` de `estado.js:760` é lido **fresco de `state.perfil` a cada commit** — perfil editado no meio da sessão reflete a partir do próximo commit, nunca retroage sobre pendentes já disparadas.
5. Dois achados laterais documentados: o comentário de `estado.js:458` ("o espelho tenta de novo no próximo save") não corresponde a nenhum mecanismo de retry localizado para `pipoca.perfil.v1`; e a `chave` da pendente (`estado.js:771`) é gravada mas **nunca lida** — o pareamento pendente↔rodada depende só da ordem das chamadas.

Baseline de higiene: `bun run typecheck` (exit 0) e `bun run test` (exit 0, "Total: 11 | ✓ 11 passou | ✗ 0 falhou" no último runner + fumaça de presença "240 histórias · falhas: 0") rodados na `main` limpa antes deste relatório; nenhum arquivo de código tocado.

## Evidências

### 1. `definirGeneroPerfil`: memória E storage, na hora

Trecho exato (`src/app/estado.js:444-462`):

```js
function definirGeneroPerfil(genero) {
  if ((genero !== "m" && genero !== "f") || !state.perfil || !state.perfil.id) {
    setState({ pedirGenero: false });
    return Promise.resolve({ ok: false });
  }
  var novo = {};
  for (var k in state.perfil) { /* cópia rasa */ }
  novo.genero = genero;
  setState({ perfil: novo, pedirGenero: false });          // :454 — memória
  try {
    return repo.salvarPerfil(novo)                          // :456 — storage, JÁ
      .then(function () { return { ok: true }; })
      .catch(function () { return { ok: true }; });         // :458 — ver hipótese H1
  } catch (_) { return Promise.resolve({ ok: true }); }
}
```

- **A escrita em `pipoca.perfil.v1` acontece na hora**, não num save posterior. A cadeia é: `repo.salvarPerfil` (fachada, `estado.js:226-231`) → `RepositorioLocalStorage.salvarPerfil` (`src/core/persistencia/RepositorioLocalStorage.ts:61-69`) — upsert por `p.id` no array de envelopes e `gravarItem(CHAVE_PERFIS, ...)`; a chave é `CHAVE_PERFIS = "pipoca.perfil.v1"` (`src/core/persistencia/chaves.ts:10`). A gravação no `localStorage` em si é síncrona; o "assíncrono" é só a cadeia de promises (microtasks). A fachada ainda recarrega o cache `_perfis` após gravar (`estado.js:228-230`).
- **O pipeline de save debounced NÃO participa.** `SLICES_PERSISTIVEIS` (`estado.js:275-276`) não inclui `perfil`; `_projetarSave`/`_agendarSave`/`flushSavePendente` (`estado.js:294-326`) gravam o envelope `pipoca.save.v1`, outra chave. Portanto o gênero não "espera o próximo save" — ele já foi para `pipoca.perfil.v1` pela linha `:456`.
- **Reload preserva o gênero.** O boot não auto-restaura o perfil ativo (`state.perfil` nasce `null`, `estado.js:35`; nenhum trecho do boot `estado.js:1151-1183` seta `perfil`) — a criança re-seleciona na T2, e a seleção lê do cache populado por `repo.carregarPerfis()` no boot (`estado.js:1152` → `RepositorioLocalStorage.carregarPerfis`, `RepositorioLocalStorage.ts:51-59`), que lê exatamente o envelope `pipoca.perfil.v1` onde o gênero acabou de ser gravado. Evidência dinâmica existente: `tests/e2e/run-geracao2-canonico.mjs:391-410` — lê o `localStorage` cru e asserta `escolha.persistido === "m"` (`:403`), estado vivo `"m"` (`:404`) e que a ativação seguinte **não** pergunta mais (`:409-410`).

**H1 (hipótese, por leitura de código — sem teste dinâmico):** o comentário em `estado.js:458` — *"o espelho tenta de novo no próximo save"* — não corresponde a nenhum mecanismo localizado. Se `repo.salvarPerfil` falhar, nenhum caminho re-grava `pipoca.perfil.v1`: o pipeline debounced grava `pipoca.save.v1` (e embora `_projetarSave` inclua `perfil` no envelope do save, `estado.js:297`, `_hidratarPerfil` **nunca lê `save.perfil` de volta** — `estado.js:332-348` só aplica `economia/modos/a11y/limites/cardapio/cenariosLiberados/coletaTelemetria`). O comentário pode se referir ao espelho remoto do repo sincronizado (fase06), mas para o envelope local de perfil não há retry. Consequência prática: numa falha de gravação, o estado vivo tem o gênero e o storage não — um reload volta a perguntar (comportamento seguro, mas o comentário promete mais do que o código faz).

### 2. Timing: overlay vs disparo da realização — a janela existe

- **Overlay armado na ativação.** `selecionarPerfil` (`estado.js:413-439`) seta `pedirGenero = !p.genero` tanto no passthrough de mesmo id (`:421`) quanto na troca real (`:432`). O Shell renderiza o overlay quando a flag está de pé (`src/telas/Shell.dc.html:64` e `:155`). O overlay é **não-bloqueante e adiável**: "Depois" só faz `setState({ pedirGenero: false })` sem gravar nada (`src/telas/PedirGenero.dc.html:44`; a escolha real chama `App.definirGeneroPerfil(g)`, `:33`).
- **Realização disparada no commit de cada move.** `aplicarComposicao` (`estado.js:993-999`) aplica o move e chama `_dispararRealizacao()` (`:999`), que monta a entrada e dispara `G.gerar` em background (`estado.js:747-779`), guardando `{chave, promise}` em `_realizacaoPendente` (`:719`, `:772-778`).
- **Janela R1 sem gênero: SIM.** Como o overlay é adiável ("Depois") e não tranca a navegação, a criança pode chegar à T4/T5 e commitar a R1 com `state.perfil.genero === undefined`. Nesse commit, o snapshot de `:760` carrega `genero: undefined`; a jusante, `gerar` aplica `generoValido(undefined) === false` ⇒ `GENERO_CONCORDANCIA_PADRAO` mantendo o nome real (`src/core/geracao/geracao.ts:119-121` e `:163-167`, regra pós-correção de 2026-07-11 — ver `forense-personagem.md`). O e2e cobre exatamente esse braço: "Depois" + rodada ⇒ identidade `{nome: "Pietro", genero: "f"}` (`run-geracao2-canonico.mjs:364-376`).
- **A pendente pré-resposta é reaproveitada como está.** O consumo acontece em `abrirProximaRodadaComposicao` (`estado.js:919-950`): captura `rodadaLida` e `pendenteRealizacao = _realizacaoPendente` **antes** do `setState` que avança a rodada (`:924-925`) e entrega o par a `_capturarHistoriaSalva` (`:944`) ou `_capturarHistoriaIntermediaria` (`:948`), que esperam a promise com teto de 8s e caem no A+ cru se estourar (`_resultadoRealizacao`, `estado.js:783-801`; `TETO_ESPERA_REALIZACAO_MS`, `:720`). **Responder o overlay entre o commit e a captura não re-dispara nada**: a `promise` já foi criada com a entrada congelada (`genero: undefined` embutido no objeto `entrada` de `:752-763`), e nenhum código observa `definirGeneroPerfil` para invalidar/re-disparar a pendente. Disparo novo só acontece no próximo commit — e aí sim substitui o anterior (comentário `estado.js:744-746`).
- **Achado lateral (fato):** a `chave` da pendente (`rodada + ":" + linha`, `estado.js:771`) é gravada em `:773` e **nunca lida** — grep de `chave` em `estado.js` só encontra a escrita (`:719`, `:771`, `:773`). O comentário `:746` ("a captura só consome o pendente da rodada") é garantido apenas pela **ordem** (captura antes do avanço + substituição a cada disparo), não por validação da chave no consumo.

### 3. O snapshot de `:760` é fresco a cada commit

Trecho exato (`src/app/estado.js:747-760`):

```js
function _dispararRealizacao() {
  var G = _geracao();
  if (!G || !state.comp || !state.perfil) { _realizacaoPendente = null; return; }
  ...
  var nivel = state.perfil.nivel || "n2";
  var entrada = {
    ...
    perfil: { nome: state.perfil.nome, genero: state.perfil.genero, nivel: nivel },  // :760
```

- A função lê `state.perfil` **no momento da chamada**, e é chamada no commit de **cada** rodada (`aplicarComposicao`, `estado.js:999`). Não há captura única reutilizada entre rodadas.
- **Perfil editado no meio da sessão reflete** a partir do próximo commit, desde que a edição atualize `state.perfil`: `definirGeneroPerfil` atualiza (`:454`); a tela Perfis grava via `repo.salvarPerfil` e a re-ativação via `selecionarPerfil` repõe o objeto no estado (`:418`/`:427`). O que **não** reflete é a pendente já disparada — a rodada cujo commit antecedeu a edição fica com o snapshot antigo até ser consumida (item 2).

### 4. Baseline de verificação (gates de higiene)

- `bun run typecheck` — exit 0, sem erros.
- `bun run test` — exit 0; último runner: `Total: 11 | ✓ 11 passou | ✗ 0 falhou`; fumaça de presença: `240 histórias (30 arranjos × 2 modos × 4 níveis) · pior presença: 100% · falhas: 0`.
- Diff deste PR: apenas `docs/plans02/analise-ciclo-perfil.md` (este arquivo).

## Veredito

**Fatos (verificados no fonte, com linha):**

1. O gênero respondido no overlay entra no estado vivo E em `pipoca.perfil.v1` no mesmo ato (`estado.js:454-456`); reload preserva (boot relê o envelope, `estado.js:1152`; e2e asserta `run-geracao2-canonico.mjs:403`). Não há dependência de save posterior — `perfil` está fora do pipeline debounced (`estado.js:275-276`).
2. Existe janela em que a R1 (e qualquer rodada) compõe com perfil sem gênero: overlay adiável (`PedirGenero.dc.html:44`) + disparo no commit (`estado.js:999`). Pós-correção, o efeito é concordância padrão com o nome real (`geracao.ts:163-167`) — o traço "Joana substitui a identidade" não vive mais aqui.
3. Uma realização pendente disparada antes da resposta do overlay é consumida com `genero: undefined` congelado; a resposta não invalida nem re-dispara (`estado.js:747-779` + `:919-950` — nenhum gatilho em `definirGeneroPerfil`).
4. O snapshot `{nome, genero, nivel}` é lido fresco a cada commit (`estado.js:760` dentro de função chamada por `:999`), nunca capturado uma vez por sessão.

**Hipóteses (leitura de código, sem teste dinâmico):**

- **H1** — o comentário `estado.js:458` promete retry que não foi localizado para o envelope local de perfil (detalhe na evidência 1).
- **H2** — a ausência de leitura da `chave` (`estado.js:771`) não causa bug hoje porque captura e substituição são bem ordenadas na thread única; é uma garantia por convenção, não por verificação.

## Riscos e opções (sem decidir — decisões são do autor)

1. **Rodada com identidade "meio atualizada".** A criança responde o overlay depois de commitar a R1: a história da R1 sai com concordância padrão, as seguintes com o gênero real — inconsistência dentro da mesma história em crescimento. Opções: (a) aceitar (custo zero; a regra atual já preserva o nome); (b) re-disparar `_dispararRealizacao()` ao responder o overlay quando há pendente não consumida; (c) segurar o primeiro commit enquanto `pedirGenero` estiver de pé (muda UX — hoje o overlay é deliberadamente não-bloqueante).
2. **Comentário enganoso em `estado.js:458` (H1).** Opções: corrigir o comentário; ou implementar retry real (re-tentar `salvarPerfil` no próximo `flushSavePendente`); ou hidratar `perfil` a partir de `save.perfil` (hoje escrito e nunca lido, `estado.js:297` vs `:332-348`) — cada uma com custos distintos de complexidade.
3. **`chave` gravada e nunca lida (H2).** Opções: passar a validar `pendente.chave` contra a rodada/linha lida na captura (defesa em profundidade); ou remover o campo para não sugerir uma garantia que não existe; ou só documentar.
4. **Janela microtask na persistência do gênero.** Reload no instante exato entre o clique e o aterrissar da promise perde a escolha (o e2e espera 50ms por isso, `run-geracao2-canonico.mjs:390`). Risco baixíssimo em uso real; registrado por completude.

## Testes propostos (descrever, NÃO implementar)

- **(a) Persistência imediata do gênero.** Após `App.definirGeneroPerfil("m")` (e aterrissagem da promise), ler `localStorage["pipoca.perfil.v1"]` cru e assertar `genero: "m"` no envelope do perfil ativo — **já coberto** pelo e2e (`run-geracao2-canonico.mjs:391-404`); a versão unitária isolaria a fachada `repo.salvarPerfil` com um `RepositorioLocalStorage` sobre storage fake.
- **(b) Reload preserva.** Recarregar a página (ou re-instanciar o seam) após (a), re-selecionar o perfil e assertar `state.perfil.genero === "m"` e `pedirGenero === false` — fixa a resposta da pergunta 1 ponta a ponta.
- **(c) Janela R1 sem gênero.** Ativar perfil sem gênero, clicar "Depois", commitar a R1 e interceptar a entrada de `G.gerar` (spy no seam): assertar `entrada.perfil.genero === undefined` e que o resultado usa o nome real com concordância `f` — fixa a existência da janela e o comportamento benigno (`geracao.ts:166`).
- **(d) Pendente pré-resposta congelada.** Commitar a R1 sem gênero, responder o overlay ("Um menino") ANTES de abrir a próxima rodada, então abrir: assertar que a história capturada da R1 ainda saiu com concordância `f` (snapshot congelado) e a da R2 com `m` — documenta o comportamento atual da pergunta 2 e vira sentinela se o autor decidir pela opção de re-disparo.
- **(e) Snapshot fresco por rodada.** Editar `state.perfil` (nome ou nível) entre a R1 e a R2 e assertar, via spy em `gerar`, que a entrada da R2 reflete a edição e a da R1 não — fixa a resposta da pergunta 3.
- **(f) Sem retry do envelope de perfil (H1).** Fazer `salvarPerfil` do repo base rejeitar uma vez, responder o overlay, disparar `_agendarSave`/`flushSavePendente` e assertar que `pipoca.perfil.v1` segue SEM o gênero — evidencia que o comentário `:458` não corresponde a mecanismo real (e flipa se o autor implementar o retry).
- **(g) Chave da pendente (H2).** Assertar que a captura consome exatamente a pendente do commit da rodada lida mesmo com um disparo intercalado (commit → novo commit → captura) — hoje passa pela ordem; passaria a ter garantia explícita se `chave` for validada.
