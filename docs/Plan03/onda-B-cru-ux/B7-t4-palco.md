# B7 — T4 (palco de composição): alvos, feedback, copy e o beco

> Status: pendente

**Unidade de deploy:** CRU (`src/telas/Tela4Heroi.dc.html`, `Tela5Portao.dc.html:355-361`).
**Depende de:** nada (B2 fornece os tokens de contraste, mas pode usar hex provisório).
**Desbloqueia:** —.

## Objetivo
A mecânica-coração do produto (ordenar a cena) tem alvos que uma criança acerta, nunca
engole um toque em silêncio, explica-se em palavras da faixa etária (com áudio), e não prende
a criança numa instrução impossível.

## Por quê (evidência)
- Controles de reordenar ◀ ✕ ▶ medidos em **26×26px** (`Tela4Heroi.dc.html:256`), três alvos
  colados com `gap:4px` (`:68`) — o pior alvo do app, na mecânica central (UI-C12). Lacuna de
  inserção "+" = 40px de largura (`:345`, UI-C20). Chips do banco = 108×104 ✓ e CTA "📖 Ler em
  voz alta →" = 214×57 ✓ (manter).
- Ordinais "1º 2º 3º" com 1,74:1 (`:292`, `rgba(122,106,84,.55)` sobre `#f6e3bf`) (UI-C22);
  selo "🔒 âncora" a 10px bold com 2,63:1 (`:62`) (UI-C30); dica em `#8a7a64` 14,5px (`:47,266`).
- Toques engolidos: chip quando já há 3 (`:305` `onTap: cheio ? (() => {})`), gap sem seleção
  (`:344`), toque bloqueado (`:398`) — sem toast, sem sacudida, sem fala (UI-C39).
- Copy: "As pontas viram **âncoras** da história." (`:266`) e "Você pode **reordenar** as peças
  do meio com ◀ ▶; as pontas ficam de âncora." (`:316`) — dois conceitos abstratos e glifos sem
  legenda num app de alfabetização; a instrução mais longa/pequena/apagada está na tela que mais
  precisa ser entendida, e não há botão de áudio (o TTS existe em `Tela5:152-179`) (UI-C41/C42).
- Densidade invertida: ~55% de vazio entre o chip e o rodapé enquanto os controles são micro (UI-C07).
- Voltar da T5 (`Tela5:355-361` → `gatePendente:null`) + `Tela4:136-141` (`_sync` reseta
  `arranjo: []`) descarta a composição sem aviso (UI-C37). Possível beco: instrução "Escolha 3
  coisas" com banco de 1 e `lerDisabled = arranjo.length !== 3` (`:266,298-311`) — observado com
  estado semeado por seam; **confirmar no fluxo real** antes de tratar como bug (incerteza nº 1
  do catálogo).
- CTA desabilitado `disabled="{{ lerDisabled }}"` (`:102`) sem `aria-describedby` para a dica
  "Coloque 3 coisas para poder ler." (`:101`).

## Escopo (arquivos)
- `src/telas/Tela4Heroi.dc.html` (:16 hover, :47, :62, :68-73, :101-102, :136-141, :256, :266,
  :292, :298-316, :344-345, :398).
- `src/telas/Tela5Portao.dc.html:355-361` (`voltarCena`).

## Passos
1. ◀ ✕ ▶ com `min-width/min-height:48px`, `gap:10px`, `aria-label` ("Mover para a esquerda",
   "Tirar", "Mover para a direita"); lacuna "+" ≥48px de largura.
2. Ordinais e selo com cores de contraste (tokens de B2 ou `var(--pip-tinta)` com opacidade ≥.8);
   selo "🔒 âncora" → "🔒 fica aqui" a ≥12px.
3. Feedback para todo toque engolido: sacudida curta (respeitando `--pip-mov`) + frase curta
   via `role="status"` ("Já tem 3! Tire uma para trocar." / "Toque num espacinho primeiro.") —
   reusar o padrão de status da T5 (`Tela5:36,115,118`).
4. Copy: "Escolha 3 coisas" / "As de fora ficam no lugar. As do meio você pode trocar de ordem."
   + botão 🔊 que lê a instrução com o mesmo TTS da T5 (extrair o helper para um lugar comum ou
   copiar as ~20 linhas — o `Canon.tts` existe, `bridge.ts:276`).
5. `aria-describedby` do CTA apontando para a dica; anunciar a ordem da cena (`aria-live=polite`:
   "folha colocada na 1ª posição").
6. Voltar da T5: preservar o arranjo (não resetar em `_sync` quando a rodada é a mesma) ou pedir
   confirmação — o comentário de `Tela5:355` promete "voltar sem perdas"; fazer valer.
7. Reproduzir o beco no fluxo real (R1 com banco 4; voltar da T5; re-entrar) e, se ocorrer, nunca
   pedir mais peças do que o banco tem (`Math.min(3, banco.length)`).
8. Reequilibrar a densidade: subir os controles para junto dos slots, reduzir o vazio.

## Critérios de aceite
- Sonda: todos os alvos da T4 ≥48px.
- Cada toque sem efeito produz feedback visível e falado (status).
- Razões dos ordinais/selo/dica ≥4,5:1.
- Voltar da T5 e re-entrar na T4 mantém o arranjo; instrução nunca pede o impossível.
- e2e reordenar-miolo (28) verde — ele testa exatamente ◀ ▶, pontas travadas e o texto lido.

## Verificação
```
node tests/e2e/run-reordenar-miolo.mjs
node tests/e2e/run-linha-verde-canonico.mjs
```
Screenshot T4 em R1 e em R2 (com peça nova) a 1280×800.

## Riscos e cuidados
- `run-reordenar-miolo.mjs` assert "template da T4 tem o selo '🔒 âncora'" (`:` seção "Pontas
  fixas + selo") — ao trocar o texto do selo, atualizar o assert no mesmo PR.
- Não alterar a semântica de `podeInserirComposicao`/`ordenarR1` (core) — só a tela.

## Decisões do dono (default)
- Texto do selo (default: "🔒 fica aqui"); texto da instrução; confirmação ao voltar vs preservar
  (default: **preservar**).
