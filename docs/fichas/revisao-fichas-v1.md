# Revisão autoral — fichas v1 (Parada Dura 1 da fase 10)

> **Para o Manoel — validação célula a célula (parada dura do 10-04).**
> Toda célula dos 3 arquivos de `docs/fichas/` está numerada abaixo com a ORIGEM
> (de qual variante do `docs/quintal.v3.json` foi minerada, ou "nova").
> Como devolver: aprovar em bloco ("aprovado"), ou apontar células por número
> ("O23: trocar X por Y" · "R07: vetar" · "M12: reescrever assim…").
> Legenda de origem: **minerada** = imagem levada quase direta · **destilada** =
> variante retrabalhada (sem personagem/props, conforme 10-01) · **nova** = sem
> fonte direta no v3 (só onde o v3 não cobre) · **ajustada** = mudança pontual anotada.
> Referências `:NNN` = linha do `docs/quintal.v3.json`.

## Avisos A1 do lint (dígrafos no n1 — decisão de 2026-07-09: não bloqueiam; julgar aqui)

| # | célula | palavra | veredito seu |
|---|---|---|---|
| A1-1 | O05 (`vagalume.descricao.n1`) | "luzinha" (nh) | — canônica da PoC |
| A1-2 | O09 (`vagalume.corpo.n1`) | "olhos" (lh) | — canônica da PoC |
| A1-3 | O38 (`folha.descricao.n1`) | "folha" (lh) | — o próprio nome do objeto |
| A1-4 | O49 (`gato.descricao.n1`) | "olhos" (lh) | — os olhos SÃO a imagem do gato |

## Divergências tratadas (docs venceram o prompt — vetar aqui se discordar)

1. **Ecos NÃO viraram relações** (10-02: eco é arranjo do compositor, fase 11). Os 13 fragmentos de eco do v3 (:65-189) ficam no v3; uma imagem deles foi minerada (R-gato piscada lenta ← :167).
2. **As 4 temperas `pos:inicio|fim` não viraram relações** (D4 exige `alvo`, e posição não tem outro lado; o `papel` do Pacote já diz abertura/fecho ao realizador). A matéria espacial delas alimentou as MANIFESTAÇÕES (seção M).
3. **Célula ajustada por dígrafo**: O42 (`folha.corpo.n1`) — "o dedo **acompanha** no ar" (:331) → "o dedo **segue** no ar" (acompanha tem nh; o gesto é o mesmo). Se preferir o verbo original, é só mandar de volta (vira aviso A1-5).

## C · Cenário (`cenarios.v1.json` — quintal_anoitecer)

| nº | célula | texto | origem |
|---|---|---|---|
| C01 | nome | O Quintal ao Anoitecer | minerada `cenario.nome` :12 |
| C02 | descricao (string única, D3) | um quintal de casa ao cair da noite — muro baixo, grama fria, uma árvore de galhos altos, uma cerca, e a porta dos fundos por onde se entra na noite | destilada dos elementos da moldura/objetos (muro :24,33 · grama fria :24 · galhos :311 · cerca :365 · porta dos fundos :33) |
| C03 | voz_do_contador | o quintal fala baixinho e sussurra segredos: só conta pra quem vem ver, um por um, até contar tudo o que sabe | destilada da moldura ("começa a sussurrar" :29 · "só conta os segredos dele pra quem vem ver" :33 · "contou tudo o que sabia" :57 · "descobrir um por um" :30) |
| C04 | sensacao_no_personagem.n1 | a grama fria no pé | minerada da abertura ("pisa na grama fria" :24) |
| C05 | sensacao_no_personagem.n2 | a grama fria no pé; a vontade de ver tudo | minerada (:24 + "quer ver tudo" :21) |
| C06 | sensacao_no_personagem.n3 | a grama fria nos pés descalços; a vontade de descobrir os segredos um por um | minerada (:33 + :30) |
| C07 | sensacao_no_personagem.n4 | a grama fria nos pés descalços; o coração batendo forte de vontade de saber, como quem entra num segredo contado só pra ela | minerada da abertura n4 (:33-34) |

O campo `sensacao_no_personagem` em si é NOVO (D-11.2 — o v3 não tinha essa camada); os textos acima são minerados da moldura.

