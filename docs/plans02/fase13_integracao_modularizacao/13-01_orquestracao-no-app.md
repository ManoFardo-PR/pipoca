# fase13 · 13-01 · Orquestração no app (leitura)

> ✅ **STATUS · 2026-07-11 · IMPLEMENTADA** — fichas carregadas no boot ao lado do grafo (`src/app/estado.js:694`, chamada :1117); realização por LLM disparada em BACKGROUND no commit do move (`_dispararRealizacao` :717, chamado em aplicarComposicao :969); prévia do portão segue DETERMINÍSTICA (D-13.2 — zero LLM por movimento, provado no e2e `tests/e2e/run-geracao2-canonico.mjs`); captura com teto de espera de 8s e fallback A+ cru (`_resultadoRealizacao` :753). Gênero ADITIVO no perfil (`src/core/perfil.ts`, telas Onboarding/Perfis); legado sem gênero ⇒ personagem canônico. Roteiro: ../TRILHA-plans02.md

## Identidade
- id: `fase13-13-01`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Planejar o fluxo runtime da leitura na geração 2 — do arranjo da criança ao texto exibido no portão — com o ponto de enxerto exato no código real, o orçamento de latência e o encaixe no padrão prévia-depois-commit.

## Pré-requisitos / Depende de
- `[[fase13-13-00]]` — as fronteiras e o orquestrador.
- `[[fase11-11-00]]` — o Pacote que o compositor emite.
- `[[fase12-12-00]]` — o realizador que o consome.
- `[[fase12-12-04]]` — a política de falha que governa o caminho infeliz.

## Arquivos afetados
Nesta fase, nenhum. Na implementação, o enxerto acontece em `src/app/estado.js` (o módulo de estado do app; fluxo real verificado abaixo) e no bridge (`src/app/bridge.ts`), sem tocar `src/core/composicao.ts`.

## Nomes & variáveis
- `montarComposicao` — a função ATUAL do app que tece o texto do portão (`src/app/estado.js:792-796`, chama `C.montar`): o ponto de enxerto principal.
- `preverComposicao` / `aplicarComposicao` — o padrão prévia-depois-commit verificado (`src/app/estado.js:857-863` e :866; `_aplicarMove` puro :842-855). Comentário no código: "Prévia SEM efeito colateral… T4 mostra o portão sem consumir a rodada; voltar de T5 é sem perdas" (:857-858).
- `abrirProximaRodadaComposicao` — avanço de rodada e captura da história na convergência (`src/app/estado.js:799-823`; captura :805-820).
- Tipo Perfil (`src/core/perfil.ts:21-27`) — o tipo real: id, nome, idade, nível, avatarId; grafado sem code-span aqui para não colidir com o parâmetro `perfil` do compor ([[fase11-11-01]]). **Sem campo de gênero** (ver gap abaixo).
- Reaproveitados com grafia idêntica: `compor` ([[fase11-11-01]]); `realizar`, `veredito` ([[fase12-12-00]]); `PipocaCanonico` ([[fase13-13-00]]).

## Interfaces / contratos

### O fluxo novo (nos portões de leitura)
1. A criança monta/ajusta o arranjo (R1 ordena; R2+ insere no miolo) — mecânica atual intocada (`ordenarR1Composicao` :755, `inserirComposicao` :768).
2. No portão: o módulo de geração (`src/core/geracao/`, [[fase13-13-00]]) monta `estado + fichas + perfil` → `compor` → `PacoteComposicao`.
3. `realizar(pacote, opcoes)` no edge → `{ texto, paragrafos, veredito }`; falha → cascata → fallback A+ v3 ([[fase12-12-04]]).
4. O app exibe `paragrafos` e segue o fluxo atual (avanço de rodada, captura na convergência — persistência em [[fase13-13-02]]).

### Ponto de enxerto exato (antes/depois, sem código)
- **Hoje:** o portão exibe o texto de `montarComposicao(nivel)` (`src/app/estado.js:792-796`) — determinístico, síncrono, instantâneo.
- **Depois:** no mesmo lugar do fluxo, o texto vem do módulo de geração (compositor→realizador, assíncrono); `montarComposicao` permanece como está — vira o caminho de fallback e de prévia (abaixo). O boot ganha a carga das fichas ao lado da carga do grafo (`_initComposicao` :665-676 é o precedente do fetch estático).

### Latência: gerar em background (requisito)
A realização via LLM é assíncrona e cara; o orçamento de latência NATURAL é o tempo em que a criança compõe a cena (arrasta, ordena, pensa). Requisito registrado: o módulo de geração dispara a realização em background assim que o arranjo estabiliza (ex.: no commit do move), e o portão abre com o texto já pronto na maioria dos casos; se ainda não chegou, indicador de espera curto com teto — estourou, fallback ([[fase12-12-04]]). Implementação (debounce, cancelamento de gerações obsoletas ao mudar o arranjo) é detalhe posterior; o requisito é: **a criança não espera o LLM de braços cruzados**.

