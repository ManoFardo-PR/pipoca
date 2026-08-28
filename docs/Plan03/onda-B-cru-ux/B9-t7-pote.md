# B9 — T7 (pote e cardápio): barra quebrada, "~2", alvos e celebração ao resgatar

> Status: pendente

**Unidade de deploy:** CRU (`src/telas/Tela7PoteCardapio.dc.html`). **Depende de:** nada.
**Desbloqueia:** —.

## Objetivo
A lição de educação financeira da T7 aparece de verdade, os números são lidos como números,
os botões do cardápio são tocáveis por uma criança e resgatar uma recompensa é um momento.

## Por quê (evidência)
- **Bug de string:** `Tela7PoteCardapio.dc.html:265` devolve `spendPct: pct + '%'` (→ `"67%"`) e
  `:65` interpola `style="width:{{ spendPct }}%"` → `width:67%%` (CSS inválido, largura 0). No
  screenshot a barra "Como dividir" aparece 100% azul, contradizendo "~2 / ~1" ao lado (UI-C08).
- "~2 gastar agora", "~1 guardar p/ o sonho" (`:69-70`): em Baloo 2 a 18px o til lê como **−2/−1**
  (perda); "aproximadamente" é conceito fora da faixa; "p/" é abreviação ilegível para leitor
  iniciante (UI-C09, UI-C41).
- Botões "Trocar"/"Faltam N" medidos em 90×**44** (`:245`) — no limite WCAG, longe dos 48
  infantis (UI-C19); ⚙ 42×42 (`:30`).
- Resgatar (`:236-243`) debita e re-renderiza — sem celebração, sem "combinado!", sem registro
  (UI-C40). `redeem` sem saldo (`:243`) é toque engolido (UI-C39).
- 48 luzes decorativas (`:50-52`) sem `aria-hidden`; número do frasco (`:55`) e "vaga-lumes"
  (`:56`) em divs separados; "Faltam 3, botão" sem dizer de quê. **0 `aria-`** no arquivo.
- Contraste: "Você escolhe…" `#8a7a64` 13,5px (`:79`) 3,62:1; contador `#b8693c` (`:28,91`) 3,72:1.
- Layout desenhado para paisagem (`:35` flex com coluna fixa `width:320px` em `:38`) — a 390px a
  coluna do pote consome 82% da largura (UI-C58).

## Escopo (arquivos)
- `src/telas/Tela7PoteCardapio.dc.html` (:28-30, :35-38, :50-56, :63-70, :79, :91, :236-265).

## Passos
1. Corrigir `:265` para devolver só o número (ou `:65` sem o `%` literal) — 1 linha; assertar
   visualmente que a barra mostra a fatia laranja.
2. Trocar "~2"/"~1" por "2"/"1" (os valores já vêm de `spendSuggest`/`saveSuggest`,
   `Canon.economia`, `bridge.ts:208-216`) e "p/ o sonho" → "para o sonho".
3. Botões do cardápio ≥48px; ⚙ ≥48px; "Faltam N" → `aria-label="Faltam N vaga-lumes para {item}"`.
4. Celebração ao resgatar: micro-animação (respeitando `--pip-mov`) + `role="status"`
   "Combinado! Você trocou 3 vaga-lumes por {item}." + registrar no `historia`/telemetria se já
   houver evento (`Canon.telemetria`, `bridge.ts:281`) — não criar evento novo sem necessidade.
5. Toque sem saldo: feedback "Faltam 2 ainda — continue lendo!" (status), sacudida leve.
6. `aria-hidden` nas luzes; agrupar número + "vaga-lumes" num único nó com `aria-label`.
7. Retrato: coluna do pote `max-width:min(320px, 45vw)` e cardápio empilhado abaixo de 700px.
8. Cores de contraste de B2 em `:28,79,91`.

## Critérios de aceite
- Barra "como dividir" com duas fatias proporcionais aos números.
- Nenhum "~" nem "p/" no texto visível.
- Sonda: alvos ≥48px; leitor de tela lê "12 vaga-lumes" e "Faltam 3 vaga-lumes para Parque".
- Resgatar produz status + animação; sem saldo produz status.

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs   # MARCADOR da T7: /agrado|dividir o que você/ — manter "dividir"
```
Screenshot T7 a 1280×800 e 390×844.

## Riscos e cuidados
- Os dois caminhos de saída do pote (`:251-254`, "nunca reset acidental") são força — não tocar.
- Se mudar "Como dividir o que você juntou" (`:63`), atualizar o MARCADOR do e2e.

## Decisões do dono (default)
- Texto da celebração (default: "Combinado! …"); registrar resgate na telemetria (default: só se
  já houver evento de economia; senão, não).
