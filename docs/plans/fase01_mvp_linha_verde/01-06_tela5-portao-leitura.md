# fase01 · 01-06 · Tela 5 · O portão (leitura)

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/telas/Tela5Portao.dc.html` + `src/core/leitura.ts` (`tokenizarTrecho`) + `index.html`: leitura palavra a palavra, TTS, barra de progresso. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase01-01-06`
- nó(s) da arquitetura: T5
- tela(s) do brief: 5
- classe: mvp

## Objetivo
Construir o portão de leitura (Tela 5): o `Trecho` atual da história em texto grande, palavra por palavra, com a palavra atual destacada e a possibilidade de tocar para ouvir — é aqui que a leitura "destrava o mundo" (Premack), governado pela regra de ouro.

## Pré-requisitos / Depende de
- `[[fase00-00-16]]` — contrato `MotorNarrativa` / `Trecho` (CN); a tela só consome este seam.
- `[[fase01-01-05]]` — a Tela 4 chama `lerEmVozAlta` e entrega o `objetoId` que está sendo lido / a transição para o portão.
- `[[fase01-01-09]]` — `ServicoTTS` para `falar()` ao tocar uma palavra.

## Arquivos afetados
- `src/telas/Tela5Portao.dc.html` (criar) — o template do portão (estado de leitura) + a lógica `class Component extends DCLogic`.
- `src/core/leitura.ts` (criar) — derivação do texto do `Trecho` em "palavras" tokenizadas e o índice da palavra atual (sem UI, sem TTS).
- `src/componentes/BarraLeitura.dc.html` (consumir) — indicador "frase N de M" / progresso do portão (folha de componentes, [[fase00-00-04]]).

## Nomes & variáveis
Estado local da tela (substitui o estado ad-hoc do protótipo `readWord` / `gateStage`):
- `trechoAtual: Trecho` — vem do `MotorNarrativa` (não é montado pela tela). Substitui o `_gateWords()` **hardcoded** do protótipo.
- `palavras: string[]` — tokenização de `trechoAtual.texto` (derivada em `src/core/leitura.ts`). Substitui o array literal `_gateWords()`.
- `palavraAtual: number` — índice 0-based da palavra destacada (era `state.readWord`).
- `totalFrases: number` / `fraseAtual: number` — para "frase N de M" (era o texto fixo "frase 2 de 4").
Ações canônicas expostas em `renderVals()` ([[_contratos/eventos-acoes]]):
- `ouvirPalavra(i)` — TTS da palavra `i` (era `_onWordTap(i)` / `ouvirAtual`).
- `proximaPalavra()` — avança o destaque ou conclui o trecho (era `gateNext` / `_gateNext`).
- `lerEmVozAlta()` — entrada nesta tela vinda da T4 (era `onReadAloud`); aqui só consome o `objetoId` em leitura.
- `irParaTela(n)` — voltar à cena (era `backFromGate` → T4).
- `abrirAjustesA11y()` — engrenagem "Do meu jeito" (era `openSettings`).

## Interfaces / contratos
- `MotorNarrativa` e `Trecho` ([[_contratos/tipos-core]]) — a tela recebe o `Trecho` já calculado; **não** importa nenhum motor concreto (LEI DO SEAM).
- `ServicoTTS.falar(texto, opts?)` ([[_contratos/tipos-core]]) — usado por `ouvirPalavra`.
- `A11yPrefs` ([[_contratos/tipos-core]]) — fonte/letter-spacing/contraste/silábico aplicados ao texto do portão (detalhe em [[fase01-01-13]]).
- `HistoriaState` ([[_contratos/tipos-core]]) — `objetos` (em ordem) é o argumento `historia` que a app passou ao motor para obter `trechoAtual`.