## O · Objetos (`objetos.v1.json` — 7 fichas)

### vagalume 🪲 — GABARITO CANÔNICO (10-00, validado na PoC; conferir, não retrabalhar)

| nº | célula | texto | origem |
|---|---|---|---|
| O01 | genero/numero | m / sg | v3 :203 |
| O02 | dominante | visão | canônico 10-00 (mapa 10-03: "visão-pequena") |
| O03 | registro | encanto silencioso | canônico 10-00 (v3 :202 dizia "assombro / segredo") |
| O04 | — | — | — |
| O05 | descricao.n1 | uma luzinha que pisca | canônica 10-00 (⚠ A1-1) |
| O06 | descricao.n2 | um vaga-lume que acende e apaga | canônica 10-00 |
| O07 | descricao.n3 | um vaga-lume que pisca devagar, como uma estrelinha que desceu para brincar | canônica 10-00 (eco de :221 "estrelinha que resolveu descer pra brincar") |
| O08 | descricao.n4 | um vaga-lume solitário, faísca viva que acende e some no escuro, piscando como quem chama | canônica 10-00 (:217 "faísca viva" · :221 "como quem chama") |
| O09 | corpo.n1 | os olhos seguem a pisca | canônica 10-00 (:213 "os olhos dela seguem cada pisca") (⚠ A1-2) |
| O10 | corpo.n2 | os olhos seguem a pisca; chegar perto na ponta dos pés | canônica 10-00 (:216) |
| O11 | corpo.n3 | os olhos que seguem a pisca; a vontade de chegar perto na ponta dos pés | canônica 10-00 |
| O12 | corpo.n4 | os olhos que seguem a pisca; a vontade de chegar perto na ponta dos pés, prendendo a respiração | canônica 10-00 (:216 "prende a respiração") |

### frasco 🫙

| nº | célula | texto | origem |
|---|---|---|---|
| O13 | genero/numero | m / sg | v3 :247 |
| O14 | dominante | tato+visão | mapa sensorial 10-03 |
| O15 | registro | curiosidade / lente | v3 :246 |
| O16 | descricao.n1 | um pote de vidro, frio e liso | destilada de :250 ("Um pote. De vidro. Frio na mão." — sem a mão) |
| O17 | descricao.n2 | um pote de vidro frio e liso, que deixa ver tudo por dentro | destilada de :255 ("olha o mundo por dentro dele") |
| O18 | descricao.n3 | um pote de vidro frio e liso feito pedra de rio, que entorta o mundo lá dentro | minerada de :265 ("frio e liso feito pedra de rio") + :264 ("entorta") |
| O19 | descricao.n4 | um pote de vidro frio e liso feito pedra de rio; erguido contra a luz, o mundo entorta e brilha lá dentro, pequenininho e curvo — um mundo de bolso | destilada de :264-265 ("quintal de bolso" → "mundo de bolso", cross-cenário) |
| O20 | corpo.n1 | segurar o pote com as duas mãos | minerada de :261 ("pega ele com as duas mãos") |
| O21 | corpo.n2 | segurar com as duas mãos; espiar o mundo lá dentro | minerada de :261 |
| O22 | corpo.n3 | segurar com as duas mãos; fechar um olho e espiar o mundo que entorta lá dentro | minerada de :264 ("Fecha um olho e espia") |
| O23 | corpo.n4 | segurar com as duas mãos e erguer contra a luz; fechar um olho e espiar o mundo que entorta lá dentro, virando devagar pra ver tudo | minerada de :264-265 ("ergue contra o céu"/"gira devagar") |

### vento 🍃

