# Revisão de autoria — O Quarto na Hora de Dormir (`docs/quarto.v3.json`)

> Cenário novo (Etapa 1 do plano de autoria dos 4 cenários, 2026-09-08), escrito
> direto no registro da Oficina A2 do Quintal — o gato ("…estuda ela com uma
> calma antiga…") e a folha ("…o dedo dela acompanha no ar…") como régua de voz.

**As três leis aplicadas:** (1) o corpo da Joana é o centro — toda variante de
conta/tempera carrega a Joana, "ela/dela" ou corpo (fumaça: presença em **100%**
dos slots nas 240 histórias); (2) o QUARTO é o contador — a moldura fala na voz
do lugar ("o quarto começa o trabalho dele: contar as últimas coisas da noite");
(3) desejo plantado na abertura ("a vontade ainda acesa, do tamanho exato de
mais uma história"), corpo colhido no desfecho (ela dorme; o quarto apaga e fica
de guarda).

**Mapa sensorial** (dominante por objeto): luminária = visão-perto (roda de luz
quente) · livro = tato+visão (peso no colo, figuras) · **urso (núcleo)** =
tato-macio (abraço) · **cobertor (chave)** = tato-peso quente · estrela =
visão-longe (ponta de luz na janela) · gato = quietude/olhar trocado (ficha
REUSADA do catálogo global — zero delta na edge) · caixinha = audição (nota por
nota). Arco da hora de dormir: luz → história → companhia → peso → longe →
visita → canção → sono.

**Estrutura (= Quintal):** R1 revela luminária/livro/urso/cobertor, escolhe 3,
ordena, trava pontas; R2 estrela, R3 gato, R4 caixinha no miolo. Abertura e
convergente ×4 níveis (3/3/2/2 variantes); conectivos 3/4/4/3 (n1 de 1 palavra);
**9 ecos, todos alcançáveis** (2 compostos livro→urso e luminária→cobertor +
3 por fim + 4 por começo — aprendizado do Quintal: eco de objeto de miolo nunca
casa com `trava_pontas`, então não foi escrito); 14 temperas (12 obj×obj
espelhadas nas relações com o mesmo `se`, + 2 `pos:inicio`, 1 `pos:fim` no
cobertor-chave); 12 relações objeto×objeto + 7 manifestações.

**Disciplina aplicada:** "a Joana" alterna com "ela" e corpo (nunca em toda
frase); nenhuma variante abre por marcador temporal (lint do grafo: 0 avisos);
fichas neutras de gênero (A2 zerado — "o queixo apoiado em cima", nunca "dele");
n1 das fichas sem dígrafo fora da allow-list (o "acham" de estrela.corpo.n1
virou "veem" no lint); continuidade com o Quintal: o desfecho de lá manda
dormir, o Quarto acorda daí — e o gato do quintal "veio dormir dentro" (uma
variante de n2).

## Gates (estado no momento desta revisão)

- `lintGrafoV3` + `lintFichas` + lint-manifesto: **0 erros, 0 avisos** com o
  quarto `disponivel:true`.
- Fumaça de presença (agora multi-cenário): **480 histórias** (2 cenários × 30
  arranjos × 2 modos × 4 níveis) — nenhuma vazia, replay determinístico,
  presença da protagonista em **100%** dos slots (limiar: 60%).
- `bun x tsc --noEmit` ✅ · `npm test` 147/147 ✅ (goldens do Quintal INTOCADOS)
  · `npm run check:paridade` ✅ (âncoras espelhadas cliente↔edge) ·
  e2e canônico 108/108 ✅ (contagens dinâmicas absorveram a publicação).
- Âncoras novas (6): luminária, livro, urso*, cobertor, estrela*, caixinha —
  gato reusa as do catálogo. **A edge `realizador` precisa de redeploy** para
  conhecê-las; até lá o quarto roda honesto no A+ (origem "fallback-a-mais").

## Fumaça manual — linha real (livro → luminária → gato → estrela → cobertor → urso, n3, aberto)

> A noite entrou no quarto de mansinho, apagando um cantinho de cada vez. A
> Joana deita e puxa o travesseiro pro jeito certo: antes de dormir, ela quer
> ver tudo mais uma vez. A Joana ajeita o livro mais pro lado e deixa um espaço
> no colo — histórias boas pedem mais um ouvinte, e essa noite vai ter. Foi
> então que a luminária acorda com um clique pequeno e espalha uma luz morna e
> baixinha. A Joana chega o rosto mais perto, só pra sentir o morno na pele. E,
> de mansinho, a porta se abre um dedinho, e o gato entra no quarto do jeito
> dele: sem pressa, sem barulho, o rabo levantado feito pergunta. A Joana fica
> bem paradinha, pra não estragar a chegada. Foi então que a noite da Joana tem
> duas luzes: a roda cor de mel aqui dentro e a estrela lá fora, uma pra cada
> lado do vidro, e ela bem no meio das duas. Devagarinho, a Joana levanta uma
> pontinha do cobertor e ajeita o urso ali dentro, do lado dela — no quentinho
> cabe os dois. O urso ocupou o espaço do colo e ouviu a história inteira, de
> orelha em pé, enquanto a Joana apontava as figuras pra ele. E o urso, que
> ouviu a história do livro desde o começo, dorme agora colado na Joana — de
> orelha em pé até no sonho.

## Decisões para o veto do dono

1. **Gato reusado** (ficha e âncoras globais): a identidade "aparece sem barulho,
   quieto feito sombra" vale nos dois lugares; o texto do grafo é todo novo
   (ritual das patinhas no cobertor, olhar trocado com a estrela, orelha que
   denuncia a música).
2. **"O gato do quintal veio dormir dentro"** (conta n2, 1 de 3 variantes) — fio
   de continuidade entre cenários; cortar se preferir mundos independentes.
3. **Âncora "cor de mel" na luminária** compartilha imagem com temperas do
   cobertor/livro (precedente: "luz" do vagalume × lua no Quintal) — leniência a
   favor de menos FAIL/fallback na edge.
4. **Emoji do cobertor: 🧶** (não existe emoji de cobertor; novelo = tricô).
