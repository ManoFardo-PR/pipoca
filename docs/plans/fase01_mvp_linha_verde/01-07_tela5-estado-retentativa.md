# fase01 · 01-07 · Tela 5 · Re-tentativa acolhedora

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/telas/Tela5Portao.dc.html` (estado `isStuck`, realce dourado) + `index.html`: 'Ouvir de novo'; nunca X vermelho. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase01-01-07`
- nó(s) da arquitetura: —
- tela(s) do brief: 5
- classe: mvp

## Objetivo
Definir o estado de re-tentativa do portão: quando a criança trava numa palavra difícil, a tela acolhe (destaque dourado suave, fala carinhosa, "Ouvir de novo") — nunca corrige, nunca envergonha.

## Pré-requisitos / Depende de
- `[[fase01-01-06]]` — a tela do portão (texto, `palavras`, `palavraAtual`, `ouvirPalavra`) onde este estado vive.
- `[[fase01-01-09]]` — `ServicoTTS` para o "Ouvir de novo".

## Arquivos afetados
- `src/telas/Tela5Portao.dc.html` (editar) — adicionar o sub-bloco `<sc-if value="{{ isStuck }}">` da re-tentativa acolhedora dentro do estado de leitura.
- `src/core/leitura.ts` (editar) — marcação de palavra "difícil" (`trupé`) derivada de forma neutra (não vinculada a "erro").

## Nomes & variáveis
- `isStuck: boolean` — estado de re-tentativa (mapeia o `isStuck` do protótipo, que vinha de `curWord.hard`). Aqui é "esta palavra é trupé", não "a criança errou".
- `palavraTrupe: string` — a palavra atual quando difícil (para a mensagem). Deriva de `palavras[palavraAtual]`.
- `mensagemAcolhimento: string` — texto fixo carinhoso: "Essa palavra é trupé, né? Sem pressa." (do protótipo).
Ações canônicas ([[_contratos/eventos-acoes]]):
- `ouvirPalavra(i)` — reusada pelo botão "Ouvir de novo" (era `gateRetry` / `_speak(curWord.w)` no protótipo).
Sem nomes novos de ação: a re-tentativa reaproveita `ouvirPalavra` do portão.

## Interfaces / contratos
- `ServicoTTS.falar(texto, opts?)` ([[_contratos/tipos-core]]) — modela o som da palavra trupé.
- `A11yPrefs` ([[_contratos/tipos-core]]) — o realce suave respeita contraste/reduceMotion ([[fase01-01-13]]).
- `Trecho` ([[_contratos/tipos-core]]) — a palavra trupé é apenas uma palavra do `Trecho.texto`; nenhuma noção de "resposta certa/errada" existe no contrato.

## Regras de negócio
1. **Nunca X vermelho.** O estado de re-tentativa usa destaque dourado suave (`#fbe6b8` / glow âmbar), nunca vermelho, nunca um "✕".
2. **Nunca "errado/reprovado".** Nenhum texto de erro, reprovação ou correção. A linguagem é "trupé", "sem pressa", "aqui ninguém erra".
3. **Sensibilidade à rejeição (2e):** a re-tentativa é enquadrada como acolhimento, não como falha — a criança decide quando tentar de novo; não há tempo limite nem contagem de tentativas.
4. **Modelar, não cobrar:** "Ouvir de novo" toca o TTS da palavra para a criança imitar; não há verificação de pronúncia no MVP (fala/ASR é [[fase05-05-09]]).
5. **Re-tentativa não bloqueia progresso:** a criança pode seguir com `proximaPalavra()` quando quiser — travar nunca tranca a tela.
6. **Acolhimento previsível:** mesma palavra trupé → mesma mensagem e mesmo realce (feedback previsível do brief).

## Passos de implementação
1. Em `src/core/leitura.ts`, expor `ehPalavraDificil(palavra: string): boolean` (heurística neutra: dígrafos, palavras longas, hífen como "vaga-lume") — substitui o flag `hard` hardcoded.
2. Na lógica da Tela 5, derivar `isStuck = ehPalavraDificil(palavras[palavraAtual])` e `palavraTrupe = palavras[palavraAtual]`.
3. Adicionar o `<sc-if value="{{ isStuck }}">` com: ícone-glow dourado, `mensagemAcolhimento`, subtítulo ("Ouça de novo, sussurre junto, e tente quando quiser. Aqui ninguém erra.") e botão "🔊 Ouvir de novo" → `onClick="{{ ouvirDeNovo }}"`.
4. Ligar `ouvirDeNovo` a `ouvirPalavra(palavraAtual)` (reuso da ação do portão).
5. Aplicar o realce suave via estilo que lê `A11yPrefs` (sem glow se `reduceMotion`; tinta mais escura se `contrast`).
6. Garantir que a re-tentativa não altera `palavraAtual` automaticamente nem força avanço.

## Estados / edge-cases
- **lendo (palavra fácil):** `isStuck=false` — sem bloco de re-tentativa.
- **re-tentativa acolhedora:** `isStuck=true` — destaque dourado + "Ouvir de novo".
- **toque repetido em "Ouvir de novo":** o TTS cancela e refala (sem fila acumulando) — ver [[fase01-01-09]].
- **sem voz pt-BR:** "Ouvir de novo" degrada silenciosamente (fallback), a mensagem e o realce permanecem — [[fase01-01-09]].
- **reduceMotion:** sem pulso/glow animado; realce estático.
- **criança ignora e segue:** `proximaPalavra()` funciona normalmente, sem penalidade.

## Critérios de aceitação / verificação
- [ ] Numa palavra difícil, aparece destaque dourado e a frase "Essa palavra é trupé, né? Sem pressa." — sem nenhum vermelho/✕.
- [ ] "Ouvir de novo" chama `ServicoTTS.falar` com a palavra trupé.
- [ ] Nenhuma string de "erro/errado/reprovado" no estado de re-tentativa.
- [ ] A criança consegue avançar (`proximaPalavra`) sem ter resolvido a palavra trupé.
- [ ] Com `reduceMotion`, o realce não anima.
- [ ] Com `contrast`, o realce usa a tinta de alto contraste.

## Relações com outros docs
- Depende de: `[[fase01-01-06]]`, `[[fase01-01-09]]`
- É consumido por: `[[fase01-01-08]]` (após a leitura, segue para verificação)
- Reconcilia / conserta: —
