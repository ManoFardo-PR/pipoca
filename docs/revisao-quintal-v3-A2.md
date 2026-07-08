# Revisão Oficina A2 — Centro gravitacional do quintal (`docs/quintal.v3.json`)

> ⚠️ **RÉGUA INFERIDA.** O bloco "RÉGUA DO AUTOR" do prompt estava vazio ao rodar.
> Conforme a instrução de fallback, a régua foi inferida dos melhores exemplos
> herdados que já obedecem à Lei 1: o **gato** ("…estuda ela com uma calma
> antiga…") e a **folha** ("…e a Joana acompanha ela com os olhos…" / o dedo no
> ar da tira real). Toda reescrita imita ESTE registro. Sujeito a veto/edição
> linha a linha abaixo.

**As três leis aplicadas:** (1) o corpo da Joana é o centro — toda célula
registra o que ela percebe ou faz; (2) o quintal é o contador — a moldura fala
na voz do lugar; (3) desejo plantado na abertura, corpo colhido no desfecho.

**Mapa sensorial usado** (dominante por objeto): vagalume = visão-pequena ·
frasco = tato+visão · lua = visão-grande (queixo/prata no rosto) · gato =
quietude/olhar trocado · vento = pele · folha = movimento acompanhado ·
orvalho = frio no pé/toque miúdo. Variantes da mesma célula variam o sentido
secundário.

**Disciplina aplicada:** "a Joana" não entra em toda frase (alternância com
"ela" e corpo); nenhuma variante revisada abre com marcador temporal;
estrutura, condições (`se`/ecos), cardinalidade e significado das cenas
preservados — só texto mudou.

## Resumo das marcações

| bloco | mantida | ajustada | reescrita | total |
|---|---|---|---|---|
| vagalume | 11 | 11 | 0 | 22 |
| frasco | 8 | 10 | 0 | 18 |
| vento | 6 | 12 | 0 | 18 |
| folha | 5 | 12 | 1 | 18 |
| gato | 4 | 18 | 0 | 22 |
| lua | 2 | 16 | 0 | 18 |
| orvalho | 1 | 13 | 0 | 14 |
| abertura | 0 | 8 | 2 | 10 |
| desfecho convergente | 8 | 2 | 0 | 10 |
| ecos (13 × 4 níveis, +1 dupla n2) | 20 | 33 | 0 | 53 |
| **total** | **65** | **135** | **3** | **203** |

Nota de contagem: são 13 ecos no `desfecho.aberto` (3 pares começo+fim, 3 por
fim, 7 por começo), não 14 — um eco tem 2 variantes no n2, daí 53 textos.

## Gates (estado no momento desta revisão)

- `lintGrafoV3`: **0 erros, 0 avisos** (o aviso "abre por marcador" zerou; o
  assert do BLOCO 8 foi endurecido para exigir 0 avisos).
- Fumaça de presença (novo gate `bun run test:presenca`, encadeado em
  `bun run test`): **240 histórias** (30 arranjos × 2 modos × 4 níveis) —
  nenhuma vazia, replay determinístico, **presença da protagonista em 100% dos
  slots do miolo** (limiar exigido: 60%).
- `bun x tsc --noEmit` ✅ · `bun run test` 114/114 ✅ (compat v2 golden
  INTOCADO) · checker de planos 10/10 ✅.
- Golden v3 regenerado PROVISORIAMENTE (só o campo `texto` dos 32 casos mudou;
  regeneração final na Tarefa 5, após as correções desta revisão).

## Fumaça manual — linha da tira real (vagalume → frasco → lua → gato → vento → folha, n3, convergente)

> A última luz do dia some atrás do muro, e o quintal começa a sussurrar. A
> Joana sai sem fazer barulho, pra ver o que ele esconde de noite. A faísca
> entra no pote de vidro e fica piscando lá dentro — uma lanterninha viva que a
> Joana carrega. De repente, a Joana acha um pote de vidro e ergue contra o
> céu, vendo o quintal ficar todo torto lá dentro. Pouco depois, a noite tem
> duas luzes: a lua enorme lá no alto e a faísca pequenininha aqui embaixo,
> piscando uma pra outra, e a Joana bem no meio da conversa. Foi então que o
> gato encontra a luzinha piscando no escuro e fica espiando, a cabeça indo de
> um lado pro outro, enquanto a Joana espia os dois. E, sem aviso, o vento
> sobe, sacode os galhos lá no alto, e ela olha pra cima: alguma coisinha se
> solta e começa a descer rodando. A folha desce rodando bem na frente do gato,
> e ele acompanha cada volta com os olhos arregalados — a Joana prende o riso,
> quietinha. O quintal contou tudo o que sabia, e a Joana guarda cada
> pedacinho no peito, pra sonhar com eles a noite toda.

## Ambiguidades e decisões (para o veto)

1. **Repetição de gesto no mesmo nível:** temperos que podem coexistir numa
   mesma história ganharam gestos distintos (ex.: gato `depois_de:vagalume` n3
   "espia os dois" × folha `depois_de:gato` n3 → "prende o riso"; lua conta n3
   "ergue o queixo" × vento `antes_de:folha` n3 → "olha pra cima").
