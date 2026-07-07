# Revisão humana · `quintal.v3.json` (oficina Motor A+ v3)

> **Para o Manoel.** Todas as células NOVAS estão numeradas abaixo para você
> aprovar / editar / vetar linha a linha. As células v2 preservadas aparecem como
> `[v2 · intocada]` — nenhuma foi reescrita; todo texto v2 é a **1ª variante** da
> sua célula. Como responder: "aprovado" (tudo), ou liste correções por número
> (ex.: "V07: trocar X por Y" · "T03: vetar" · "E02: reescrever assim: …").
> Gates já verdes: lint 0 erros/0 avisos · 203 textos únicos · 120 histórias de
> fumaça com replay determinístico · tsc/testes(692)/checker 10/10 intactos.

---

## 0 · Decisões de oficina (aprovar também)

- **D-A** `_nota_posicao` do v2 foi removida do arquivo (referenciava o
  ValidadorOrdem/v1; obsoleta no v3).
- **D-B** Ordem dos temperos por objeto: **compostos (2 condições) → tempero v2
  (intacto) → posicionais simples**. Consequência: numa linha onde um composto
  novo casa, ele vence o tempero v2 (ex.: vagalume DEPOIS do frasco mostra T01 em
  vez da "lanterninha" v2 — a lanterninha segue aparecendo quando o vagalume vem
  antes do frasco). Se preferir a lanterninha sempre em 1º, diga "D-B: v2 primeiro".
- **D-C** Ordem dos ecos no `aberto`: **compostos → os 3 `se_terminou_com` v2
  intactos → os 7 `se_comecou_com` novos**, com `max_ecos: 1`. Preserva o
  comportamento v2 quando a linha termina em vagalume/lua/gato.
- **D-D** Honestidade mecânica: na mecânica atual (R1 trava pontas; gato/lua/
  orvalho entram só no miolo), os ecos **E11/E12/E13** (começou com gato/lua/
  orvalho) e qualquer `pos:inicio|fim` desses 3 objetos **nunca disparam**. Foram
  autorados mesmo assim porque o contrato §5 pede 7×4 e o conteúdo é dado
  (robustez futura). Por isso os temperos posicionais de gato/lua/orvalho usam só
  `antes_de:`/`depois_de:` (alcançáveis).
- **D-E** Temperos e ecos novos têm 1 variante por nível (strings); as VARIANTES
  múltiplas ficaram nas 28 contas base + abertura + convergente, como pede a meta
  do contrato §5. Exceção: E05 (n2) tem 2 variantes, vindas do exemplo do contrato.

---

## 1 · Moldura — abertura

| # | Nível | Texto |
|---|---|---|
| — | n1 | `[v2 · intocada]` É noite. A Joana sai. |
| V01 | n1 | A noite veio. A Joana sai. |
| V02 | n1 | É noite. A Joana vai pro quintal. |
| — | n2 | `[v2 · intocada]` É noite. A Joana pisa na grama fria, sozinha. |
| V03 | n2 | A noite chegou. A Joana sai pro quintal na ponta dos pés. |
| V04 | n2 | O céu escureceu. A Joana pisa na grama fria do quintal. |
| — | n3 | `[v2 · intocada]` A última luz do dia some atrás do muro… |
| V05 | n3 | O dia foi dormir atrás do muro, e a Joana sai pro quintal devagarinho, só ela e a noite. |
| — | n4 | `[v2 · intocada]` Quando a última luz do dia se apaga atrás do muro… |
| V06 | n4 | A noite desce devagar sobre o quintal, apagando as cores uma por uma. A Joana abre a porta dos fundos e para um instante na soleira, sentindo o cheiro de grama fria — então entra na noite de pés descalços, como quem entra num segredo. |

## 2 · Moldura — desfecho convergente

| # | Nível | Texto |
|---|---|---|
| — | n1 | `[v2 · intocada]` A Joana guarda a noite. Dorme. |
| V07 | n1 | A Joana leva a noite. Vai dormir. |
| V08 | n1 | A noite cabe no peito. A Joana dorme. |
| — | n2 | `[v2 · intocada]` A Joana guarda a noite inteira no peito e vai sonhar. |
| V09 | n2 | A Joana fecha os olhos e leva o quintal inteiro pro sonho. |
| V10 | n2 | A noite inteira coube no peito da Joana. Agora é só sonhar. |
| — | n3 | `[v2 · intocada]` Quando o quintal já contou tudo… |
| V11 | n3 | O quintal contou tudo o que sabia, e a Joana guarda cada pedacinho no peito, pra sonhar com eles a noite toda. |
| — | n4 | `[v2 · intocada]` Quando o quintal já contou tudo o que tinha pra contar… |
| V12 | n4 | Quando o quintal termina de contar suas histórias, a Joana fica mais um instante parada no meio da grama, guardando tudo — cada brilho, cada sussurro, cada friozinho bom — num cantinho quente do peito. Depois entra, fecha a porta devagar, e leva o quintal inteiro adormecido junto com ela pros sonhos. |