| nº | célula | texto | origem |
|---|---|---|---|
| O24 | genero/numero | m / sg | v3 :285 |
| O25 | dominante | pele | mapa sensorial 10-03 |
| O26 | registro | aconchego / respiração | v3 :284 |
| O27 | descricao.n1 | um vento fresco que passa | destilada de :288/:293 |
| O28 | descricao.n2 | um vento fresco que passa e mexe em tudo de leve | destilada de :293-295 (sem a Joana) |
| O29 | descricao.n3 | um vento fresco que chega de longe, passa mexendo em tudo de leve e vai embora | destilada de :299 |
| O30 | descricao.n4 | um vento fresco que chega de longe, rolando por cima de tudo — passa mexendo no mundo de leve, como se a noite inteira estivesse respirando | destilada de :302-303 ("a noite inteira estivesse respirando" · "rolando por cima do muro" → cross-cenário) |
| O31 | corpo.n1 | a pele sente o fresco | minerada de :288 ("Fresco na pele") |
| O32 | corpo.n2 | a pele arrepia; o cabelo mexe | minerada de :295/:289 |
| O33 | corpo.n3 | a pele dos braços arrepiando; o cabelo mexendo de leve | minerada de :299/:293 |
| O34 | corpo.n4 | a pele dos braços arrepiando; fechar os olhos e respirar fundo, deixando o vento passar como se ela também fosse feita de noite | minerada de :302-303 ("fecha os olhos e respira fundo" · "como se... fosse feita de noite") |

### folha 🍂

| nº | célula | texto | origem |
|---|---|---|---|
| O35 | genero/numero | f / sg | v3 :323 |
| O36 | dominante | movimento acompanhado | mapa sensorial 10-03 |
| O37 | registro | delicadeza / tempo | v3 :322 |
| O38 | descricao.n1 | uma folha que desce rodando | destilada de :326 (⚠ A1-3) |
| O39 | descricao.n2 | uma folha que se solta e desce rodando devagar | destilada de :331-332 |
| O40 | descricao.n3 | uma folha que se solta lá de cima e desce rodando, sem pressa nenhuma | destilada de :336 |
| O41 | descricao.n4 | uma folha que se despede do galho e desce em espiral, rodando pra um lado e pro outro, sem pressa nenhuma de chegar — leve feito um cochicho | destilada de :341 + :340 ("leve feito um cochicho") |
| O42 | corpo.n1 | o dedo segue no ar | **ajustada** de :331 ("o dedo dela acompanha no ar" — acompanha tem nh; ver Divergência 3) |
| O43 | corpo.n2 | o dedo acompanha no ar; os olhos dançam junto | minerada de :331-332 |
| O44 | corpo.n3 | o dedo que acompanha cada volta no ar; a mão aberta, espalmada, esperando | minerada de :336/:354 ("cada volta") + :336 ("mão espalmada") |
| O45 | corpo.n4 | o dedo que acompanha cada volta; a mão aberta feito um ninho, esperando quietinha até a folha pousar de leve na palma | minerada de :341 ("mão aberta feito um ninho") + :340 ("pousar de leve na palma"/"quietinha") |

### gato 🐈

| nº | célula | texto | origem |
|---|---|---|---|
| O46 | genero/numero | m / sg | v3 :361 |
| O47 | dominante | quietude / olhar trocado | mapa sensorial 10-03 |
| O48 | registro | cautela / mistério | v3 :360 |
| O49 | descricao.n1 | um gato quieto, dois olhos acesos | destilada de :364-365 (⚠ A1-4) |
| O50 | descricao.n2 | um gato quieto feito sombra, dois olhos verdes acesos | minerada de :374 ("quieto feito sombra") + :369 |
| O51 | descricao.n3 | um gato que aparece sem barulho nenhum, quieto feito sombra, os olhos verdes acesos feito lanternas | minerada de :375 + :374 |
| O52 | descricao.n4 | um gato que ninguém viu chegar — quieto feito sombra, o rabo balançando devagarinho, os olhos verdes acesos — estudando tudo com uma calma antiga, decidindo se vale a pena confiar | minerada de :378-379 ("calma antiga" · "decidindo se vale a pena confiar" · "ninguém viu de onde ele veio") |
| O53 | corpo.n1 | ficar quieta também | destilada de :365 ("Quieto. Ela também.") |
| O54 | corpo.n2 | ficar quieta também; prender a respiração | minerada de :365 + :370 |
| O55 | corpo.n3 | ficar quieta também, prendendo a respiração; trocar um olhar demorado | destilada de :365/:370 + :379 ("observa demoradamente" → olhar TROCADO, mapa 10-03) |
| O56 | corpo.n4 | ficar quieta também, prendendo a respiração; trocar um olhar demorado e piscar devagar de volta — piscada lenta é o jeito de gato dizer que gosta | minerada do eco do gato :167-168 ("pisca devagar — coisa que gato só faz com quem gosta") |

