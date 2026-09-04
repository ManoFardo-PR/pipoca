# 70 — Como adicionar um cenário (pipeline de autoria · Plan03 E6)

> Escrever um cenário novo é um procedimento documentado e verificado por máquina:
> JSON + SVG → lints → goldens → o lugar aparece na galeria da T3.
> Modelo vivo de referência: o Quintal (`quintal_anoitecer`).

## O que compõe um cenário (custo real)

| peça | arquivo | tamanho no Quintal |
|---|---|---|
| Grafo v3 (moldura + rodadas + objetos) | `docs/<curto>.v3.json` | moldura com aberturas/conectivos/desfechos ×4 níveis; 4 rodadas; 7 objetos com `conta` (4 níveis × 3 variantes) + `tempera` + `registro` |
| Fichas de identidade dos objetos | `docs/fichas/objetos.v1.json` (GLOBAL — decisão E4) | descrição + sensação ×4 níveis por objeto |
| Relações do cenário | `docs/fichas/relacoes.<curto>.v1.json` | 11 objeto×objeto + 7 objeto×cenário, ×4 níveis |
| Ficha do cenário (voz do contador) | `docs/fichas/cenarios.v1.json` | nome, descrição, voz, sensação ×4 níveis |
| Ilustração da galeria | `src/core/cenas.ts` (`Canon.cenas`) | 1 SVG 400×300 |
| Âncoras do validador | `src/core/realizador/validador.ts` **e** `functions/realizador/index.ts` | ≥1 âncora por objeto (E2 acusa se divergir) |
| Entrada no manifesto | `docs/cenarios.index.json` | id, nome, descrição, caminhos, svg, disponivel |

## Passo a passo

1. **Grafo**: copie `docs/quintal.v3.json` → `docs/<curto>.v3.json` e escreva moldura,
   rodadas e objetos. O `cenario.id` DENTRO do grafo deve ser o id canônico completo
   (ex.: `floresta_amanhecer`) — o lint confere que ele bate com o manifesto.
2. **Objetos novos** entram em `docs/fichas/objetos.v1.json` (o catálogo é global:
   um objeto compartilhado entre cenários tem UMA ficha).
3. **Relações**: crie `docs/fichas/relacoes.<curto>.v1.json` com
   `cenario: "<id canônico>"`, `objeto_x_objeto` (condição `se` da gramática v3;
   `alvo` SEMPRE explícito) e `objeto_x_cenario`.
4. **Ficha do cenário**: adicione a entrada no mapa de `docs/fichas/cenarios.v1.json`
   (chave = id canônico).
5. **SVG**: desenhe a cena em `src/core/cenas.ts` (`svgCena`) com uma chave curta nova
   e registre a chave em `galeriaCenas()` — a T3 injeta por `Canon.cenas`, sem cópia.
   (Mudou `cenas.ts` ⇒ é BUNDLE: rebuild no passo de fechamento, não avulso.)
6. **Âncoras**: cada objeto novo precisa de âncoras em `ANCORAS_POR_OBJETO`
   (`src/core/realizador/validador.ts`) **e na cópia da edge**
   (`functions/realizador/index.ts`) — `npm run check:paridade` (E2) acusa o
   esquecimento; a edge exige redeploy (regra: só com "pode" do dono).
7. **Manifesto**: registre em `docs/cenarios.index.json` —
   `{ id, nome, descricao, grafo: "./docs/<curto>.v3.json", relacoes:
   "./docs/fichas/relacoes.<curto>.v1.json", svg: "<chave>", disponivel: true }`.
   O id canônico é o vocabulário ÚNICO de galeria, liberação e motor (E4).
8. **Verificar**: `npm run lint:conteudo` (manifesto + lint do grafo + lint das
   fichas + âncoras — roda no CI) e `npm test` (goldens/fumaça; se o texto do
   Quintal NÃO mudou, os goldens não mudam — goldens regenerados sem revisão
   escondem regressão: revise o diff no PR).
9. **Liberar**: o cenário nasce trancado para as crianças — o cuidador libera na
   Regras (C7, "Lugares das histórias") por criança. Jogável = `disponivel:true`
   no manifesto **E** liberado (T3/E5).

## Checklist de qualidade de texto (antes do merge)

- [ ] n1 curto e decodificável: conectivos de 1 palavra, sem dígrafos nh/lh/ch em
      palavra nova (o lint A1 avisa), UMA sensação por corpo.n1.
- [ ] A mesma imagem nas 4 alturas (n1→n4 = a MESMA cena mais rica, nunca outra cena).
- [ ] Ficha neutra: sem flexão de gênero da protagonista (o lint A2 avisa;
      quem flexiona é o realizador).
- [ ] Ler o n1 EM VOZ ALTA no ritmo de uma criança de 6 anos.
- [ ] Nada de frase pronta nas relações: interação é matéria-prima do realizador.
- [ ] Avisos do lint são exigência de olhar humano — zere-os ou justifique no PR.

## Verificação por máquina

```
npm run lint:conteudo   # manifesto + grafo v3 + fichas + âncoras (falha = não merge)
npm test                # unit + goldens + fumaça de presença (240 histórias)
```

O CI (`.github/workflows/ci.yml`) roda os dois em todo push/PR.
