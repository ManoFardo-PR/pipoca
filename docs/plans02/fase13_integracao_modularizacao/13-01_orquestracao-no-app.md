# fase13 · 13-01 · Orquestração no app (leitura)

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
2. No portão: o orquestrador monta `estado + fichas + perfil` → `compor` → `PacoteComposicao`.
3. `realizar(pacote, opcoes)` no edge → `{ texto, paragrafos, veredito }`; falha → cascata → fallback A+ v3 ([[fase12-12-04]]).
4. O app exibe `paragrafos` e segue o fluxo atual (avanço de rodada, captura na convergência — persistência em [[fase13-13-02]]).

### Ponto de enxerto exato (antes/depois, sem código)
- **Hoje:** o portão exibe o texto de `montarComposicao(nivel)` (`src/app/estado.js:792-796`) — determinístico, síncrono, instantâneo.
- **Depois:** no mesmo lugar do fluxo, o texto vem do orquestrador (compositor→realizador, assíncrono); `montarComposicao` permanece como está — vira o caminho de fallback e de prévia (abaixo). O boot ganha a carga das fichas ao lado da carga do grafo (`_initComposicao` :665-676 é o precedente do fetch estático).

### Latência: gerar em background (requisito)
A realização via LLM é assíncrona e cara; o orçamento de latência NATURAL é o tempo em que a criança compõe a cena (arrasta, ordena, pensa). Requisito registrado: o orquestrador dispara a realização em background assim que o arranjo estabiliza (ex.: no commit do move), e o portão abre com o texto já pronto na maioria dos casos; se ainda não chegou, indicador de espera curto com teto — estourou, fallback ([[fase12-12-04]]). Implementação (debounce, cancelamento de gerações obsoletas ao mudar o arranjo) é detalhe posterior; o requisito é: **a criança não espera o LLM de braços cruzados**.

### Prévia-depois-commit (T4/T5) e o realizador
O padrão atual é sagrado: `preverComposicao` tece a prévia SEM consumir a rodada (:857-863), e só `aplicarComposicao` commita (:866). Encaixe do realizador:

**DECISÃO ABERTA:** a PRÉVIA do portão usa o realizador ou permanece determinística?
- Opção A — prévia determinística (A+ v3 via `montarComposicao`), realização LLM só no commit: zero custo/latência por move; a prévia mostra a história "de madeira" e o commit entrega a "de verdade". Custo: prévia e texto final diferem.
- Opção B — prévia também realizada (LLM a cada prévia): fidelidade visual total, mas custo e latência por move de arrasto — briga com o orçamento de latência acima.
A validação em escala + uma sessão real decidem; nenhum default fixado aqui.

### Gap real: o gênero do personagem
O Pacote exige `personagem.genero` ([[fase11-11-00]]), vindo do perfil (invariante de [[fase10-10-00]]). **O tipo Perfil atual NÃO tem campo de gênero** (verificado: `src/core/perfil.ts:21-27` — id, nome, idade, nivel, avatarId). Extensão do perfil é PRÉ-REQUISITO de integração.
**DECISÃO ABERTA:** a extensão é campo aditivo no `pipoca.perfil.v1` (com valor padrão e migração leniente — o `RepositorioLocalStorage` já valida por schema) ou um `pipoca.perfil.v2` (invariante da casa: `.vN` publicado não muta — mas o v1 do perfil é schema de STORAGE local, não arquivo autoral; registrar a nuance para o Manoel decidir).

## Regras de negócio
1. **A mecânica de composição da criança não muda:** ordenar/inserir/compor/portões são os atuais; a geração 2 troca a ORIGEM DO TEXTO, não o brinquedo.
2. **Background-first:** realização disparada durante a composição; portão com teto de espera; estouro → fallback.
3. **Prévia jamais consome rodada** (padrão verificado — preservado seja qual for a decisão da prévia).
4. **Geração obsoleta se descarta:** mudou o arranjo depois de disparada a realização → o resultado antigo não pode aparecer (cancelar/ignorar por id de arranjo).
5. **Perfil completo antes de compor:** sem nome+gênero+nível não há Pacote — falha explícita a montante, nunca texto com personagem "meio certo".

## Passos de implementação
1. Fechar as DECISÕES ABERTAS (prévia; extensão do perfil) com o Manoel.
2. Estender o perfil (gênero) conforme decidido; ajustar cadastro/telas da geração 1 que criam perfil (fase 02 — citado como contexto, sem tocar agora).
3. Implementar o disparo em background no commit do move + descarte de gerações obsoletas.
4. Enxertar no portão: texto do orquestrador com teto de espera; `montarComposicao` como fallback/prévia.
5. Testar o fluxo feliz e o infeliz (matriz de [[fase12-12-04]]) numa sessão real.

## Estados / edge-cases
- Portão aberto antes da realização terminar → espera curta com teto → fallback (nunca tela travada).
- Arranjo mudou após disparo → geração descartada; nova dispara no próximo commit.
- Fichas ausentes/corrompidas no boot → caminho v3 puro (como hoje), origem sinalizada.
- Perfil legado sem gênero (criado antes da extensão) → fluxo de completar cadastro OU padrão neutro — definido junto com a DECISÃO ABERTA da extensão; nunca inferir do nome.
- Convergência com texto de fallback → salva normalmente ([[fase13-13-02]]), origem registrada.

## Critérios de aceitação / verificação
- [ ] Fluxo novo descrito de ponta a ponta com o ponto de enxerto real (caminho:linha).
- [ ] Requisito de latência (background durante a composição; teto no portão) registrado.
- [ ] Prévia-depois-commit preservado, com a DECISÃO ABERTA da prévia registrada (2 opções).
- [ ] Gap do gênero no tipo Perfil registrado com a DECISÃO ABERTA da extensão.
- [ ] Nenhuma mudança na mecânica de composição da criança.

## Relações com outros docs
- Depende de: `[[fase13-13-00]]`, `[[fase11-11-00]]`, `[[fase12-12-00]]`, `[[fase12-12-04]]`
- É consumido por: `[[fase13-13-02]]` (a captura na convergência ganha o Pacote de origem)
- Reconcilia / conserta: —
