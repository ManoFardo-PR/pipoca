# B1 — Mecanismo de a11y: tokens escutam o que o Shell aplica; contraste que não destrói

> Status: pendente

**Unidade de deploy:** CRU (`src/tokens.css`, `index.html`, `src/telas/Shell.dc.html`).
**Depende de:** nada. **Desbloqueia:** B2, B3, B4.

## Objetivo
Fazer os toggles "Alto contraste" e "Reduzir movimento" agirem pelo sistema de tokens (e
não por um `!important` genérico), e impedir que o alto contraste torne ilegíveis os botões
primários e os estados selecionados.

## Por quê (evidência)
- `src/tokens.css:85-89` define `[data-reduce-motion]` e `:102-105` `[data-contrast]`
  (seletores de **atributo**). O Shell aplica **classes**:
  `src/telas/Shell.dc.html:98-100` → `classList.toggle('pip-dyslexia'|'pip-contrast'|'pip-reduce-motion')`.
  Busca no repo: `data-reduce-motion`/`data-contrast` nunca são setados. Resultado:
  `--pip-mov` fica permanentemente em 1 (UI-C01).
- Os componentes que calculam movimento por token (`src/componentes/Vagalume.dc.html:32,35`,
  `Botao.dc.html:35-37`, `ChipObjeto.dc.html:25-26`, `BarraLeitura.dc.html:22`,
  `index.html:51`) só "funcionam" porque `index.html:40-44` (`.pip-reduce-motion * {…!important}`)
  cobre por cima — proteção acidental.
- `index.html:38`: `.pip-contrast * { color: #1a1008 !important; }` sem exceção para
  superfícies escuras → texto branco de todo CTA laranja/verde vira quase-preto
  ("Brincar aqui →" `Tela3:54`, "Continuar a história ›" `Tela5:81`, "Pronto" `PainelA11y:63`,
  "Trocar" `Tela7:245`) e os títulos brancos dos cartões de cenário sobre cenas escuras
  (`Tela3:66-68`); também os chips/cartões azuis selecionados das telas adultas (UI-C02, UI-A37).
- `tokens.css:38-39` já define `--pip-tinta-contraste` e `--pip-vagalume-contraste` — nenhuma
  tela os usa.

## Escopo (arquivos)
- `src/tokens.css:78-105` (movimento, blocos condicionais, contraste).
- `index.html:35-44` (classes transversais) e `:49-53` (`<helmet>` da barra).
- `src/telas/Shell.dc.html:92-101` (`_aplicarA11y`).
- `admin.html:21-24` (só reset — receberá as classes em B3).

## Passos
1. **Escolher UM mecanismo** (default: classes, porque é o que o Shell já faz e o e2e conhece):
   em `tokens.css`, trocar `[data-reduce-motion]` por `.pip-reduce-motion` e `[data-contrast]`
   por `.pip-contrast` (manter os atributos como alias por uma versão, se quiser).
2. Fazer os tokens carregarem o efeito: `.pip-reduce-motion { --pip-mov:0; --pip-dur-rapido:0s;
   --pip-dur-medio:0s }` e `.pip-contrast { --pip-tinta: var(--pip-tinta-contraste); … }`.
3. Substituir `index.html:38` por regras **por superfície**, não por `*`:
   - texto sobre fundo claro usa `var(--pip-tinta)` (que já muda com o token);
   - CTAs e chips escuros mantêm `color:#fff` (definir `.pip-contrast .pip-cta { … }` ou, melhor,
     fazer os CTAs usarem um token `--pip-cta-texto` que NÃO muda no contraste).
   Sem `!important` universal.
4. Manter `index.html:40-44` (`.pip-reduce-motion *`) **por enquanto** como rede de segurança
   até B3 tokenizar as transições inline; anotar a remoção em B3.
5. Não tocar `pip-dyslexia` (funciona: troca `font-family`).

## Critérios de aceite
- Com `App.setState({a11y:{contrast:true}})`: botões primários e chips selecionados seguem com
  texto branco legível; texto corrido escurece.
- Com `reduceMotion:true`: `getComputedStyle(document.documentElement).getPropertyValue('--pip-mov')` = 0
  dentro do Shell.
- `grep -n "data-contrast\|data-reduce-motion" src/tokens.css` → 0 (ou só alias comentado).

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs   # a11y (T3 abre painel) segue verde
```
Screenshots T3/T5/T7 com contraste ligado, 1280×800.

## Riscos e cuidados
- O `<helmet>` de `index.html:49-53` redefine `.pip-barra-fill` com `--pip-mov` — validar que
  continua a animar sem o toggle.
- A landing (`landing.html:204`) tem seu próprio `prefers-reduced-motion` — fora de escopo.

## Decisões do dono (default)
- Classes vs atributos (default: **classes**).