### lua 🌙

| nº | célula | texto | origem |
|---|---|---|---|
| O57 | genero/numero | f / sg | v3 :405 |
| O58 | dominante | visão-grande (queixo erguido / prata no rosto) | mapa sensorial 10-03 |
| O59 | registro | deslumbre / vastidão | v3 :404 |
| O60 | descricao.n1 | a lua grande, cor de prata | destilada de :408 |
| O61 | descricao.n2 | a lua que sobe grande e pinta tudo de prata | destilada de :413 (sem "o rosto dela" — vai pro corpo) |
| O62 | descricao.n3 | a lua que sobe redonda e enorme, acendendo tudo com uma luz de prata macia | destilada de :418-419/:422 |
| O63 | descricao.n4 | a lua que sobe devagar, redonda e enorme, maior do que se lembrava — uma luz de prata macia e quieta escorrendo por tudo, como uma lâmpada gigante e mansa acesa no céu | destilada de :422-423 ("lâmpada gigante e mansa" · "maior do que a Joana lembrava" → impessoal) |
| O64 | corpo.n1 | o queixo sobe pra ver | minerada de :409 ("Ela ergue o queixo") |
| O65 | corpo.n2 | o queixo sobe pra ver; a prata no rosto | minerada de :409 + :408 ("Prata no rosto dela") |
| O66 | corpo.n3 | o queixo erguido pra ver ela inteira; a prata acendendo no rosto | minerada de :418 + :419 |
| O67 | corpo.n4 | o queixo erguido, a cabeça jogada pra trás pra ver ela inteira; a prata no rosto e nos ombros, e o mundo por um instante grande demais, do tamanho do céu | minerada de :422 ("joga a cabeça pra trás" · "grande demais, do tamanho do céu") + :423 ("pelos ombros") |

### orvalho 💧

| nº | célula | texto | origem |
|---|---|---|---|
| O68 | genero/numero | m / sg | v3 :443 |
| O69 | dominante | frio no pé / toque miúdo | mapa sensorial 10-03 |
| O70 | registro | preciosidade minúscula | v3 :442 |
| O71 | descricao.n1 | gotas de água com luz dentro | destilada de :460 ("cada continha guarda um pedacinho de luz lá dentro") — evita "gotinhas"(nh)/"brilham"(lh) no n1 |
| O72 | descricao.n2 | gotas de água miúdas, cada uma com um brilho dentro | destilada de :456/:460 |
| O73 | descricao.n3 | gotas de água miúdas como continhas de vidro, cada uma guardando um pedacinho de luz | minerada de :456/:460 ("continha de vidro") |
| O74 | descricao.n4 | gotas de água que chegam sem barulho nenhum, gota por gota, miúdas como continhas de vidro — cada uma guardando um pedacinho de luz, um brilho que é só seu | destilada de :461 ("gota por gota, sem barulho nenhum" · "um pedacinho de brilho só seu") |
| O75 | corpo.n1 | o pé sente o frio | minerada de :446 ("Frio no pé") |
| O76 | corpo.n2 | o pé sente o frio; o dedo encosta numa gota | minerada de :451-452 |
| O77 | corpo.n3 | o pé descalço sentindo o frio; o dedo encostando numa gota, devagarinho | minerada de :456-457 ("encosta o dedo numa, devagarinho" · "pés frios") |
| O78 | corpo.n4 | o pé descalço sentindo o frio da grama; abaixar bem perto e encostar o dedo numa gota, com cuidado pra não desmanchar o brilho | minerada de :460 ("se abaixa bem perto") + nova ("não desmanchar o brilho" — espírito de :437 "medo de pisar em alguma") |

## R · Relações objeto×objeto (`relacoes.quintal.v1.json` — 11 relações, todas com `alvo` explícito/D4)