## Regras de negócio
1. **Regra de ouro (graph-driven):** o texto do portão é sempre um `Trecho.texto` produzido pelo `MotorNarrativa` para o `Nivel` do perfil — nunca um texto fixo na tela. "Todo fragmento novo precisa ser lido no portão antes de soltar o próximo objeto."
2. **Premack:** só ao concluir a leitura do trecho a app pode commitar o objeto e destravar o próximo — o portão é a porta entre brincar e ler. (O commit/credito é do [[fase01-01-08]], não desta tela.)
3. **Texto por `Nivel`:** o `Trecho` já chega no nível correto (`n1..n4`) — a tela não escolhe variação; só renderiza.
4. **Tocar palavra → TTS:** `ouvirPalavra(i)` chama `ServicoTTS.falar(palavras[i])` e marca `palavraAtual = i`.
5. **"frase N de M":** `M` = número de fragmentos lidos/por ler na sessão de leitura corrente; `N` = posição da frase atual. Sempre visível, calmo, sem cobrança.
6. **Sem motor concreto:** esta tela importa apenas `MotorNarrativa`/`ValidadorOrdem` — nunca `MA` nem `MB` (troca de motor só na fábrica [[fase00-00-19]]).
7. **Um foco por tela:** o portão mostra só o trecho + controles de leitura; nada de cena rica competindo (calma sensorial do brief).

## Passos de implementação
1. Em `src/core/leitura.ts`, criar `tokenizarTrecho(t: Trecho): string[]` — quebra `t.texto` em palavras preservando pontuação anexa; puro, testável.
2. Criar `Tela5Portao.dc.html` com o bloco `<x-dc>` do estado de leitura: container do texto + `<sc-for list="{{ palavras }}" as="gwd">` renderizando cada palavra como `<span onClick="{{ gwd.onTap }}" style="{{ gwd.style }}">`.
3. Na lógica, receber `trechoAtual` (via props/estado raiz CORE) e derivar `palavras = tokenizarTrecho(trechoAtual)`; inicializar `palavraAtual = 0`.
4. Implementar `ouvirPalavra(i)`: `setState({ palavraAtual: i })` e `this.tts.falar(palavras[i])` (instância injetada de `ServicoTTS`).
5. Implementar `proximaPalavra()`: se `palavraAtual < palavras.length-1` → incrementa e fala a próxima; senão → sinaliza fim do trecho (entra na fase de verificação de [[fase01-01-08]]).
6. Calcular o estilo de cada palavra lendo `A11yPrefs` (font Atkinson se `dyslexia`, `letter-spacing`, destaque silábico se `syllable`, contraste) — delega regras a [[fase01-01-13]].
7. Renderizar `BarraLeitura` com `fraseAtual`/`totalFrases`.
8. Ligar `irParaTela(4)` no botão "Voltar à cena" e `abrirAjustesA11y()` na engrenagem.

## Estados / edge-cases
- **vazio:** `trechoAtual` ausente (ex.: chegou no portão sem objeto) → não renderiza palavras tocáveis; volta calma à T4 via `irParaTela(4)`.
- **lendo:** estado padrão — uma palavra destacada, demais legíveis.
- **palavra difícil ("trupé"):** entra o estado `isStuck` da re-tentativa acolhedora — detalhado em [[fase01-01-07]].
- **fim do trecho:** `proximaPalavra()` no último índice → handoff para verificação [[fase01-01-08]] (não credita aqui).
- **sem voz pt-BR:** o TTS degrada (fallback) sem quebrar a leitura — ver [[fase01-01-09]]; a palavra ainda destaca.
- **reduceMotion:** sem animação de transição entre palavras (corte seco) — [[fase01-01-13]].

## Critérios de aceitação / verificação
- [ ] O texto do portão vem de `MotorNarrativa.abertura/aoAdicionarObjeto/desfecho` (fixtures de [[fase00-00-21]]), nunca de array fixo.
- [ ] Trocar o `Nivel` muda o texto sem mudar a tela (mesmo `Trecho`, conteúdo `n1..n4`).
- [ ] Tocar uma palavra chama `ServicoTTS.falar` com aquela palavra e a destaca.
- [ ] `proximaPalavra()` percorre todas as palavras e, no fim, dispara a verificação.
- [ ] Nenhum import de `MA`/`MB` nesta tela (auditoria do checker).
- [ ] `A11yPrefs` altera fonte/espaçamento/silábico/contraste do texto do portão.

## Relações com outros docs
- Depende de: `[[fase00-00-16]]`, `[[fase01-01-05]]`, `[[fase01-01-09]]`
- É consumido por: `[[fase01-01-07]]` (re-tentativa), `[[fase01-01-08]]` (verificação)
- Reconcilia / conserta: `[[fase00-00-20]]` (a ordem da tira / "história em ordem" que alimenta o trecho do portão sai do grafo, não de um array fixo)
