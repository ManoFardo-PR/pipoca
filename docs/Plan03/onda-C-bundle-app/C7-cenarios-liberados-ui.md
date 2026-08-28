# C7 — UI de cenários liberados na tela Regras (o campo já existe e já é lido)

> Status: pendente

**Unidade de deploy:** CRU (`src/telas/Regras.dc.html`). **Depende de:** nada.
**Desbloqueia:** E4/E5 (quando houver mais de um cenário, a liberação precisa existir).

## Objetivo
O cuidador escolhe quais cenários a criança vê — a alavanca parental mais óbvia depois do
tempo de tela — usando o campo que o núcleo já normaliza e a T3 já respeita.

## Por quê (evidência)
- Núcleo entrega: `src/app/bridge.ts:231` `cardapio: { …, CENARIOS_PADRAO, normalizarCenariosLiberados }`;
  `src/core/cardapio.ts:61` `CENARIOS_PADRAO = ["quintal_anoitecer"]`.
- Consumidor só de leitura: `src/telas/Tela3SelecaoCenario.dc.html:241`
  `normalizarCenariosLiberados(estado.cenariosLiberados)`; comentário `:237`: "null → CENARIOS_PADRAO = só o quintal".
- Escritor: **nenhum**. `grep -rn "cenariosLiberados|CENARIOS_PADRAO|normalizarCenariosLiberados" src/telas/ src/admin/`
  → só as 2 linhas de leitura da T3. O cabeçalho de `Regras.dc.html:5` promete "…cardápio de
  recompensas (custos transparentes) **e cenários liberados**" e a tela não menciona cenário.
- Efeito: `cenariosLiberados` é `null` para 100% das famílias; toda criança vê 4 cartões "Em breve"
  (sonda t03: 4 alvos "Em breve — O Quarto / A Floresta / O Espaço / Fundo do Mar") (UI-A25, ML-2).
- Atrito conhecido: a galeria compara `liberados.indexOf(d.key)` com keys de imagem
  (`quarto`, `floresta`…) enquanto o id canônico é `quintal_anoitecer` (`Tela3:250`) — dois
  vocabulários. E5 unifica; aqui, gravar **ids canônicos** e, provisoriamente, mapear na T3.
- O campo vive no save por perfil (`_projetarSave`, `estado.js:308+`) — `setState({cenariosLiberados})`
  já persiste pelo caminho existente (conferir que `_projetarSave` inclui o campo).

## Escopo (arquivos)
- `src/telas/Regras.dc.html` (novo cartão "Lugares das histórias", ao lado do cardápio :73+).
- `src/telas/Tela3SelecaoCenario.dc.html:241-260` (mapa key↔id provisório, se necessário).
- `src/app/estado.js` (`_projetarSave`) — conferir inclusão do campo; sem mudança se já estiver.

## Passos
1. Cartão "Lugares das histórias" na Regras: lista dos cenários conhecidos (por ora: os 5 da
   galeria — 1 disponível + 4 "em breve"), cada um com `role="switch"` + `aria-checked`, o quintal
   sempre ligado (não pode ficar zero), os "em breve" desabilitados com motivo ("ainda não tem
   história pronta").
2. Escrever via `App.setState({ cenariosLiberados: Canon.cardapio.normalizarCenariosLiberados(lista) })`
   com o chip de perfil da tela (mesmo padrão de `Regras:210-212`) — é por criança.
3. Na T3, garantir que a comparação use o id canônico (mapa `{quintal:'quintal_anoitecer', …}`
   até E5 unificar).
4. Copy: "Quais lugares {nome} pode escolher?" — sem jargão.

## Critérios de aceite
- Desligar/ligar um cenário na Regras reflete na T3 da criança (galeria) após voltar.
- Nunca é possível ficar sem nenhum cenário.
- Persistência: reload mantém a escolha (save por perfil).

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs   # adicionar assert: alternar liberação e conferir a T3
```

## Riscos e cuidados
- Enquanto só o quintal existe, a UI parece "vazia de opções" — é honesto; mostrar os "em breve"
  como prévia mantém a promessa visível.
- Não criar tabela/coluna nova: o campo já viaja no envelope do save.

## Decisões do dono (default)
- Mostrar os "em breve" desabilitados (default: **sim**).