## 3 · Conectivos (novos — tecido do miolo, nunca nas âncoras)

| # | Nível | Pool |
|---|---|---|
| K01 | n1 | "Aí," · "Daí," · "Então," *(1 palavra, decodificável — regra do contrato)* |
| K02 | n2 | "Então," · "De repente," · "Logo depois," · "Foi quando" |
| K03 | n3 | "Foi então que" · "De repente," · "Pouco depois," · "E, sem aviso," |
| K04 | n4 | "Foi então que" · "Sem que ninguém esperasse," · "Pouco depois," |

## 4 · Objetos — variantes das contas (v2 sempre é a 1ª variante)

### 🪲 vagalume `genero: m · numero: sg`
| # | Nível | Texto |
|---|---|---|
| — | n1 | `[v2 · intocada]` Uma faísca. Acende. Some. |
| V13 | n1 | Uma luzinha. Pisca. Some. |
| V14 | n1 | Um vaga-lume. Pisca, pisca. |
| — | n2 | `[v2 · intocada]` Lá no escuro, uma faísca acende e some. |
| V15 | n2 | Uma luzinha verde pisca no fundo do quintal. |
| V16 | n2 | Um vaga-lume acende, apaga e acende de novo. |
| — | n3 | `[v2 · intocada]` No canto mais escuro, uma faísca acende e some… |
| V17 | n3 | Uma faísca viva pisca no fundo do quintal, e a Joana vai chegando devagar, quase sem respirar, pra não assustar. |
| — | n4 | `[v2 · intocada]` Lá no canto onde o escuro é mais fundo… |
| V18 | n4 | Perto da cerca, onde o escuro é mais escuro, uma luzinha acende e apaga como se respirasse. A Joana congela no meio do passo. É um vaga-lume — uma estrelinha que resolveu descer pra brincar no quintal — e ele pisca devagar, como quem chama a Joana pra perto. |

### 🫙 frasco `genero: m · numero: sg`
| # | Nível | Texto |
|---|---|---|
| — | n1 | `[v2 · intocada]` Um pote. De vidro. |
| V19 | n1 | Um pote na grama. Achou! |
| V20 | n1 | Um pote de vidro. Bem ali. |
| — | n2 | `[v2 · intocada]` A Joana acha um pote e olha o mundo por dentro dele. |
| V21 | n2 | Na grama, um pote de vidro espera por ela. |
| V22 | n2 | A Joana acha um pote e sopra a poeira dele. |
| — | n3 | `[v2 · intocada]` A Joana acha um pote de vidro e ergue contra o céu… |
| V23 | n3 | No meio da grama, um pote de vidro espera deitado. A Joana pega ele com as duas mãos e espia o mundo lá dentro. |
| — | n4 | `[v2 · intocada]` Meio enterrado na grama… |
| V24 | n4 | A Joana quase tropeça nele: um pote de vidro, meio escondido na grama, frio e liso feito pedra de rio. Ela levanta o pote contra o resto de luz e gira devagar — lá dentro, o quintal vira um mundinho curvo e brilhante que cabe nas mãos dela. |

### 🍃 vento `genero: m · numero: sg`
| # | Nível | Texto |
|---|---|---|
| — | n1 | `[v2 · intocada]` Um vento. Fresco. |
| V25 | n1 | O vento veio. Passou. |
| V26 | n1 | Um vento bate. Fresquinho. |
| — | n2 | `[v2 · intocada]` Um vento fresco passa e mexe no cabelo da Joana. |
| V27 | n2 | Um vento fresco balança a grama toda. |
| V28 | n2 | O vento passa de mansinho e arrepia a Joana. |
| — | n3 | `[v2 · intocada]` Um vento fresco atravessa o quintal e mexe no cabelo… |
| V29 | n3 | Um vento fresco chega de longe, atravessa o quintal inteiro e vai embora, deixando a grama sussurrando. |
| — | n4 | `[v2 · intocada]` Um vento fresco atravessa o quintal e bagunça o cabelo… |
| V30 | n4 | O quintal inteiro respira de uma vez: um vento fresco chega rolando por cima do muro, balança as folhas, arrepia a grama e bagunça o cabelo da Joana. Ela abre os braços e deixa o vento passar por ela, como se por um instante também fosse feita de noite. |