### Prévia-depois-commit (T4/T5) e o realizador
O padrão atual é sagrado: `preverComposicao` tece a prévia SEM consumir a rodada (:857-863), e só `aplicarComposicao` commita (:866). Encaixe do realizador:

**Decisão fixada (2026-07-09):** a PRÉVIA do portão é DETERMINÍSTICA (A+ v3 via `montarComposicao`); a realização por LLM acontece só no COMMIT. Prévia realizada custaria uma chamada de LLM por movimento da criança — briga frontal com o orçamento de latência acima. A prévia crua mostra o efeito do arranjo; o texto LIDO no portão é o realizado. Nota de jardim: a diferença prévia↔texto-final é HIPÓTESE a observar na sessão real — não resolver antes de observar.

### Gap real: o gênero do personagem
O Pacote exige `personagem.genero` ([[fase11-11-00]]), vindo do perfil (invariante de [[fase10-10-00]]). **O tipo Perfil atual NÃO tem campo de gênero** (verificado: `src/core/perfil.ts:21-27` — id, nome, idade, nivel, avatarId). Extensão do perfil é PRÉ-REQUISITO de integração.
**Decisão fixada (2026-07-09):** campo ADITIVO OPCIONAL no `pipoca.perfil.v1` — o envelope de storage local evolui aditivamente (leitores antigos ignoram o campo novo); `.v2` fica reservado para mudança que QUEBRE o shape. Distinção de regra registrada: "nunca mutar `.vN`" protege schemas AUTORAIS publicados (fichas, grafo); storage local aceita campo opcional novo sem trocar de versão.

## Regras de negócio
1. **A mecânica de composição da criança não muda:** ordenar/inserir/compor/portões são os atuais; a geração 2 troca a ORIGEM DO TEXTO, não o brinquedo.
2. **Background-first:** realização disparada durante a composição; portão com teto de espera; estouro → fallback.
3. **Prévia jamais consome rodada** (padrão verificado — preservado seja qual for a decisão da prévia).
4. **Geração obsoleta se descarta:** mudou o arranjo depois de disparada a realização → o resultado antigo não pode aparecer (cancelar/ignorar por id de arranjo).
5. **Perfil completo antes de compor:** sem nome+gênero+nível não há Pacote — falha explícita a montante, nunca texto com personagem "meio certo".

## Passos de implementação
1. Estender o perfil com o gênero (campo aditivo opcional no `pipoca.perfil.v1` — decisão fixada); ajustar cadastro/telas da geração 1 que criam perfil (fase 02 — citado como contexto, sem tocar agora).
2. Implementar o disparo em background no commit do move + descarte de gerações obsoletas.
3. Enxertar no portão: texto do módulo de geração com teto de espera; `montarComposicao` como fallback e prévia (decisão fixada).
4. Testar o fluxo feliz e o infeliz (matriz de [[fase12-12-04]]) numa sessão real — incluindo a observação da hipótese prévia↔texto-final.

## Estados / edge-cases
- Portão aberto antes da realização terminar → espera curta com teto → fallback (nunca tela travada).
- Arranjo mudou após disparo → geração descartada; nova dispara no próximo commit.
- Fichas ausentes/corrompidas no boot → caminho v3 puro (como hoje), origem sinalizada.
- Perfil legado sem gênero (criado antes da extensão) → o campo é opcional (ausência é estado legal no storage); a experiência de completar o cadastro se define na implementação — nunca inferir do nome.
- Convergência com texto de fallback → salva normalmente ([[fase13-13-02]]), origem registrada.

## Critérios de aceitação / verificação
- [ ] Fluxo novo descrito de ponta a ponta com o ponto de enxerto real (caminho:linha).
- [ ] Requisito de latência (background durante a composição; teto no portão) registrado.
- [ ] Prévia-depois-commit preservado; prévia determinística fixada (LLM só no commit) com a nota de jardim.
- [ ] Gap do gênero no tipo Perfil registrado com a extensão fixada (campo aditivo opcional no `pipoca.perfil.v1`).
- [ ] Nenhuma mudança na mecânica de composição da criança.

## Relações com outros docs
- Depende de: `[[fase13-13-00]]`, `[[fase11-11-00]]`, `[[fase12-12-00]]`, `[[fase12-12-04]]`
- É consumido por: `[[fase13-13-02]]` (a captura na convergência ganha o Pacote de origem)
- Reconcilia / conserta: —