2. **Pré-existente, fora do escopo:** o tempero do vagalume `tem:frasco` ("…o
   pote…que a Joana carrega") pode disparar quando o vagalume vem ANTES do
   frasco na linha (visível na tira real acima: ela "carrega" o pote antes da
   cena de achá-lo). É comportamento do gatilho `tem:` (sem ordem), anterior à
   oficina; corrigir exigiria mudar a condição (estrutura), o que esta oficina
   não toca. Sinalizado para decisão futura.
3. "Agora é só sonhar" (desfecho convergente n2, precedente) mantido: marcador
   no MEIO do texto não é alvo da régua (só abertura de variante), e desfechos
   não recebem conectivo.
4. O golden v3 foi regenerado já nesta fase (provisório) — única forma de
   `bun run test` chegar verde na parada dura; o script de regeneração
   recomputa `montar()` caso a caso, determinístico.

---

# Células — miolo (Tarefa 1)

Formato: **nº · slot · marcação** · sentido dominante (+secundário da variante).
Nas [ajustada]/[reescrita]: "antes" → "depois". Nas [mantida], só o texto.

## 🪲 vagalume — visão (luz pequena) · corpo: olhos que seguem, chegar perto

### conta
- **1 · n1-v1 · [ajustada]** · visão
  - antes: "Uma faísca. Acende. Some."
  - depois: "Uma faísca. Acende. Ela viu."
- **2 · n1-v2 · [ajustada]** · visão + aproximar
  - antes: "Uma luzinha. Pisca. Some."
  - depois: "Uma luzinha pisca. Ela chega perto."
- **3 · n1-v3 · [ajustada]** · visão + riso
  - antes: "Um vaga-lume. Pisca, pisca."
  - depois: "Um vaga-lume. Pisca, pisca. Ela ri baixinho."
- **4 · n2-v1 · [ajustada]** · visão
  - antes: "Lá no escuro, uma faísca acende e some."
  - depois: "Lá no escuro, uma faísca acende e some bem na frente dela."
- **5 · n2-v2 · [ajustada]** · visão + aproximar
  - antes: "Uma luzinha verde pisca no fundo do quintal."
  - depois: "Uma luzinha verde pisca no fundo do quintal, e ela vai chegando perto."
- **6 · n2-v3 · [ajustada]** · visão (olhos que seguem)
  - antes: "Um vaga-lume acende, apaga e acende de novo."
  - depois: "Um vaga-lume acende, apaga e acende de novo, e os olhos dela seguem cada pisca."
- **7 · n3-v1 · [mantida]** — "No canto mais escuro, uma faísca acende e some. A Joana prende a respiração e chega na ponta dos pés."
- **8 · n3-v2 · [mantida]** — "Uma faísca viva pisca no fundo do quintal, e a Joana vai chegando devagar, quase sem respirar, pra não assustar."
- **9 · n4-v1 · [mantida]** — "Lá no canto onde o escuro é mais fundo, […] um segredo que só ela pode ouvir."
- **10 · n4-v2 · [mantida]** — "Perto da cerca, onde o escuro é mais escuro, […] como quem chama a Joana pra perto."

### tempera `["tem:frasco","depois_de:frasco"]`
- **11 · n1 · [ajustada]** · visão + posse
  - antes: "A faísca acha o pote. Entra!"
  - depois: "A faísca acha o pote dela. Entra!"
- **12 · n2 · [mantida]** — "A faísca acha o pote que a Joana carregava e entra nele."
- **13 · n3 · [mantida]** — "A faísca roda no ar, acha o pote que a Joana já carregava e entra devagarinho, como quem chega em casa."
- **14 · n4 · [mantida]** — "A faísca roda no ar uma, duas vezes — […] como quem finalmente chega em casa."

### tempera `"tem:frasco"`
- **15 · n1 · [ajustada]** · tato
  - antes: "A faísca no pote. Lanterna!"
  - depois: "A faísca no pote. Lanterna na mão dela!"
- **16 · n2 · [mantida]** — "A faísca entra no pote e vira uma lanterninha só dela."
- **17 · n3 · [mantida]** — "A faísca entra no pote de vidro e fica piscando lá dentro — uma lanterninha viva que a Joana carrega."
- **18 · n4 · [mantida]** — "Com todo o cuidado, a faísca entra no pote de vidro […] iluminando um passinho de cada vez."

### tempera `"pos:inicio"`
- **19 · n1 · [ajustada]** · visão + desejo
  - antes: "A noite abre com uma luz. Pisca."
  - depois: "A noite abre com uma luz. Ela vai ver."
- **20 · n2 · [ajustada]** · visão
  - antes: "A primeira coisa da noite é uma luzinha piscando."
  - depois: "A primeira coisa que ela vê na noite é uma luzinha piscando."
- **21 · n3 · [mantida]** — "A noite da Joana começa assim: uma luzinha acendendo e apagando, chamando ela pro quintal."
- **22 · n4 · [mantida]** — "A noite da Joana começa com uma faísca minúscula […] só esperando ela sair pra começar."

## 🫙 frasco — tato + visão · corpo: mãos no vidro frio, olhar o mundo por dentro

### conta
- **23 · n1-v1 · [ajustada]** · tato
  - antes: "Um pote. De vidro."
  - depois: "Um pote. De vidro. Frio na mão."
- **24 · n1-v2 · [ajustada]** · descoberta
  - antes: "Um pote na grama. Achou!"
  - depois: "Um pote na grama. Ela achou!"
- **25 · n1-v3 · [ajustada]** · visão (lente)
  - antes: "Um pote de vidro. Bem ali."
  - depois: "Um pote de vidro. Ela espia dentro."
- **26 · n2-v1 · [mantida]** — "A Joana acha um pote e olha o mundo por dentro dele."
- **27 · n2-v2 · [ajustada]** · tato
  - antes: "Na grama, um pote de vidro espera por ela."
  - depois: "Na grama, um pote de vidro espera pela mão dela."
- **28 · n2-v3 · [mantida]** — "A Joana acha um pote e sopra a poeira dele."
- **29 · n3-v1 · [mantida]** — "A Joana acha um pote de vidro e ergue contra o céu, vendo o quintal ficar todo torto lá dentro."
- **30 · n3-v2 · [mantida]** — "No meio da grama, um pote de vidro espera deitado. A Joana pega ele com as duas mãos e espia o mundo lá dentro."
- **31 · n4-v1 · [mantida]** — "Meio enterrado na grama, […] um quintal de bolso só dela."
- **32 · n4-v2 · [mantida]** — "A Joana quase tropeça nele: […] um mundinho curvo e brilhante que cabe nas mãos dela."

### tempera `["tem:vagalume","antes_de:vagalume"]`
- **33 · n1 · [ajustada]** · tato
  - antes: "Um pote vazio. Espera algo."
  - depois: "Um pote vazio na mão. Espera algo."
- **34 · n2 · [ajustada]** · tato
  - antes: "O pote está vazio. Parece esperar uma luzinha."
  - depois: "O pote na mão dela está vazio. Parece esperar uma luzinha."
- **35 · n3 · [mantida]** — "O pote está vazio e limpinho, e a Joana sente que ele espera alguma coisa — uma coisinha pequena e brilhante."
- **36 · n4 · [mantida]** — "O pote está vazio, mas não parece abandonado — […] uma coisinha brilhante pra morar ali."

### tempera `"pos:fim"` (abriam por marcador — aviso do lint zerado aqui)
- **37 · n1 · [ajustada]** · gesto
  - antes: "O pote guarda a noite. Tampa."
  - depois: "O pote guarda a noite. Ela tampa."
- **38 · n2 · [ajustada]** · tato (remove "No fim,")
  - antes: "No fim, o pote guarda um pedacinho da noite."
  - depois: "Na mão da Joana, o pote guarda um pedacinho da noite."
- **39 · n3 · [ajustada]** · (remove "Por fim,")
  - antes: "Por fim, a Joana ergue o pote uma última vez: lá dentro, um pedacinho da noite ficou guardado pra ela."
  - depois: "A Joana ergue o pote uma última vez: lá dentro, um pedacinho da noite ficou guardado pra ela."
- **40 · n4 · [ajustada]** · (remove "Por fim,")
  - antes: "Por fim, a Joana ergue o pote de vidro contra o céu escuro e sorri: […]"
  - depois: "A Joana ergue o pote de vidro contra o céu escuro e sorri: lá dentro, misturado com o cheiro de grama, ficou guardado um pedacinho inteirinho da noite — e é dela, só dela, pra levar pra dentro de casa."

## 🍃 vento — pele · corpo: cabelo, arrepio, roupa mexendo

### conta
- **41 · n1-v1 · [ajustada]** · pele
  - antes: "Um vento. Fresco."
  - depois: "Um vento. Fresco na pele."
- **42 · n1-v2 · [ajustada]** · cabelo
  - antes: "O vento veio. Passou."
  - depois: "O vento veio. Mexeu no cabelo dela."
- **43 · n1-v3 · [ajustada]** · pele
  - antes: "Um vento bate. Fresquinho."
  - depois: "Um vento bate nela. Fresquinho."
- **44 · n2-v1 · [mantida]** — "Um vento fresco passa e mexe no cabelo da Joana."
- **45 · n2-v2 · [ajustada]** · roupa
  - antes: "Um vento fresco balança a grama toda."
  - depois: "Um vento fresco balança a grama toda e a barra da roupa dela."
- **46 · n2-v3 · [mantida]** — "O vento passa de mansinho e arrepia a Joana."
- **47 · n3-v1 · [mantida]** — "Um vento fresco atravessa o quintal e mexe no cabelo da Joana, fazendo tudo balançar de leve."
- **48 · n3-v2 · [ajustada]** · arrepio
  - antes: "Um vento fresco chega de longe, atravessa o quintal inteiro e vai embora, deixando a grama sussurrando."
  - depois: "Um vento fresco chega de longe, passa arrepiando os braços da Joana e vai embora, deixando a grama sussurrando."
- **49 · n4-v1 · [mantida]** — "Um vento fresco atravessa o quintal e bagunça o cabelo da Joana, […] respirando junto com ela."
- **50 · n4-v2 · [mantida]** — "O quintal inteiro respira de uma vez: […] como se por um instante também fosse feita de noite."

### tempera `["tem:folha","antes_de:folha"]`
- **51 · n1 · [ajustada]** · olhar
  - antes: "O vento sobe. Algo se soltou."
  - depois: "O vento sobe. Algo se soltou. Ela olha."
- **52 · n2 · [ajustada]** · pescoço
  - antes: "O vento sacode o galho lá em cima. Alguma coisa se soltou."
  - depois: "O vento sacode o galho lá em cima, e ela estica o pescoço: alguma coisa se soltou."
- **53 · n3 · [ajustada]** · olhar
  - antes: "O vento sobe, sacode os galhos lá no alto, e alguma coisinha se solta e começa a descer rodando."
  - depois: "O vento sobe, sacode os galhos lá no alto, e ela olha pra cima: alguma coisinha se solta e começa a descer rodando."
- **54 · n4 · [ajustada]** · queixo
  - antes: "[…] — um presentinho que o vento mandou pra Joana."
  - depois: "[…] — um presentinho que o vento mandou pra Joana, e ela acompanha de queixo erguido."

### tempera `"pos:inicio"`
- **55 · n1 · [ajustada]** · pele
  - antes: "O vento abre a noite. Sopra."
  - depois: "O vento abre a noite. Sopra nela."
- **56 · n2 · [ajustada]** · pele
  - antes: "A noite começa com um vento fresquinho."
  - depois: "A noite começa com um vento fresquinho na pele dela."
- **57 · n3 · [ajustada]** · arrepio
  - antes: "A noite começa com um vento fresco, que entra no quintal antes de todo mundo."
  - depois: "A noite começa com um vento fresco, que entra no quintal antes de todo mundo e arrepia os braços dela."
- **58 · n4 · [mantida]** — "A noite começa pelo vento: ele pula o muro antes de todo mundo, corre uma volta pelo quintal e bagunça o cabelo da Joana — como quem chega cedo pra arrumar a casa pra festa."

## 🍂 folha — movimento (olhar que acompanha) · corpo: dedo no ar, mão aberta

### conta
- **59 · n1-v1 · [ajustada]** · acompanhar
  - antes: "Uma folha. Desce."
  - depois: "Uma folha desce. Ela acompanha."
- **60 · n1-v2 · [ajustada]** · olhos
  - antes: "Uma folha cai. Roda, roda."
  - depois: "Uma folha cai. Roda, roda. Os olhos dela rodam junto."
- **61 · n1-v3 · [ajustada]** · mão
  - antes: "Uma folha no ar. Vem vindo."
  - depois: "Uma folha no ar. Vem vindo. Ela estica a mão."
- **62 · n2-v1 · [ajustada]** · dedo no ar (tira real)
  - antes: "Uma folha desce rodando devagar no ar."
  - depois: "Uma folha desce rodando devagar, e o dedo dela acompanha no ar."
- **63 · n2-v2 · [ajustada]** · olhos
  - antes: "Uma folha se solta e desce dançando no ar."
  - depois: "Uma folha se solta e desce dançando, e os olhos dela dançam junto."
- **64 · n2-v3 · [mantida]** — "Uma folha cai devagar e pousa na mão da Joana."
- **65 · n3-v1 · [mantida]** — "Uma folha se solta lá de cima e desce rodando, sem pressa, até a mão espalmada da Joana."
- **66 · n3-v2 · [mantida]** — "Uma folha desce rodopiando do galho mais alto, e a Joana acompanha ela com os olhos até pousar na grama."
- **67 · n4-v1 · [mantida]** — "Bem lá em cima, uma folha se solta do galho […] leve feito um cochicho."
- **68 · n4-v2 · [mantida]** — "Do galho mais alto, uma folha se despede da árvore […] escolhe exatamente a mão dela pra pousar."

### tempera `["tem:gato","depois_de:gato"]`
- **69 · n1 · [ajustada]** · riso
  - antes: "A folha cai perto do gato. Ele olha."
  - depois: "A folha cai perto do gato. Ele olha. Ela ri."
- **70 · n2 · [ajustada]** · espiar
  - antes: "A folha desce bem na frente do gato, e ele arregala os olhos."
  - depois: "A folha desce bem na frente do gato, e ele arregala os olhos. A Joana espia, quietinha."
- **71 · n3 · [ajustada]** · riso contido
  - antes: "A folha desce rodando bem na frente do gato, e ele acompanha cada volta com os olhos arregalados."
  - depois: "A folha desce rodando bem na frente do gato, e ele acompanha cada volta com os olhos arregalados — a Joana prende o riso, quietinha."
- **72 · n4 · [ajustada]** · riso contido
  - antes: "[…] como se o mundo inteiro coubesse naquela folha caindo."
  - depois: "[…] como se o mundo inteiro coubesse naquela folha caindo. A Joana olha os dois de longe, segurando o riso pra não estragar."

### tempera `"pos:inicio"`
- **73 · n1 · [reescrita]** · acompanhar (abria com "Primeiro," — marcador editorial)
  - antes: "Primeiro, uma folha cai. Só ela."
  - depois: "Uma folha abre a noite. Ela acompanha."
- **74 · n2 · [ajustada]** · olhar
  - antes: "A noite começa com uma folha caindo devagarinho."
  - depois: "A noite começa com uma folha caindo devagarinho, e o olhar dela desce junto."
- **75 · n3 · [ajustada]** · dedo no ar
  - antes: "A noite começa quietinha: só uma folha caindo devagar, rodando no ar escuro."
  - depois: "A noite começa quietinha: só uma folha caindo devagar, rodando no ar escuro, e o dedo dela acompanhando cada volta."
- **76 · n4 · [ajustada]** · corpo que para
  - antes: "[…] como se o quintal estivesse ensaiando o primeiro segredo da noite."
  - depois: "[…] como se o quintal estivesse ensaiando o primeiro segredo da noite — e a Joana para no meio do passo, só pra ver."

## 🐈 gato — quietude + olhar trocado · corpo: prender a respiração, ser vista de volta

### conta
- **77 · n1-v1 · [ajustada]** · ser vista
  - antes: "Um gato. Dois olhos."
  - depois: "Um gato. Dois olhos. Olham ela."
- **78 · n1-v2 · [ajustada]** · quietude espelhada
  - antes: "Um gato na cerca. Quieto."
  - depois: "Um gato na cerca. Quieto. Ela também."
- **79 · n1-v3 · [ajustada]** · corpo que para
  - antes: "Dois olhos no escuro. Miau."
  - depois: "Dois olhos no escuro. Miau. Ela para."
- **80 · n2-v1 · [ajustada]** · ser vista
  - antes: "Na cerca, dois olhos verdes acendem: um gato."
  - depois: "Na cerca, dois olhos verdes acendem e olham bem pra ela: um gato."
- **81 · n2-v2 · [ajustada]** · respiração
  - antes: "Um gato aparece na cerca, de mansinho."
  - depois: "Um gato aparece na cerca, de mansinho, e ela prende a respiração."
- **82 · n2-v3 · [ajustada]** · ser vista primeiro
  - antes: "Dois olhos verdes brilham: é um gato."
  - depois: "Dois olhos verdes brilham: é um gato, e ele viu ela primeiro."
- **83 · n3-v1 · [mantida]** — "Alguma coisa farfalha na cerca, e dois olhos verdes se acendem. Um gato observa a Joana, quieto feito sombra."
- **84 · n3-v2 · [mantida]** — "Em cima da cerca, um gato aparece sem fazer barulho nenhum, e fica olhando a Joana com olhos de lanterna."
- **85 · n4-v1 · [mantida]** — "Alguma coisa farfalha em cima da cerca, […] estuda ela com uma calma antiga, […] decidindo se vale a pena confiar." *(exemplo-régua)*
- **86 · n4-v2 · [mantida]** — "Ninguém viu de onde ele veio: […] se aquela noite merece a companhia dele."

### tempera `["tem:vagalume","depois_de:vagalume"]`
- **87 · n1 · [ajustada]** · riso contido
  - antes: "O gato olha a luz. Pisca também."
  - depois: "O gato olha a luz. Pisca também. Ela segura o riso."
- **88 · n2 · [ajustada]** · riso contido
  - antes: "O gato olha a luzinha que pisca e pisca de volta."
  - depois: "O gato olha a luzinha que pisca e pisca de volta, e ela segura o riso."
- **89 · n3 · [ajustada]** · espiar
  - antes: "O gato encontra a luzinha piscando no escuro e fica espiando, a cabeça indo de um lado pro outro."
  - depois: "O gato encontra a luzinha piscando no escuro e fica espiando, a cabeça indo de um lado pro outro, enquanto a Joana espia os dois."
- **90 · n4 · [ajustada]** · quietude
  - antes: "[…] como quem resolve conversar na língua dela."
  - depois: "[…] como quem resolve conversar na língua dela. A Joana assiste paradinha, pra não interromper."
### tempera `["tem:lua","depois_de:lua"]`
- **91 · n1 · [ajustada]** · quietude
  - antes: "O gato na luz da lua. Brilha."
  - depois: "O gato na luz da lua. Brilha. Ela nem pisca."
- **92 · n2 · [ajustada]** · deslumbre
  - antes: "A luz da lua acende os pelos do gato."
  - depois: "A luz da lua acende os pelos do gato, e os olhos dela ficam grandes."
- **93 · n3 · [ajustada]** · percepção dela
  - antes: "Debaixo da lua, os pelos do gato viram fios de prata, e ele fica ainda mais bonito."
  - depois: "Debaixo da lua, os pelos do gato viram fios de prata, e a Joana acha que ele nunca esteve tão bonito."
- **94 · n4 · [ajustada]** · quietude
  - antes: "[…] e deixa a noite inteira admirar."
  - depois: "[…] e deixa a noite inteira admirar. A Joana admira junto, paradinha."

### tempera `"tem:folha"`
- **95 · n1 · [ajustada]** · gesto
  - antes: "O gato pula. Na folha!"
  - depois: "O gato pula. Na folha! Ela bate palma."
- **96 · n2 · [ajustada]** · riso
  - antes: "O gato vê a folha e pula, brincando com ela."
  - depois: "O gato vê a folha e pula, brincando, e a Joana ri de mansinho."
- **97 · n3 · [ajustada]** · riso
  - antes: "O gato vê a folha no chão e não resiste: pula, bate de leve com a patinha, corre atrás."
  - depois: "O gato vê a folha no chão e não resiste: pula, bate de leve com a patinha, corre atrás — e a Joana ri escondido."
- **98 · n4 · [ajustada]** · riso
  - antes: "[…] correndo atrás quando o vento leva a folha pra longe."
  - depois: "[…] correndo atrás quando o vento leva a folha pra longe. A Joana ri baixinho: até gato sério vira filhote de noite."

## 🌙 lua — visão (luz grande) · corpo: erguer o queixo, a prata no rosto

### conta
- **99 · n1-v1 · [ajustada]** · prata no rosto
  - antes: "A lua. Grande. Prateada."
  - depois: "A lua. Grande. Prata no rosto dela."
- **100 · n1-v2 · [ajustada]** · queixo
  - antes: "A lua sobe. Que grande!"
  - depois: "A lua sobe. Ela ergue o queixo. Que grande!"
- **101 · n1-v3 · [ajustada]** · olhos
  - antes: "Olha a lua! Toda de prata."
  - depois: "Olha a lua! Os olhos dela enchem de prata."
- **102 · n2-v1 · [ajustada]** · prata no rosto
  - antes: "A lua sobe grande e pinta o quintal de prata."
  - depois: "A lua sobe grande e pinta de prata o quintal e o rosto dela."
- **103 · n2-v2 · [ajustada]** · queixo
  - antes: "A lua aparece por cima do muro, enorme."
  - depois: "A lua aparece por cima do muro, enorme, e o queixo dela sobe junto."
- **104 · n2-v3 · [ajustada]** · mãos
  - antes: "A lua sobe e deixa tudo prateado."
  - depois: "A lua sobe e deixa tudo prateado, até as mãos dela."
- **105 · n3-v1 · [ajustada]** · queixo
  - antes: "A lua sobe grande por trás das árvores e acende o quintal todo com uma luz de prata."
  - depois: "A lua sobe grande por trás das árvores e acende o quintal todo com uma luz de prata, e a Joana ergue o queixo pra ver ela inteira."
- **106 · n3-v2 · [ajustada]** · rosto
  - antes: "A lua aparece por cima do muro, redonda e enorme, e o quintal inteiro fica cor de prata."
  - depois: "A lua aparece por cima do muro, redonda e enorme, e o quintal inteiro fica cor de prata — o rosto da Joana também."
- **107 · n4-v1 · [mantida]** — "Devagar, a lua sobe redonda e enorme […] A Joana joga a cabeça pra trás pra ver ela toda […]"
- **108 · n4-v2 · [ajustada]** · prata no corpo
  - antes: "[…] A luz prateada escorre pelo quintal todo — pela cerca, pela grama, pelos cantos escuros — […]"
  - depois: "[…] A luz prateada escorre pelo quintal todo — pela cerca, pela grama, pelos ombros da Joana — e por um momento parece que alguém acendeu uma lâmpada gigante e mansa no céu."

### tempera `["tem:vagalume","depois_de:vagalume"]` (abria com "Agora" — aviso do lint zerado aqui)
- **109 · n1 · [ajustada]** · ela entre as luzes
  - antes: "A lua e a faísca. Duas luzes."
  - depois: "A lua e a faísca. Duas luzes. Ela no meio."
- **110 · n2 · [ajustada]** · (remove "Agora")
  - antes: "Agora são duas luzes: a lua no alto, a faísca embaixo."
  - depois: "São duas luzes: a lua no alto, a faísca embaixo, e ela no meio das duas."
- **111 · n3 · [ajustada]** · (remove "Agora")
  - antes: "Agora a noite tem duas luzes: […] piscando uma pra outra."
  - depois: "A noite tem duas luzes: a lua enorme lá no alto e a faísca pequenininha aqui embaixo, piscando uma pra outra, e a Joana bem no meio da conversa."
- **112 · n4 · [ajustada]** · (remove "Agora"; corpo já existia)
  - antes: "Agora a noite tem duas luzes acesas: […]"
  - depois: "A noite tem duas luzes acesas: a lua enorme e parada lá no alto, e a faísca minúscula e dançante aqui embaixo. A Joana olha de uma pra outra e sorri — parece que a grande e a pequena se conhecem de algum lugar."

### tempera `"tem:orvalho"`
- **113 · n1 · [ajustada]** · pés
  - antes: "A lua na grama. Mil luas!"
  - depois: "A lua na grama. Mil luas aos pés dela."
- **114 · n2 · [ajustada]** · pés
  - antes: "A lua se reflete no orvalho: mil luas pequeninhas."
  - depois: "A lua se reflete no orvalho: mil luas pequeninhas em volta dos pés dela."
- **115 · n3 · [ajustada]** · pés
  - antes: "A lua se reflete em cada gota de orvalho, e o chão vira mil luas pequeninhas."
  - depois: "A lua se reflete em cada gota de orvalho, e o chão vira mil luas pequeninhas brilhando em volta dos pés da Joana."
- **116 · n4 · [mantida]** — "A luz da lua encontra o orvalho na grama e se parte em mil pedaços: […] a Joana anda no meio delas com medo de pisar em alguma."

## 💧 orvalho — frio no pé / toque miúdo · corpo: grama molhada, gota no dedo

### conta
- **117 · n1-v1 · [ajustada]** · frio no pé
  - antes: "Gotinhas. Brilham."
  - depois: "Gotinhas brilham. Frio no pé."
- **118 · n1-v2 · [ajustada]** · toque
  - antes: "Gotinhas na grama. Mil brilhos."
  - depois: "Gotinhas na grama. Mil brilhos. Ela toca uma."
- **119 · n1-v3 · [ajustada]** · pé molhado
  - antes: "O orvalho veio. Gota a gota."
  - depois: "O orvalho veio. Gota a gota. Molha o pé dela."
- **120 · n2-v1 · [ajustada]** · frio no pé
  - antes: "O orvalho pousa na grama em gotinhas que brilham."
  - depois: "O orvalho pousa na grama em gotinhas que brilham, e o pé dela sente o frio."
- **121 · n2-v2 · [ajustada]** · dedo
  - antes: "Gotinhas de orvalho brilham na ponta da grama."
  - depois: "Gotinhas de orvalho brilham na ponta da grama, e ela encosta o dedo numa."
- **122 · n2-v3 · [ajustada]** · pé
  - antes: "O orvalho chega de mansinho e enfeita a grama toda."
  - depois: "O orvalho chega de mansinho, enfeita a grama e deixa o pé dela geladinho."
- **123 · n3-v1 · [ajustada]** · dedo
  - antes: "O orvalho pousa na grama em gotinhas miúdas, e cada uma brilha como uma continha de vidro."
  - depois: "O orvalho pousa na grama em gotinhas miúdas, cada uma brilhando como uma continha de vidro, e a Joana encosta o dedo numa, devagarinho."
- **124 · n3-v2 · [ajustada]** · pés frios
  - antes: "Sem fazer barulho, o orvalho vai pousando na grama, gota por gota, até o chão inteiro brilhar de leve."
  - depois: "Sem fazer barulho, o orvalho vai pousando na grama, gota por gota, até o chão inteiro brilhar de leve debaixo dos pés frios da Joana."
- **125 · n4-v1 · [mantida]** — "Sem ninguém ver, o orvalho começa a se juntar na grama […] A Joana se abaixa bem perto: […]"
- **126 · n4-v2 · [ajustada]** · pé descalço
  - antes: "[…] e quando a Joana percebe, o quintal inteiro está coberto de continhas de vidro, cada uma guardando um pedacinho de brilho só seu."
  - depois: "[…] e quando a Joana percebe, o quintal inteiro está coberto de continhas de vidro, frias e miúdas debaixo do pé descalço dela, cada uma guardando um pedacinho de brilho só seu."

### tempera `["tem:folha","depois_de:folha"]`
- **127 · n1 · [ajustada]** · espiar de perto
  - antes: "Uma gota na folha. Brilha."
  - depois: "Uma gota na folha. Brilha. Ela espia de perto."
- **128 · n2 · [ajustada]** · pé
  - antes: "Uma gotinha pousa bem na folha caída."
  - depois: "Uma gotinha pousa bem na folha caída, pertinho do pé dela."
- **129 · n3 · [ajustada]** · abaixar
  - antes: "Uma gotinha de orvalho pousa bem na beiradinha da folha caída, e fica ali, brilhando."
  - depois: "Uma gotinha de orvalho pousa bem na beiradinha da folha caída, e fica ali, brilhando, enquanto a Joana se abaixa pra ver de pertinho."
- **130 · n4 · [ajustada]** · agachar, queixo na grama
  - antes: "[…] como uma joia que a noite deu de presente pra folha."
  - depois: "[…] como uma joia que a noite deu de presente pra folha. A Joana espia agachada, o queixo quase na grama."

---

# Moldura (Tarefa 2)

## Abertura — Lei 2 (voz do quintal) + Lei 3 (plantar o micro-desejo)

- **131 · n1-v1 · [reescrita]**
  - antes: "É noite. A Joana sai."
  - depois: "É noite. O quintal chama. A Joana vem."
- **132 · n1-v2 · [reescrita]**
  - antes: "A noite veio. A Joana sai."
  - depois: "A noite veio. O quintal tem segredo. A Joana quer ver."
- **133 · n1-v3 · [ajustada]**
  - antes: "É noite. A Joana vai pro quintal."
  - depois: "É noite. A Joana vai pro quintal. Quer ver tudo."
- **134 · n2-v1 · [ajustada]**
  - antes: "É noite. A Joana pisa na grama fria, sozinha."
  - depois: "É noite, e o quintal tem coisas pra mostrar. A Joana pisa na grama fria, sozinha, pra ver."
- **135 · n2-v2 · [ajustada]**
  - antes: "A noite chegou. A Joana sai pro quintal na ponta dos pés."
  - depois: "A noite chegou, e o quintal começa a contar. A Joana sai na ponta dos pés, pra ouvir."
- **136 · n2-v3 · [ajustada]**
  - antes: "O céu escureceu. A Joana pisa na grama fria do quintal."
  - depois: "O céu escureceu, e o quintal guarda um segredo novo. A Joana pisa na grama fria pra descobrir."
- **137 · n3-v1 · [ajustada]**
  - antes: "A última luz do dia some atrás do muro, e a Joana sai pro quintal sem fazer barulho."
  - depois: "A última luz do dia some atrás do muro, e o quintal começa a sussurrar. A Joana sai sem fazer barulho, pra ver o que ele esconde de noite."
- **138 · n3-v2 · [ajustada]**
  - antes: "O dia foi dormir atrás do muro, e a Joana sai pro quintal devagarinho, só ela e a noite."
  - depois: "O dia foi dormir atrás do muro, e o quintal acorda cheio de segredos. A Joana sai devagarinho, só ela e a noite, pra descobrir um por um."
- **139 · n4-v1 · [ajustada]**
  - antes: "[…] O quintal, que de dia é só o quintal, à noite vira outro lugar — e ela pisa na grama fria de pés descalços, o coração batendo forte."
  - depois: "Quando a última luz do dia se apaga atrás do muro, a Joana abre a porta dos fundos sem fazer barulho. O quintal, que de dia é só o quintal, à noite vira outro lugar — um lugar que só conta os segredos dele pra quem vem ver — e ela pisa na grama fria de pés descalços, o coração batendo forte de vontade de saber."
- **140 · n4-v2 · [ajustada]**
  - antes: "A noite desce devagar sobre o quintal, apagando as cores uma por uma. A Joana abre a porta dos fundos e para um instante na soleira, sentindo o cheiro de grama fria — então entra na noite de pés descalços, como quem entra num segredo."
  - depois: "A noite desce devagar sobre o quintal, apagando as cores uma por uma — é assim que ele chama. A Joana abre a porta dos fundos e para um instante na soleira, sentindo o cheiro de grama fria, então entra na noite de pés descalços, como quem entra num segredo que vai ser contado só pra ela."

## Desfecho convergente — Lei 3 (colher no corpo; "guarda no peito" é o gabarito)

- **141 · n1-v1 · [ajustada]**
  - antes: "A Joana guarda a noite. Dorme."
  - depois: "A Joana guarda a noite no peito. Dorme."
- **142 · n1-v2 · [ajustada]**
  - antes: "A Joana leva a noite. Vai dormir."
  - depois: "A Joana leva o quintal no peito. Vai dormir."
- **143 · n1-v3 · [mantida]** — "A noite cabe no peito. A Joana dorme."
- **144 · n2-v1 · [mantida]** — "A Joana guarda a noite inteira no peito e vai sonhar."
- **145 · n2-v2 · [mantida]** — "A Joana fecha os olhos e leva o quintal inteiro pro sonho."
- **146 · n2-v3 · [mantida]** — "A noite inteira coube no peito da Joana. Agora é só sonhar."
- **147 · n3-v1 · [mantida]** *(precedente)* — "Quando o quintal já contou tudo, a Joana guarda a noite inteira no peito e leva ela pros sonhos."
- **148 · n3-v2 · [mantida]** *(precedente-gabarito)* — "O quintal contou tudo o que sabia, e a Joana guarda cada pedacinho no peito, pra sonhar com eles a noite toda."
- **149 · n4-v1 · [mantida]** — "Quando o quintal já contou tudo o que tinha pra contar, […] e leva o quintal junto pros sonhos."
- **150 · n4-v2 · [mantida]** — "Quando o quintal termina de contar suas histórias, […] leva o quintal inteiro adormecido junto com ela pros sonhos."

## Ecos (desfecho aberto) — cada fragmento recolhe no corpo

### Eco 1 · `vagalume → frasco`
- **151 · n1 · [ajustada]**
  - antes: "A luz do começo dorme no pote."
  - depois: "A luz do começo dorme no pote, na mão dela."
- **152 · n2 · [ajustada]**
  - antes: "A faísca do começo dorme agora dentro do pote."
  - depois: "A faísca do começo dorme agora dentro do pote, quentinha na mão dela."
- **153 · n3 · [ajustada]**
  - antes: "E a faísca lá do começo dorme agora dentro do pote, pertinho da Joana. A noite fechou o círculo."
  - depois: "E a faísca lá do começo dorme agora dentro do pote, aninhada na mão da Joana. A noite fechou o círculo."
- **154 · n4 · [ajustada]**
  - antes: "[…] O que começou solto no escuro termina guardado e quentinho — a noite fechou o círculo, direitinho, do jeito que a Joana gosta."
  - depois: "[…] O que começou solto no escuro termina guardado e quentinho na mão dela — a noite fechou o círculo, direitinho, do jeito que a Joana gosta."

### Eco 2 · `folha → vento`
- **155 · n1 · [ajustada]**
  - antes: "O vento acha a folha. Levou."
  - depois: "O vento acha a folha. Levou. Ela acena."
- **156 · n2 · [ajustada]** (remove "No fim,")
  - antes: "No fim, o vento passa e leva a folha do começo pra passear."
  - depois: "O vento passa e leva a folha do começo pra passear, e ela acena tchau."
- **157 · n3 · [ajustada]**
  - antes: "[…] os dois vão embora juntos, rodando pela noite."
  - depois: "E o vento, antes de ir, passa buscar a folha lá do começo — os dois vão embora juntos, rodando pela noite, e a Joana acompanha com os olhos até o muro."
- **158 · n4 · [ajustada]**
  - antes: "[…] os dois saem juntos, rodando por cima do muro, pra contar pro resto da noite o que viram no quintal da Joana."
  - depois: "[…] os dois saem juntos, rodando por cima do muro. A Joana acena devagarinho, pros dois contarem pro resto da noite o que viram no quintal dela."

### Eco 3 · `vento → folha`
- **159 · n1 · [ajustada]**
  - antes: "A folha do fim veio no vento."
  - depois: "A folha do fim veio no vento, direto pra mão dela."
- **160 · n2 · [ajustada]**
  - antes: "A última folha veio voando no vento do começo."
  - depois: "A última folha veio voando no vento do começo e pousou na mão dela."
- **161 · n3 · [ajustada]**
  - antes: "E a Joana entende: a folha do fim veio viajando no vento lá do começo, só pra se despedir com ela."
  - depois: "E a Joana entende, com a folha fresquinha na mão: ela veio viajando no vento lá do começo, só pra se despedir."
- **162 · n4 · [ajustada]**
  - antes: "[…] atravessou o escuro inteirinho só pra pousar no quintal dela e dizer boa-noite."
  - depois: "[…] atravessou o escuro inteirinho só pra pousar na mão dela e dizer boa-noite."

### Eco 4 · fim `vagalume`
- **163 · n1 · [ajustada]**
  - antes: "Uma faísca pisca. Boa noite."
  - depois: "Uma faísca pisca. Boa noite pra ela."
- **164 · n2 · [mantida]** — "A última faísca pisca uma vez, como um boa-noite só pra ela."
- **165 · n3 · [mantida]** — "E, bem na porta, a última faísca pisca uma vez só — um boa-noite piscado no escuro, só pra Joana."
- **166 · n4 · [mantida]** — "E, bem na hora de entrar, quando a Joana olha pra trás uma última vez, […] guardado só pra ela."

### Eco 5 · fim `lua`
- **167 · n1 · [ajustada]**
  - antes: "A lua fica. De guarda."
  - depois: "A lua fica. De guarda pra ela."
- **168 · n2 · [mantida]** — "A lua fica no alto, de guarda, enquanto a Joana entra."
- **169 · n3 · [mantida]** — "E a lua fica lá no alto, de guarda, vendo a Joana entrar sem pressa nenhuma de ir embora."
- **170 · n4 · [mantida]** — "E a lua fica lá no alto, redonda e quieta, […] como se fosse esperar por ela a noite toda."

### Eco 6 · fim `gato`
- **171 · n1 · [ajustada]**
  - antes: "O gato se enrola. Dorme."
  - depois: "O gato se enrola. Dorme. Ela sorri."
- **172 · n2 · [ajustada]**
  - antes: "O gato se enrola numa bolinha e dorme, do jeito dele."
  - depois: "O gato se enrola numa bolinha e dorme, do jeito dele, e ela sorri da porta."
- **173 · n3 · [ajustada]**
  - antes: "E o gato se enrola numa bolinha quentinha e dorme também, o rabo cobrindo o focinho."
  - depois: "E o gato se enrola numa bolinha quentinha e dorme também, o rabo cobrindo o focinho. A Joana sorri e entra pé ante pé."
- **174 · n4 · [ajustada]**
  - antes: "[…] o rabo cobrindo o focinho, um olho meio aberto, do jeitinho dele."
  - depois: "[…] o rabo cobrindo o focinho, um olho meio aberto, do jeitinho dele. A Joana entra sorrindo, levando esse sono bom no corpo."

### Eco 7 · começo `vagalume` (n2 tem 2 variantes)
- **175 · n1 · [ajustada]**
  - antes: "Tudo começou com uma luz. Pisca, tchau."
  - depois: "Tudo começou com uma luz. Ela acena tchau."
- **176 · n2-v1 · [ajustada]**
  - antes: "E tudo começou com uma faísca no escuro."
  - depois: "E tudo começou com uma faísca no escuro, pensa ela, sorrindo."
- **177 · n2-v2 · [ajustada]**
  - antes: "A faísca do começo piscou uma última vez, como quem diz tchau."
  - depois: "A faísca do começo piscou uma última vez, como quem diz tchau, e ela piscou de volta."
- **178 · n3 · [mantida]** — "E pensar que tudo começou com uma faísca sozinha no escuro — a Joana olha pra trás e ela ainda está lá, piscando um tchauzinho."
- **179 · n4 · [mantida]** — "E pensar que a noite inteira começou com uma faísca sozinha piscando no escuro. […] um tchauzinho que só as duas entendem."

### Eco 8 · começo `frasco`
- **180 · n1 · [ajustada]**
  - antes: "O pote do começo foi junto. Cheio de noite."
  - depois: "O pote do começo foi junto, na mão. Cheio de noite."
- **181 · n2 · [mantida]** — "O pote lá do começo foi junto a noite toda, colado na mão dela."
- **182 · n3 · [ajustada]**
  - antes: "O pote lá do começo foi junto a noite inteira, e agora volta pra casa cheio de cheiro de grama e de noite."
  - depois: "O pote lá do começo foi junto a noite inteira na mão da Joana, e agora volta pra casa cheio de cheiro de grama e de noite."
- **183 · n4 · [mantida]** — "O pote de vidro do começo fez a noite inteira junto com a Joana, coladinho na mão dela — […]"

### Eco 9 · começo `vento`
- **184 · n1 · [ajustada]**
  - antes: "O vento do começo ainda sopra. Tchau, vento."
  - depois: "O vento do começo ainda sopra nela. Tchau, vento."
- **185 · n2 · [ajustada]**
  - antes: "O vento que abriu a noite ainda sopra de leve, dizendo tchau."
  - depois: "O vento que abriu a noite ainda sopra de leve no cabelo dela, dizendo tchau."
- **186 · n3 · [mantida]** — "O vento que abriu a noite ainda ronda o quintal, soprando de leve na nuca da Joana, como quem diz: até amanhã."
- **187 · n4 · [mantida]** — "O vento que abriu a noite não foi embora de verdade: […] sopra uma última vez na nuca da Joana — […]"

### Eco 10 · começo `folha`
- **188 · n1 · [ajustada]**
  - antes: "A folha do começo dorme na grama."
  - depois: "A folha do começo dorme na grama. Ela cochicha boa-noite."
- **189 · n2 · [ajustada]**
  - antes: "A folha lá do começo dorme agora na grama fria."
  - depois: "A folha lá do começo dorme agora na grama fria, e ela dá boa-noite baixinho."
- **190 · n3 · [ajustada]**
  - antes: "E a folha lá do começo continua onde pousou, dormindo na grama, guardando o lugarzinho da Joana até amanhã."
  - depois: "E a folha lá do começo continua onde pousou, dormindo na grama, guardando o lugarzinho da Joana até de manhã. Ela cochicha: até amanhã."
- **191 · n4 · [mantida]** — "E a folha que começou a noite continua exatamente onde pousou, […] e amanhã as duas continuam essa história."

### Eco 11 · começo `gato`
- **192 · n1 · [ajustada]**
  - antes: "O gato do começo ainda olha. Piscou."
  - depois: "O gato do começo ainda olha. Piscou. Ela pisca de volta."
- **193 · n2 · [mantida]** — "O gato do começo ainda está na cerca, olhando ela entrar."
- **194 · n3 · [mantida]** — "O gato lá do começo continua na cerca, e quando a Joana olha pra trás, ele pisca devagar — coisa que gato só faz com quem gosta."
- **195 · n4 · [mantida]** — "O gato que começou a noite continua no mesmo lugar da cerca, […] piscada lenta é o jeito de gato dizer que gosta."

### Eco 12 · começo `lua`
- **196 · n1 · [ajustada]**
  - antes: "A lua do começo ainda brilha. Fica aí, lua."
  - depois: "A lua do começo ainda brilha. Ela pede: fica aí, lua."
- **197 · n2 · [ajustada]**
  - antes: "A lua que abriu a noite continua lá, prateando tudo."
  - depois: "A lua que abriu a noite continua lá, prateando tudo, até o rosto dela na porta."
- **198 · n3 · [mantida]** — "A lua que abriu a noite continua no alto, prateando o quintal, e vai ficar de guarda até a Joana sonhar."
- **199 · n4 · [mantida]** — "A lua que abriu a noite segue firme lá no alto, […] esperando o sonho dela começar pra espiar um pedacinho."

### Eco 13 · começo `orvalho`
- **200 · n1 · [ajustada]**
  - antes: "As gotas do começo brilham. Mil luzinhas."
  - depois: "As gotas do começo brilham. Mil luzinhas pra ela."
- **201 · n2 · [ajustada]**
  - antes: "As gotinhas do começo ainda brilham na grama toda."
  - depois: "As gotinhas do começo ainda brilham na grama toda, dando tchau pra ela."
- **202 · n3 · [mantida]** — "As gotinhas lá do começo ainda brilham espalhadas na grama, mil luzinhas minúsculas se despedindo dela."
- **203 · n4 · [mantida]** — "As gotinhas de orvalho do começo continuam espalhadas pela grama, […] e a Joana entra devagar, com cuidado, pra não apagar nenhuma."

---

**PARADA DURA.** Aguardando validação do Manoel (veto/edição por número).
Após correções: re-rodar gates (lint 0/0 · `bun run test` · `test:presenca` ·
checker) e, só com o "aprovado" explícito, seguir à Tarefa 5 (golden final,
e2e canônico, canonização da régua no guia 08-01 + changelog do contrato).