### 🍂 folha `genero: f · numero: sg`
| # | Nível | Texto |
|---|---|---|
| — | n1 | `[v2 · intocada]` Uma folha. Desce. |
| V31 | n1 | Uma folha cai. Roda, roda. |
| V32 | n1 | Uma folha no ar. Vem vindo. |
| — | n2 | `[v2 · intocada]` Uma folha desce rodando devagar no ar. |
| V33 | n2 | Uma folha se solta e desce dançando no ar. |
| V34 | n2 | Uma folha cai devagar e pousa na mão da Joana. |
| — | n3 | `[v2 · intocada]` Uma folha se solta lá de cima e desce rodando… |
| V35 | n3 | Uma folha desce rodopiando do galho mais alto, e a Joana acompanha ela com os olhos até pousar na grama. |
| — | n4 | `[v2 · intocada]` Bem lá em cima, uma folha se solta do galho… |
| V36 | n4 | Do galho mais alto, uma folha se despede da árvore e vem descendo em espiral, de um lado pro outro, sem pressa nenhuma de chegar. A Joana fica embaixo, com a mão aberta feito um ninho, esperando — e a folha, depois de pensar um pouquinho, escolhe exatamente a mão dela pra pousar. |

### 🐈 gato `genero: m · numero: sg`
| # | Nível | Texto |
|---|---|---|
| — | n1 | `[v2 · intocada]` Um gato. Dois olhos. |
| V37 | n1 | Um gato na cerca. Quieto. |
| V38 | n1 | Dois olhos no escuro. Miau. |
| — | n2 | `[v2 · intocada]` Na cerca, dois olhos verdes acendem: um gato. |
| V39 | n2 | Um gato aparece na cerca, de mansinho. |
| V40 | n2 | Dois olhos verdes brilham: é um gato. |
| — | n3 | `[v2 · intocada]` Alguma coisa farfalha na cerca… quieto feito sombra. |
| V41 | n3 | Em cima da cerca, um gato aparece sem fazer barulho nenhum, e fica olhando a Joana com olhos de lanterna. |
| — | n4 | `[v2 · intocada]` Alguma coisa farfalha em cima da cerca… uma calma antiga… |
| V42 | n4 | Ninguém viu de onde ele veio: quando a Joana percebe, o gato já está em cima da cerca, sentado com a elegância de quem chegou primeiro. Os olhos verdes brilham no escuro feito duas lanterninhas, e ele observa a Joana demoradamente, decidindo com toda a calma do mundo se aquela noite merece a companhia dele. |

### 🌙 lua `genero: f · numero: sg`
| # | Nível | Texto |
|---|---|---|
| — | n1 | `[v2 · intocada]` A lua. Grande. Prateada. |
| V43 | n1 | A lua sobe. Que grande! |
| V44 | n1 | Olha a lua! Toda de prata. |
| — | n2 | `[v2 · intocada]` A lua sobe grande e pinta o quintal de prata. |
| V45 | n2 | A lua aparece por cima do muro, enorme. |
| V46 | n2 | A lua sobe e deixa tudo prateado. |
| — | n3 | `[v2 · intocada]` A lua sobe grande por trás das árvores… |
| V47 | n3 | A lua aparece por cima do muro, redonda e enorme, e o quintal inteiro fica cor de prata. |
| — | n4 | `[v2 · intocada]` Devagar, a lua sobe redonda e enorme… |
| V48 | n4 | O muro ganha uma coroa: a lua sobe devagar, redonda e enorme, maior do que a Joana lembrava. A luz prateada escorre pelo quintal todo — pela cerca, pela grama, pelos cantos escuros — e por um momento parece que alguém acendeu uma lâmpada gigante e mansa no céu. |

### 💧 orvalho `genero: m · numero: sg`
| # | Nível | Texto |
|---|---|---|
| — | n1 | `[v2 · intocada]` Gotinhas. Brilham. |
| V49 | n1 | Gotinhas na grama. Mil brilhos. |
| V50 | n1 | O orvalho veio. Gota a gota. |
| — | n2 | `[v2 · intocada]` O orvalho pousa na grama em gotinhas que brilham. |
| V51 | n2 | Gotinhas de orvalho brilham na ponta da grama. |
| V52 | n2 | O orvalho chega de mansinho e enfeita a grama toda. |
| — | n3 | `[v2 · intocada]` O orvalho pousa na grama em gotinhas miúdas… |
| V53 | n3 | Sem fazer barulho, o orvalho vai pousando na grama, gota por gota, até o chão inteiro brilhar de leve. |
| — | n4 | `[v2 · intocada]` Sem ninguém ver, o orvalho começa a se juntar… |
| V54 | n4 | A noite tem um presente que só aparece pra quem espera: o orvalho. Gota por gota, sem barulho nenhum, ele vai pousando na ponta de cada folhinha de grama — e quando a Joana percebe, o quintal inteiro está coberto de continhas de vidro, cada uma guardando um pedacinho de brilho só seu. |

## 5 · Temperos posicionais novos (12 blocos · gramática v3)