| nº | relação (se · objeto→alvo) | nível | texto | origem |
|---|---|---|---|---|
| R01 | `[tem:frasco, depois_de:frasco]` · vagalume→frasco | — | (condição/lados) | tempera v3 :225 |
| R02 | ↳ interacao | n1 | a faísca acha o pote; entra | destilada de :226 |
| R03 | ↳ | n2 | a faísca acha o pote que ela carregava e entra | destilada de :227 |
| R04 | ↳ | n3 | a faísca roda no ar, acha o pote que ela já carregava e entra devagarinho | destilada de :228 |
| R05 | ↳ | n4 | a faísca roda no ar uma, duas vezes, encontra o pote carregado desde cedo e entra devagarinho — fica lá dentro piscando quentinha, como quem chega em casa | destilada de :229 |
| R06 | `tem:frasco` · vagalume→frasco | — | (condição/lados) | tempera v3 :231 |
| R07 | ↳ interacao | n1 | a faísca no pote; uma lanterninha na mão | destilada de :232 |
| R08 | ↳ | n2 | a faísca entra no pote e vira uma lanterninha só dela | minerada de :233 |
| R09 | ↳ | n3 | a faísca entra no pote de vidro e fica piscando lá dentro — uma lanterninha viva pra carregar | destilada de :234 |
| R10 | ↳ | n4 | a faísca entra no pote de vidro com todo o cuidado e fica piscando lá dentro, presa e livre ao mesmo tempo — uma lanterninha viva que ilumina um passinho de cada vez | destilada de :235 |
| R11 | `[tem:vagalume, antes_de:vagalume]` · frasco→vagalume | — | (condição/lados) | tempera v3 :269 |
| R12 | ↳ interacao | n1 | o pote vazio espera algo | destilada de :270 |
| R13 | ↳ | n2 | o pote vazio parece esperar uma luzinha | destilada de :271 |
| R14 | ↳ | n3 | o pote vazio e limpinho, esperando alguma coisa pequena e brilhante | destilada de :272 |
| R15 | ↳ | n4 | o pote vazio que não parece abandonado — parece à espera; a certeza esquisita e boa de que a noite ainda vai mandar uma coisinha brilhante pra morar ali | destilada de :273 |
| R16 | `[tem:folha, antes_de:folha]` · vento→folha | — | (condição/lados) | tempera v3 :307 |
| R17 | ↳ interacao | n1 | o vento sacode o galho; algo se solta | destilada de :308 |
| R18 | ↳ | n2 | o vento sacode o galho lá em cima; alguma coisa se solta | destilada de :309 |
| R19 | ↳ | n3 | o vento sobe e sacode os galhos; uma coisinha se solta e começa a descer rodando | destilada de :310 |
| R20 | ↳ | n4 | o vento sobe pelos galhos e sacode a árvore de leve, como quem acorda alguém; lá no alto algo se solta e desce rodando, sem pressa — um presente anunciado | destilada de :311 ("um presentinho que o vento mandou" → "um presente anunciado") |
| R21 | `[tem:gato, depois_de:gato]` · folha→gato | — | (condição/lados) | tempera v3 :345 |
| R22 | ↳ interacao | n1 | a folha cai perto do gato; ele olha | destilada de :346 |
| R23 | ↳ | n2 | a folha desce na frente do gato; ele arregala os olhos | destilada de :347 |
| R24 | ↳ | n3 | a folha desce rodando na frente do gato; ele acompanha cada volta de olhos arregalados | destilada de :348 |
| R25 | ↳ | n4 | a folha desce rodando devagar bem na frente do gato — ele esquece de tudo, o rabo parado no ar, os olhos enormes acompanhando cada volta, como se o mundo coubesse naquela folha caindo | destilada de :349 |
| R26 | `[tem:vagalume, depois_de:vagalume]` · gato→vagalume | — | (condição/lados) | tempera v3 :383 |
| R27 | ↳ interacao | n1 | o gato olha a luz e pisca também | destilada de :384 |
| R28 | ↳ | n2 | o gato olha a luzinha que pisca e pisca de volta | destilada de :385 |
| R29 | ↳ | n3 | o gato espia a luzinha piscando, a cabeça indo de um lado pro outro | destilada de :386 |
| R30 | ↳ | n4 | o gato encontra a luzinha que pisca e não entende — a cabeça vai de um lado, do outro, os olhos enormes seguindo a faísca; depois pisca também, devagarinho, como quem resolve conversar na língua dela | destilada de :387 |
| R31 | `[tem:lua, depois_de:lua]` · gato→lua | — | (condição/lados) | tempera v3 :389 |
| R32 | ↳ interacao | n1 | o gato na luz da lua, brilhando | destilada de :390 |
| R33 | ↳ | n2 | a luz da lua acende os pelos do gato | minerada de :391 |
| R34 | ↳ | n3 | debaixo da lua, os pelos do gato viram fios de prata | minerada de :392 |
| R35 | ↳ | n4 | a luz da lua encontra o gato e acende os pelos dele um por um, até virarem fios de prata; ele nem se mexe — gato sabe quando está bonito | minerada de :393 |
| R36 | `tem:folha` · gato→folha | — | (condição/lados) | tempera v3 :395 |
| R37 | ↳ interacao | n1 | o gato pula na folha | destilada de :396 |
| R38 | ↳ | n2 | o gato vê a folha e pula, brincando | destilada de :397 |
| R39 | ↳ | n3 | o gato vê a folha no chão e não resiste: pula, bate de leve com a patinha, corre atrás | minerada de :398 |
| R40 | ↳ | n4 | o gato vê a folha caída e esquece a pose de gato sério: abaixa o rabo, mira e pula — batendo de leve com a patinha, correndo atrás quando o vento leva; até gato sério vira filhote de noite | destilada de :399 |
| R41 | `[tem:vagalume, depois_de:vagalume]` · lua→vagalume | — | (condição/lados) | tempera v3 :427 |
| R42 | ↳ interacao | n1 | a lua e a faísca, duas luzes | destilada de :428 |
| R43 | ↳ | n2 | duas luzes: a lua no alto, a faísca embaixo | destilada de :429 |
| R44 | ↳ | n3 | duas luzes na noite: a lua enorme lá no alto e a faísca pequenininha embaixo, piscando uma pra outra | destilada de :430 |
| R45 | ↳ | n4 | duas luzes acesas: a lua enorme e parada lá no alto, a faísca minúscula e dançante aqui embaixo — a grande e a pequena parecem se conhecer de algum lugar | destilada de :431 |
| R46 | `tem:orvalho` · lua→orvalho | — | (condição/lados) | tempera v3 :433 |
| R47 | ↳ interacao | n1 | a lua na grama; mil luas aos pés | minerada de :434 ("Mil luas aos pés dela") |
| R48 | ↳ | n2 | a lua se reflete no orvalho: mil luas pequeninas | minerada de :435 |
| R49 | ↳ | n3 | a lua refletida em cada gota de orvalho; o chão virando mil luas pequeninas | destilada de :436 |
| R50 | ↳ | n4 | a luz da lua encontra o orvalho e se parte em mil pedaços: mil luas pequeninas espalhadas pelo chão, pedindo cuidado a cada passo | destilada de :437 ("medo de pisar em alguma" → "pedindo cuidado a cada passo") |
| R51 | `[tem:folha, depois_de:folha]` · orvalho→folha | — | (condição/lados) | tempera v3 :465 |
| R52 | ↳ interacao | n1 | uma gota pousa na folha e brilha | destilada de :466 |
| R53 | ↳ | n2 | uma gotinha pousa bem na folha caída | destilada de :467 |
| R54 | ↳ | n3 | uma gotinha de orvalho pousa na beiradinha da folha caída e fica ali, brilhando | destilada de :468 |
| R55 | ↳ | n4 | uma gotinha de orvalho escolhe a folha caída pra morar: pousa na beiradinha, escorrega até o meio e fica ali, gordinha e brilhante — uma joia que a noite deu de presente pra folha | destilada de :469 |

