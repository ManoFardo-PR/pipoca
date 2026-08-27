# C5 — Render dos avatars por emoji nas 5 superfícies; remover cópias; `cenas` no mesmo padrão

**Unidade de deploy:** CRU (`.dc.html`) + remoção de `.ts` (sem efeito no bundle).
**Depende de:** C4. **Desbloqueia:** E5 (galeria de cenários, se `cenas` for tratado aqui).

## Objetivo
As telas passam a desenhar o avatar como emoji sobre o disco colorido, lendo a tabela única
(`Canon.avatares`); as cópias inline e o `avatares.ts` morto saem; o picker do cadastro mostra
o avatar real; `cenas.ts` recebe o mesmo tratamento (ou é apagado).

## Por quê (evidência)
- Screenshot da T2: as orelhas triangulares de `pingo` (`ear:'pup'`) e `lua` (`ear:'cat'`) leem
  como chifres — a percepção "diabinho" procede (ML-4). O restante da T2 é a melhor tela do app
  (alvos 140×180, uma pergunta) — preservar.
- Cópias do SVG: `Tela2EntradaCrianca.dc.html:65-92` (defs :65-73, SVG 108px :75-92, grade
  :39-46/:148-162), `Tela3SelecaoCenario.dc.html:145-171` (SVG 42px `scale(0.388)`; header :15,
  :209-213, :232), `Tela7PoteCardapio.dc.html:118-140` (header :22, :145-152, :262).
- Pickers com outro formato (disco com inicial, nem o bichinho): `Onboarding.dc.html:61-66,104-112,
  170-177` (default `avatarId:'pingo'` :87, grava :126) e `Perfis.dc.html:84-92,128-136,262-274`
  (disco do cartão :226/:236, defaults :117/:159, grava :194).
- `src/telas/cenas.ts:27+` (`_scene`, 5 SVGs: quintal, quarto, floresta, espaco, fundomar) tem
  **zero importadores** (`:15-17`); cópia inline viva em `Tela3:134-143` + metadados da galeria
  `:243-248`. Mesmo padrão de espelho-sem-importador.
- Admin não conhece avatares (grep `avatar` em `src/admin/` → 0) — nada a fazer lá.

## Escopo (arquivos)
- `src/telas/Tela2EntradaCrianca.dc.html`, `Tela3SelecaoCenario.dc.html`, `Tela7PoteCardapio.dc.html`,
  `Onboarding.dc.html`, `Perfis.dc.html`.
- `src/telas/avatares.ts` (remover); `src/telas/cenas.ts` (expor via bridge ou remover).

## Passos
1. Um único helper de render nas telas (padrão dc: função no `<script data-dc-script>` lendo
   `window.PipocaCanonico.avatares.porId(id)`): disco `background: cor`, emoji centralizado em
   `font-size` proporcional (108px na T2 → ~56px de emoji; 42px no header → ~22px), `aria-label`
   com o nome (UI-C47), `role="img"`.
2. Substituir os 3 blocos SVG e as 2 defs `{id,name,cor}` pelo helper; pickers de Onboarding/Perfis
   mostram o avatar real (disco + emoji) e marcam seleção com `aria-pressed`.
3. Fallback: se `Canon.avatares` não existir (bundle antigo), usar disco + inicial (o que Perfis já
   faz) — mesmo padrão "guarda p/ bundle antigo" do `estado.js:289`.
4. `git rm src/telas/avatares.ts`; atualizar `docs/guia-do-codigo/20-app-e-telas.md` se o citar.
5. `cenas.ts`: decisão abaixo. Default: expor `Canon.cenas` (mover para `src/core/cenas.ts` ou
   manter em `src/telas` importado pelo bridge) e a `Tela3:134-143` passa a consumi-lo; E5 então
   deriva a galeria do manifesto sem duplicar SVG.
6. Testar o render do emoji no tablet real (fontes de emoji variam por plataforma; Windows/Chromium
   headless não é prova).

## Critérios de aceite
- `grep -rn "_avatarDefs\|_avataresDefs\|_avatarSVG" src/` → 0.
- T2/T3/T7/Onboarding/Perfis mostram o mesmo avatar para o mesmo `avatarId`.
- Perfis existentes (`avatarId: "fubá"` etc.) renderizam sem fallback.
- e2e linha-verde e geracao2 verdes (T2 monta; `Tela2:113` continua casando perfil↔avatar).

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs
node tests/e2e/run-geracao2-canonico.mjs
```
Screenshots T2 (1280 e 390), T3 header, Perfis picker; foto no tablet.

## Riscos e cuidados
- `Tela2:147-161` esconde avatares sem perfil — manter a lógica (é o login visual).
- Emoji com `font-size` grande pode variar de baseline — usar `line-height:1` e `display:grid;place-items:center`.

## Decisões do dono (default)
- `cenas.ts`: expor via bridge (default) vs apagar o `.ts` e manter a cópia inline.
- Emojis finais (definidos em C4).