Cada bloco tem os 4 níveis; mostro n1 e n4 (os extremos) — n2/n3 estão no JSON,
no mesmo tom. Temperos v2 (`vagalume→tem:frasco` lanterninha · `gato→tem:folha`
pulo · `lua→tem:orvalho` mil luas) estão **intactos**.

| # | Objeto | Condição | n1 | n4 (resumo do ângulo) |
|---|---|---|---|---|
| T01 | vagalume | `tem:frasco` E `depois_de:frasco` | A faísca acha o pote. Entra! | A faísca encontra o pote que a Joana já carregava e entra "como quem chega em casa". |
| T02 | vagalume | `pos:inicio` | A noite abre com uma luz. Pisca. | A noite começa com o pisca-pisca paciente que esperava a Joana sair. |
| T03 | frasco | `tem:vagalume` E `antes_de:vagalume` | Um pote vazio. Espera algo. | O pote vazio "parece à espera" de uma coisinha brilhante que a noite vai mandar. |
| T04 | frasco | `pos:fim` | O pote guarda a noite. Tampa. | No fim, o pote volta pra casa com um pedacinho inteirinho da noite dentro. |
| T05 | vento | `tem:folha` E `antes_de:folha` | O vento sobe. Algo se soltou. | O vento sacode a árvore e solta "um presentinho" que começa a descer. |
| T06 | vento | `pos:inicio` | O vento abre a noite. Sopra. | O vento pula o muro antes de todo mundo, "como quem chega cedo pra arrumar a casa pra festa". |
| T07 | folha | `tem:gato` E `depois_de:gato` | A folha cai perto do gato. Ele olha. | A folha desce na frente do gato e ele esquece de tudo, olhos enormes. |
| T08 | folha | `pos:inicio` | Primeiro, uma folha cai. Só ela. | A noite começa "do jeito mais quietinho que existe", ensaiando o primeiro segredo. |
| T09 | gato | `tem:vagalume` E `depois_de:vagalume` | O gato olha a luz. Pisca também. | O gato não entende a faísca e resolve "conversar na língua dela", piscando de volta. |
| T10 | gato | `tem:lua` E `depois_de:lua` | O gato na luz da lua. Brilha. | A lua acende os pelos do gato em fios de prata; "gato sabe quando está bonito". |
| T11 | lua | `tem:vagalume` E `depois_de:vagalume` | A lua e a faísca. Duas luzes. | Duas luzes acesas — a grande parada e a pequena dançante — que "se conhecem de algum lugar". |
| T12 | orvalho | `tem:folha` E `depois_de:folha` | Uma gota na folha. Brilha. | Uma gota escolhe a folha caída pra morar, "uma joia que a noite deu de presente". |

## 6 · Ecos do desfecho aberto (`max_ecos: 1`)

Os 3 ecos v2 (`se_terminou_com` vagalume/lua/gato) estão **intactos**. Novos
(mostro n1 e n2; n3/n4 no JSON, mesmo tom):

| # | Condição | n1 | n2 |
|---|---|---|---|
| E01 | começou vagalume E terminou frasco | A luz do começo dorme no pote. | A faísca do começo dorme agora dentro do pote. |
| E02 | começou folha E terminou vento | O vento acha a folha. Levou. | No fim, o vento passa e leva a folha do começo pra passear. |
| E03 | começou vento E terminou folha | A folha do fim veio no vento. | A última folha veio voando no vento do começo. |
| E04 | *(v2 · intocados)* terminou vagalume / lua / gato | — | — |
| E05 | começou vagalume | Tudo começou com uma luz. Pisca, tchau. | 2 variantes: "E tudo começou com uma faísca no escuro." / "A faísca do começo piscou uma última vez, como quem diz tchau." |
| E06 | começou frasco | O pote do começo foi junto. Cheio de noite. | O pote lá do começo foi junto a noite toda, colado na mão dela. |
| E07 | começou vento | O vento do começo ainda sopra. Tchau, vento. | O vento que abriu a noite ainda sopra de leve, dizendo tchau. |
| E08 | começou folha | A folha do começo dorme na grama. | A folha lá do começo dorme agora na grama fria. |
| E11 | começou gato *(inalcançável hoje — D-D)* | O gato do começo ainda olha. Piscou. | O gato do começo ainda está na cerca, olhando ela entrar. |
| E12 | começou lua *(inalcançável hoje — D-D)* | A lua do começo ainda brilha. Fica aí, lua. | A lua que abriu a noite continua lá, prateando tudo. |
| E13 | começou orvalho *(inalcançável hoje — D-D)* | As gotas do começo brilham. Mil luzinhas. | As gotinhas do começo ainda brilham na grama toda. |

---

## Como aprovar

Responda na conversa com **"aprovado"** para seguir para a Etapa B (implantação),
ou liste as correções por número. Depois das correções eu regenero os gates
(lint/fumaça/testes) e espero seu "aprovado" final.
