# B8 — T5 (portão de leitura) acessível por teclado e leitor de tela; T6 anuncia a celebração

**Unidade de deploy:** CRU (`src/telas/Tela5Portao.dc.html`, `Tela6Recompensa.dc.html`).
**Depende de:** B3 (foco visível). **Desbloqueia:** —.

## Objetivo
A leitura palavra a palavra — o momento pedagógico do app — funciona com teclado e é narrada
pelo leitor de tela; a recompensa da T6 é anunciada, não só mostrada.

## Por quê (evidência)
- As palavras da frase são `<span onClick>` (`Tela5Portao.dc.html:59`) — sem `role`, sem
  `tabindex`, sem `<button>`: a mecânica central é 100% invisível ao leitor de tela e inacessível
  por teclado (UI-C43). A troca da palavra destacada não emite `aria-live`.
- Barra de progresso é `<div>` estilizado (`:50-51`), sem `role="progressbar"`/`aria-valuenow`;
  "Palavra 1 de 7" existe como texto (`:47`) mas não é anunciado quando muda.
- Pontos fortes a manter: `role="status" aria-live="polite"` em 3 estados (`:36,115,118`);
  hierarquia visual exemplar; `clamp()` tipográfico (`:387-389`) — única resposta responsiva boa.
- T6: **0 `aria-`** (`Tela6Recompensa.dc.html`); "+3", "Você leu! 🎉", "Novo amigo desbloqueado"
  e o emoji do objeto (`:45`) aparecem sem `aria-live` — o leitor de tela não sabe que a criança
  ganhou algo; círculo âmbar decorativo (`:33`) lido como conteúdo.
- Contraste: "🌱 Leu sozinho" branco sobre `#7da94f` = 2,74:1 (`:96,120`); texto do "travou"
  `#a0863e`/`#fffbf0` = 3,40:1 (`:70`); "14%" em `#9a8a72` (`:48`) — B2 fornece tokens.
- Emojis funcionais sem rótulo (🔊 `:` "Ouvir", 🌱, 💚) (UI-C47).

## Escopo (arquivos)
- `src/telas/Tela5Portao.dc.html` (:36, :47-51, :59, :70, :96, :115-120, :152-179 TTS).
- `src/telas/Tela6Recompensa.dc.html` (:22-67).

## Passos
1. Palavras → `<button class="pip-palavra" aria-current="{{ atual ? 'true' : null }}">` com
   `aria-label="{{ palavra }}, palavra {{ i+1 }} de {{ n }}"`; foco inicial na palavra atual ao
   entrar em `gateStage:"reading"`; Enter/Espaço = mesmo handler do toque; setas ←/→ opcionais.
2. Um `role="status" aria-live="polite"` dedicado à leitura: "Palavra 3 de 7: luzinha" a cada
   avanço (reusar o `_status` existente).
3. Barra: `role="progressbar" aria-valuemin=0 aria-valuemax={{n}} aria-valuenow={{idx+1}} aria-label="Progresso da leitura"`.
4. Emojis com `aria-hidden` + texto visível ou `aria-label` nos botões ("Ouvir", "Leu sozinho",
   "Lemos juntos").
5. T6: contêiner da celebração com `role="status" aria-live="polite"` e frase completa
   ("Você leu! Ganhou 3 vaga-lumes. Novo amigo: o gato."); decorativos com `aria-hidden`.
6. Cores de B2 nos pontos de contraste citados.

## Critérios de aceite
- Com leitor de tela (NVDA/VoiceOver/TalkBack): entrar no portão anuncia a frase e a palavra
  atual; cada avanço é anunciado; T6 anuncia a recompensa.
- Tab percorre as palavras; Enter avança como o toque.
- e2e linha-verde e reordenar-miolo verdes (o texto lido não muda).

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs
node tests/e2e/run-reordenar-miolo.mjs
```
Teste manual de teclado; opcional: `axe-core` via playwright no scratchpad.

## Riscos e cuidados
- `<button>` dentro do cartão da frase muda o layout inline (`gap:4px 2px`, `padding:3px 12px`) —
  manter as mesmas medidas com `all:unset` + classes.
- `Tela5:59` usa `onClick` com índice — preservar o handler e a idempotência do crédito (`:261-262`).

## Decisões do dono (default)
- Navegação por setas entre palavras (default: **sim**, custo baixo).
