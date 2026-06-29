# fase00 · 00-03 · Design tokens (mundo Bluey)

> Doc de planejamento. Segue o gabarito de [[_TEMPLATE]]. Idioma: PT-BR. Extrai os tokens visuais (cor,
> tipografia, espaço, raio, sombra, movimento) da paleta quente do brief e dos hex reais do protótipo.

## Identidade
- id: `fase00-00-03`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Centralizar todos os valores visuais do app como CSS custom properties (`--pip-*`), com a paleta quente
"mundo Bluey" do brief e o toggle de reduzir-movimento, para uso uniforme por todas as telas e componentes.

## Pré-requisitos / Depende de
`[[fase00-00-01]]`

## Arquivos afetados
- `src/tokens.css` (criar) — todas as CSS custom properties (`:root { --pip-* }`).
- `index.html` (editar) — `helmet`/`<link>` das fontes e import de `src/tokens.css`.
- Consumido por `src/componentes/*.dc.html` e `src/telas/*.dc.html` (não editados aqui).

## Nomes & variáveis
CSS custom properties (nomes canônicos `--pip-*`):
- **Cor — creme/areia:** `--pip-creme: #f6ecd7;` `--pip-areia: #ece3d4;` `--pip-areia-clara: #f1e6cf;`
- **Cor — azul-heeler:** `--pip-heeler: #3f6f9e;` `--pip-heeler-escuro: #2d5681;`
- **Cor — laranja-terracota:** `--pip-terracota: #e8965a;` `--pip-terracota-escuro: #d5713f;`
- **Cor — verde-folha:** `--pip-folha: #6f9b4f;` `--pip-folha-claro: #7a9a5b;`
- **Cor — glow do vaga-lume:** `--pip-vagalume: #f4b65a;` `--pip-vagalume-escuro: #e89132;`
- **Cor — tinta de texto:** `--pip-tinta: #3a2c20;`
- **Tipografia:** `--pip-fonte-titulo: "Baloo 2";` `--pip-fonte-texto: "Nunito";`
  `--pip-fonte-dislexia: "Atkinson Hyperlegible";` `--pip-fonte-leitura: "Lexend";`
- **Espaçamento:** `--pip-esp-1: 4px; --pip-esp-2: 8px; --pip-esp-3: 14px; --pip-esp-4: 20px; --pip-esp-5: 28px;`
- **Raio:** `--pip-raio-1: 12px; --pip-raio-2: 16px; --pip-raio-3: 18px; --pip-raio-pill: 999px;`
- **Sombra:** `--pip-sombra-card: 0 8px 20px -12px rgba(74,59,44,.3);`
  `--pip-sombra-botao: 0 8px 20px -6px rgba(181,86,40,.55);`
- **Movimento:** `--pip-dur-rapido: .18s; --pip-dur-medio: .28s; --pip-mov: 1;` (o multiplicador de movimento;
  vira `0` quando reduzir-movimento está ligado).

## Interfaces / contratos
- Não cria tipos TS. O toggle de movimento espelha `A11yPrefs.reduceMotion` de [[_contratos/tipos-core]]
  (aplicação transversal detalhada em fase posterior de A11Y).
- Hex de origem: cenas/cards/avatares do protótipo (`#3f6f9e`, `#2d5681`, `#e8965a`, `#d5713f`, `#6f9b4f`,
  `#7a9a5b`, `#f4b65a`/`#e89132` no glow, `#3a2c20` na tinta).

## Regras de negócio
1. **Toda cor/medida do app vem de um token `--pip-*`.** Telas e componentes não escrevem hex/px crus para
   valores cobertos por token.
2. **Rico mas calmo:** a paleta é quente e analógica; nada de cores saturadas competindo. Um foco visual por
   tela (o token de destaque é `--pip-terracota`/`--pip-vagalume`, usado com parcimônia).
3. **Reduzir-movimento é obrigatório (brief).** Quando `reduceMotion` está ligado: `--pip-mov: 0`,
   `--pip-dur-rapido`/`--pip-dur-medio` viram `0s`, e animações/parallax são desligadas. Sem exceção.
4. **Sem X vermelho / sem vermelho punitivo.** Não existe token de cor de erro vermelho-alarme; feedback de
   "quase lá" usa tons quentes acolhedores (âmbar/terracota), nunca vermelho.
5. **Acessibilidade de contraste:** quando `contrast` está ligado, a tinta escurece (ex.: `#1a1008`) e o glow de
   destaque intensifica — esses valores também são tokens (`--pip-tinta-contraste`, `--pip-vagalume-contraste`).
6. **Fonte de dislexia é um token, não um hack:** `--pip-fonte-dislexia` (Atkinson Hyperlegible) substitui
   `--pip-fonte-texto` quando `A11yPrefs.dyslexia` está ligado.

## Passos de implementação
1. Criar `src/tokens.css` com `:root { ... }` declarando todos os `--pip-*` acima.
2. Declarar o bloco de contraste e o bloco de reduzir-movimento como overrides aplicáveis por classe/atributo
   no `<html>`/`<body>` (ex.: `[data-reduce-motion] { --pip-mov: 0; --pip-dur-rapido: 0s; }`).
3. Carregar as 4 famílias de fonte (Baloo 2, Nunito, Atkinson Hyperlegible, Lexend) via `helmet`/`<link>` em
   `index.html`.
4. Importar `src/tokens.css` cedo em `index.html` (antes do `support.js`).
5. Documentar a tabela token→uso (cor de fundo = `--pip-creme`; CTA = gradiente terracota; destaque de palavra
   no portão = `--pip-vagalume`).
6. Mapear os hex hard-coded do protótipo para os tokens correspondentes (para a migração das telas na fase01).

## Estados / edge-cases
- **Fonte não carregou:** cair na fonte de sistema sans-serif sem quebrar layout (`font-family` com fallback).
- **`reduceMotion` ligado:** nenhuma transição/animação roda; `--pip-mov: 0`.
- **`contrast` ligado:** tinta/destaque trocam para os tokens de contraste; verificar legibilidade do glow.
- **Tema impresso/baixo brilho:** os tokens creme funcionam como base calma; nenhum branco puro de fundo.
- **Daltonismo:** o app não codifica significado só por cor (sem verde=certo/vermelho=errado); cor é reforço.

## Critérios de aceitação / verificação
- [ ] `src/tokens.css` define todos os `--pip-*` listados, com os hex exatos do protótipo.
- [ ] As 4 fontes carregam via `helmet`/`<link>`.
- [ ] Ligar reduzir-movimento zera `--pip-mov` e as durações; nenhuma animação roda.
- [ ] Não existe token de vermelho-erro; o feedback de "quase" usa âmbar/terracota.
- [ ] Ligar contraste troca tinta/destaque pelos tokens de contraste.
- [ ] Nenhuma tela/componente novo escreve hex/px cru para valores que têm token.

## Relações com outros docs
- Depende de: `[[fase00-00-01]]`
- É consumido por: `[[fase00-00-04]]` (folha de componentes), `[[fase00-00-05]]` (app shell), e todas as telas
  da `fase01`. O toggle de movimento/contraste é dirigido por `A11yPrefs` (consumido pelas telas de leitura).
- Contratos: `[[_contratos/tipos-core]]` (`A11yPrefs`), `[[_contratos/convencoes-dc-runtime]]`.
