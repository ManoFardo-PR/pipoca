# Revisão de autoria — Lá no Espaço (`docs/espaco.v3.json`)

> Cenário novo (Etapa 4, a última do plano de autoria dos 4 cenários,
> 2026-09-09). O desafio era o corpo sem chão: resolvido com o FOGUETE como
> casa (poltrona, cabine, janela redonda) e a FLUTUAÇÃO como registro corporal
> — o vidro da janela vira o lugar do tato (nariz colado, dedo seguindo rastro,
> testa encostada).

**As três leis aplicadas:** (1) o corpo da Joana é o centro — presença em
**100%** dos slots nas 240 histórias do espaço (a régua pegou 4 células
apoiadas só em "Ele/avisando" e todas foram reescritas com ela dentro); (2) o
ESPAÇO é o contador — "conta no silêncio: acende uma luz de cada vez na
janela, e espera os olhos chegarem"; (3) desejo plantado na abertura (visitar
as luzes, uma a uma), corpo colhido no desfecho ("pousa de coração aceso — o
espaço inteiro veio junto").

**Mapa sensorial** (dominante por objeto): foguete = flutuar+abrigo · planeta
= visão-grande (o gigante que gira devagar) · **cometa (núcleo)** = movimento
acompanhado (o risco de ponta a ponta) · estrela = visão-longe (ficha REUSADA
do catálogo — a mesma estrela da janela do quarto, "agora de pertinho": a
continuidade É o conteúdo) · satélite = companhia que pisca · poeira = brilho
em volta · **Terra (chave)** = visão-casa. Arco: casa voadora → gigantes e
viajantes → vizinhança que pisca → e a luz mais bonita é a de casa.

**Estrutura (= Quintal):** R1 revela foguete/planeta/cometa/estrela, escolhe
3, ordena, trava pontas; R2 satélite, R3 poeira, R4 Terra no miolo. Abertura e
convergente ×4 (3/3/2/2); conectivos 3/4/4/3 ("Lá adiante,"/"Flutuando mais um
pouquinho," dão o andamento da viagem); **9 ecos alcançáveis** (2 compostos
foguete→cometa e estrela→planeta + 3 por fim + 4 por começo); 12 temperas (10
obj×obj espelhadas + foguete `pos:inicio`, Terra-chave `pos:fim`); 10 relações
+ 7 manifestações. Fios narrativos: a estrela AVISA o cometa
(`antes_de:cometa` — sineta de teatro), o cometa PLANTA a poeira
(`antes_de:poeira` — o rastro que vira nuvem), o planeta RECONHECE a poeira no
anel, e o foguete VIRA antes da Terra aparecer (`antes_de:terra_azul`) —
quatro sementes que recompensam ordens diferentes.

**Decisão técnica registrada — id `terra_azul`:** o id curto `terra` colidiu
no E5 global com a trilha da floresta ("trilha de terra batida" em todos os
níveis). Renomeado para `terra_azul` (nome de UI segue "Terra"): underscore
nunca sobrevive à tokenização do lint, então o id é imune a E5 por construção
— o mesmo padrão fica de precedente para futuros ids que sejam palavras
comuns.

## Gates (estado no momento desta revisão)

- lint-manifesto (**5 de 5 cenários lintados**): **0 erros, 0 avisos**.
- Fumaça de presença: **1200 histórias** (5 cenários × 30 arranjos × 2 modos ×
  4 níveis) — replay determinístico, presença em **100%** dos slots.
- `bun x tsc --noEmit` ✅ · `npm test` 147/147 ✅ (goldens do Quintal INTOCADOS)
  · `npm run check:paridade` ✅ · e2e canônico 106/106 ✅ (2 sub-testes
  pulados COM AVISO, por desenho: "liberar sem conteúdo" e "gesto inerte" não
  existem mais quando todos os cenários estão publicados).
- Âncoras novas (6): foguete, planeta, cometa, satélite, poeira, terra_azul —
  estrela reusa as do quarto. **Redeploy da edge pendente (lote completo dos
  4 cenários — aguarda o "pode" do dono).**

## Fumaça manual — linha real (estrela → foguete → poeira → satélite → planeta → cometa, n3, aberto)

> O foguete sobe macio como um suspiro, e quando a Joana percebe, já está
> flutuando um dedinho acima da poltrona. Lá fora, na janela redonda, o espaço
> abre o quintal dele: grande, quieto, cheio de luzes esperando visita. A
> estrela pisca mais forte de repente, duas, três vezes — e a Joana entende o
> aviso: fica de olho, que vem coisa bonita aí. De repente, a casa voadora
> cuida de tudo: voa reto, ronca manso, deixa o ar quentinho. A Joana solta o
> corpo e flutua devagar, os braços abertos, aprendendo o jeito novo de estar.
> Foi então que a poeira de estrelas aparece de mansinho: primeiro um brilho,
> depois dez, depois mil. A Joana cola na janela e fica no meio da nuvem
> acesa, quietinha — atravessar isso é passear dentro de um enfeite. E, no
> silêncio, o satélite pisca duas vezes pra estrela, e a estrela responde
> piscando também — vizinhos antigos — e a Joana assiste a conversa,
> encantada. Mais adiante, a Joana olha o anel do gigante e reconhece o
> brilho: é da mesma poeira de estrelas — o planeta fez um anel do que o céu
> tem de melhor. O cometa capricha na passada: cruza pertinho da estrela e
> balança o rastro, como quem acena — e a Joana ri: até no céu vizinho
> cumprimenta vizinho. E o rastro do cometa fica riscado no céu ainda um
> tempão, brilhando devagar — a assinatura da noite, deixada pra Joana ler.

## Decisões para o veto do dono

1. **`lua` REJEITADA no espaço** (decisão do plano): o id global pertence ao
   Quintal com ficha "vista do quintal". A vaga da "luz conhecida" ficou com a
   ESTRELA reusada — que ainda rende a ponte emocional com o quarto.
2. **Terra como chave `pos:fim`** — "a luz mais bonita estava acesa em casa o
   tempo todo": o desfecho emocional da série inteira de cenários.
3. **Âncora "terra" do terra_azul** é segura por escopo: âncoras validam por
   pacote, e pacote é de UM cenário — "terra batida" da trilha nunca entra num
   pacote do espaço.
4. **Ecos com "E pensar que..."** seguem o padrão do Quintal (eco não recebe
   conectivo, então pode abrir com "E").