## M · Manifestações objeto×cenário (como cada objeto aparece NO quintal — 10-02, tabela 2)

| nº | objeto | nível | texto | origem |
|---|---|---|---|---|
| M01 | vagalume | n1 | uma luz no fundo do quintal | destilada de :212 |
| M02 | | n2 | uma luzinha piscando no fundo do quintal | minerada de :212 |
| M03 | | n3 | no canto do quintal onde o escuro é mais fundo, uma luzinha acendendo e apagando | minerada de :216/:220 |
| M04 | | n4 | no canto do quintal onde o escuro é mais escuro, perto da cerca, uma luzinha acende e apaga como se respirasse — flutuando no ar, sem pressa | minerada de :221 ("perto da cerca" · "como se respirasse") + :220 ("flutuando no ar") |
| M05 | frasco | n1 | um pote na grama | minerada de :251 |
| M06 | | n2 | um pote de vidro esperando na grama | minerada de :256 |
| M07 | | n3 | um pote de vidro meio escondido na grama, esperando deitado | minerada de :261/:265 |
| M08 | | n4 | um pote de vidro meio enterrado na grama do quintal, esperando quieto — desses achados que a noite deixa pra quem procura | minerada de :264 ("meio enterrado") + nova (fecho) |
| M09 | vento | n1 | o vento pula o muro | minerada de :317 |
| M10 | | n2 | o vento pula o muro e corre pelo quintal | minerada de :317 |
| M11 | | n3 | o vento chega rolando por cima do muro e corre uma volta pelo quintal | minerada de :303/:317 |
| M12 | | n4 | o vento chega rolando por cima do muro, corre uma volta pelo quintal e balança a grama toda de uma vez — cheirando a terra molhada e a fim de tarde | minerada de :302-303 ("terra molhada e fim de tarde") |
| M13 | folha | n1 | uma folha cai do galho | destilada de :326/:331 |
| M14 | | n2 | uma folha se solta do galho mais alto | minerada de :337 |
| M15 | | n3 | uma folha se solta do galho mais alto da árvore do quintal e desce no ar escuro | minerada de :337/:354 ("ar escuro") |
| M16 | | n4 | do galho mais alto da árvore do quintal, uma folha se despede e vem descendo no ar que escurece, como o primeiro segredo da noite | minerada de :341/:355 ("o primeiro segredo da noite") |
| M17 | gato | n1 | um gato na cerca | minerada de :365 |
| M18 | | n2 | um gato aparece em cima da cerca | minerada de :370 |
| M19 | | n3 | em cima da cerca do quintal, um gato aparece sem fazer barulho nenhum | minerada de :375 |
| M20 | | n4 | ninguém viu de onde veio: em cima da cerca do quintal, o gato já está sentado, com a elegância de quem chegou primeiro | minerada de :379 |
| M21 | lua | n1 | a lua sobe atrás do muro | destilada de :414 |
| M22 | | n2 | a lua aparece por cima do muro do quintal | minerada de :414 |
| M23 | | n3 | a lua sobe por trás das árvores e aparece por cima do muro, enorme | minerada de :418/:414 |
| M24 | | n4 | o muro do quintal ganha uma coroa: a lua sobe devagar por trás das árvores, e a luz de prata escorre pela cerca e pela grama | minerada de :423 ("O muro ganha uma coroa" · "pela cerca, pela grama") |
| M25 | orvalho | n1 | gotas na grama do quintal | destilada de :446 |
| M26 | | n2 | o orvalho enfeita a grama do quintal | minerada de :453 |
| M27 | | n3 | sem fazer barulho, o orvalho vai pousando na grama do quintal, gota por gota | minerada de :457 |
| M28 | | n4 | sem ninguém ver, o orvalho se junta na ponta de cada folhinha de grama do quintal, até o chão inteiro brilhar de leve | minerada de :460-461 ("ponta de cada folhinha de grama" · "chão inteiro brilhar de leve") |

## Contagem

- **Total de células de conteúdo:** 7 (cenário) + 78 (objetos, incl. identidade gramatical/dominante/registro) + 55 (relações) + 28 (manifestações) = **168**.
- **Origem:** ~91% mineradas/destiladas do v3 · **novas de verdade:** o campo `sensacao_no_personagem` (estrutura D-11.2, textos minerados da moldura), fecho de M08, fecho de O78 — e o `corpo{n1..n4}` como CAMADA (a estrutura nasceu na PoC; os gestos vieram do v3).
- **Ajustadas:** 1 (O42, dígrafo — ver Divergência 3).
- **Não migrou (por contrato):** ecos (13 fragmentos, :65-189 — arranjo do compositor, fase 11) · temperas `pos:*` (4 — viraram matéria das manifestações) · moldura abertura/desfecho/conectivos (fase 11/realizador).

> Gate desta etapa: `lint_fichas` = **0 erros** · 4 avisos A1 (tabela no topo) · suíte completa verde.
