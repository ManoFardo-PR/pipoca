# Brief para o Claude Design — Pipoca

> **Pipoca** é o nome do app (pipoca = popcorn). Caloroso, brasileiro, brincalhão — evoca um agrado e a ideia de algo que *estoura e cresce*, exatamente o que a história faz a cada leitura. Use isso como fio para a identidade visual: um aconchego de "sessão pipoca", leveza e surpresa boa, **sem** virar tema literal de milho/cinema.

## O que criar
Protótipo de interface de um **aplicativo web (PWA, mobile-first, ideal em tablet)** de **leitura e criação de histórias** para crianças em fase de alfabetização, com foco em crianças de **dupla excepcionalidade (2e)**, TDAH e autismo.

**Mecânica central (o coração do produto):** a criança brinca com objetos dentro de um **ambiente ilustrado rico**; uma história simples se forma a partir desses objetos; a criança **lê em voz alta**; ao ler, ela **destrava** a possibilidade de adicionar novos objetos, e a história fica mais rica. A leitura é a moeda — *ler faz o mundo crescer*. Os pontos não são "fichas de obediência"; são o registro visível de um esforço que normalmente é invisível.

## Audiência e os princípios que decidem tudo
Crianças **simultaneamente brilhantes e com dificuldades** (alta habilidade + desafio executivo/sensorial). Daí quatro regras inegociáveis:

1. **Nunca condescendente, nunca clínico.** Nada de estética "bebezão" (insulta a parte superdotada), nada de edtech estéril e frio. O alvo é a **sofisticação calorosa do Bluey**: encanta criança e adulto ao mesmo tempo, sem subestimar ninguém.
2. **Nunca envergonha.** Quando a criança trava numa palavra, a tela **ajuda** — a palavra se ilumina suavemente, um botão "ouvir de novo" modela o som (TTS), e ela tenta outra vez. **Jamais** um X vermelho, jamais "errado/reprovado". O estado de re-tentativa precisa parecer acolhimento, não correção. (Crianças 2e costumam ter sensibilidade aguda à rejeição.)
3. **Rico, mas calmo.** "Ambiente rico" NÃO é poluição visual. Para a criança autista, excesso sensorial é tortura, não encanto. Profundidade e vida vêm de luz, textura e camadas — não de quantidade de estímulos competindo. Cada tela tem **um** foco claro.
4. **Feedback imediato e previsível.** Recompensa e resposta acontecem na hora (TDAH não espera). A estrutura é repetível e previsível o suficiente para dar segurança, com novidade suficiente para não entediar.

## Direção estética — "mundo Bluey"
- **Atmosfera:** luz quente de fim de tarde, aquarela pintada à mão, formas arredondadas, contornos suaves (nada de vetor liso e frio). Sensação de quintal ensolarado, acolhedor, vivo.
- **Paleta:** fundos em **creme/areia quentes** (não branco clínico); **azul-heeler** como cor de marca; **laranja-terracota** como cor quente de ação e recompensa; **verde-folha** e **azul-céu** para os ambientes. Cores saturadas mas amaciadas por textura.
- **Ambientes (a peça-herói):** cenas ilustradas exploráveis e em camadas — quintal, quarto, floresta, espaço, fundo do mar — com **parallax sutil** e "respiração" leve. É aqui que a energia de design deve ser gasta.
- **Movimento:** gentil e orgânico; **toggle obrigatório de "reduzir movimento"** (sensibilidade vestibular/autismo).

## Sistema visual
- **Tipografia de leitura:** fonte grande, altíssima legibilidade, **espaçamento generoso** entre letras e linhas; opção de **fonte para dislexia**; opção de **destaque silábico**. Nunca texto pequeno ou denso.
- **Ícones:** legíveis por pré-leitores (imagem antes de palavra), grandes, com rótulo opcional.
- **Alvos de toque:** grandes, espaçados, à prova de mãos pequenas e de coordenação ainda em formação.
- **Token/ponto:** algo **colecionável e narrativo** (uma marca que conta história), não uma ficha de caixa.

## Telas a desenhar
1. **Onboarding do cuidador** *(adulto; mais sóbrio)* — criar perfil da criança, definir nível de leitura, escolher modo de verificação (cuidador-no-loop / autorrelato / fala), montar cardápio de recompensas, duração do bloco de foco. **[MVP]**
2. **Entrada da criança** — login visual sem senha digitada (escolher avatar/rosto). **[MVP]**
3. **Seleção de cenário** — galeria dos ambientes ricos. **[MVP · vitrine visual]**
4. **Ambiente de história + brincar** *(TELA PRINCIPAL)* — cena ilustrada explorável com **objetos arrastáveis**; a história em texto grande sobre/ao lado da cena; botão "ler em voz alta"; objetos novos aparecem **bloqueados**, à espera da leitura. **[MVP · investir aqui]**
5. **Leitura / o portão** — modo de leitura em voz alta: texto grande, palavra atual destacada, botão "ouvir", confirmação suave (cuidador toca / criança toca / microfone). Inclui o **estado de re-tentativa acolhedor**. **[MVP]**
6. **Recompensa imediata** — micro-celebração calorosa (não estridente): o objeto novo "se acende" e pode ser adicionado, os pontos somam. **[MVP]**
7. **Cardápio de recompensas / resgate** — pontos viram privilégios; mostra **gastar (~2/3) vs. poupar (~1/3)** para recompensa maior. **[MVP leve]**
8. **Painel do cuidador** — evolução da leitura (minutos, palavras, histórias) e engajamento ao longo do tempo; visual encorajador, não planilha fria. **[Fase 1.5]**

## Entregáveis
- Mockups das telas-chave, com a **tela 4 (ambiente rico)** como peça-herói.
- **Folha de componentes:** botões, cartão de história, token, chip de objeto, barra de progresso de leitura, modal do cuidador.
- **Estados:** vazio, lendo, sucesso, **re-tentativa acolhedora**.
- Paleta e tipografia documentadas.

## Restrições
- PWA responsivo, **mobile-first** com otimização para **tablet**; online-first.
- **Sem dark patterns**, sem loops de engajamento manipulativos, sem pressa artificial punitiva.
- Privacidade controlada pelo cuidador (postura LGPD); conteúdo seguro para crianças.
- Acessibilidade: contraste ajustável, reduzir movimento, fonte para dislexia, alvos de toque grandes.

## O que EVITAR
Superestímulo sensorial · poluição visual · vermelho de "erro" e X punitivos · estética infantilizada · frieza de edtech genérico · recompensa tipo cassino · qualquer coisa que faça a criança sentir que está sendo *consertada*.
