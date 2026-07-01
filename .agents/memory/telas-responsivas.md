---
name: Telas responsivas sem moldura de tablet
description: Depois de remover o escalonador global do Shell, cada tela é responsável pela própria adaptação — texto de leitura precisa de fonte fluida.
---

# Cada tela cuida da própria responsividade

O Shell antes renderizava tudo dentro de uma moldura de tablet fixa (1234×874)
escalada por `transform: scale` para caber na viewport. Isso foi removido — o
Shell agora é só um container `position:fixed;inset:0` e cada tela preenche a
viewport real.

**Why:** sem o escalador global, fontes/paddings FIXOS em px que "cabiam" na
moldura passam a estourar em janelas curtas/estreitas (ex.: o parágrafo de
leitura da T5 aparecia gigante e cortado no topo, sem rolagem).

**How to apply:** para blocos de TEXTO longo (parágrafos), use fonte fluida
`clamp(piso, min(Xvw, Yvh), teto)` — o `vh` é essencial para caber em janelas
baixas — e deixe o container com `overflow-y:auto` + `justify-content:safe center`
para nunca cortar. Títulos de uma linha, números grandes e emojis podem seguir
em px fixo (não quebram em parágrafo). NÃO reintroduza `transform: scale` global
no Shell.
