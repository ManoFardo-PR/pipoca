# Revisão de autoria — O Fundo do Mar (`docs/fundomar.v3.json`)

> Cenário novo (Etapa 3 do plano de autoria dos 4 cenários, 2026-09-09), no
> registro da Oficina A2. Primeiro cenário fora do "chão": o corpo da Joana
> flutua — braçada leve, embalo, boiar — e o mar é anfitrião que APRESENTA
> moradores, não lugar que esconde segredos.

**As três leis aplicadas:** (1) o corpo da Joana é o centro — presença em
**100%** dos slots nas 240 histórias do fundo do mar; (2) o MAR é o contador —
"conta devagar, no embalo da água: apresenta um morador de cada vez"; (3)
desejo plantado na abertura (conhecer os moradores, um por um, sem espantar
nenhum), corpo colhido no desfecho (sobe com "o peito cheio de mar morno: um
pedaço que veio junto, que não escorre e não seca").

**Mapa sensorial** (dominante por objeto): **peixe (núcleo)** = movimento
acompanhado (nada do lado) · concha = tato-liso + ouvido (o mar guardado
dentro) · coral = visão-cores (jardim parado) · alga = movimento-dança
(balanço da água) · polvo = toque curioso (braço a braço) · tartaruga =
quietude/planar (calma antiga) · **baú (chave)** = descoberta (tampa pesada).
Registro corporal novo do cenário: flutuação (boiar, embalo, braçada leve,
respiração "do tamanho do mar").

**Estrutura (= Quintal):** R1 revela peixe/concha/coral/alga, escolhe 3,
ordena, trava pontas; R2 polvo, R3 tartaruga, R4 baú no miolo. Abertura e
convergente ×4 (3/3/2/2); conectivos 3/4/4/3 ("Mais no fundo,"/"Descendo mais
um pouquinho," dão a direção do mergulho); **9 ecos alcançáveis** (2 compostos
concha→peixe e peixe→coral + 3 por fim + 4 por começo); 13 temperas (10 obj×obj
espelhadas + peixe `pos:inicio`, baú-chave `pos:fim`); 10 relações + 7
manifestações. **Fio narrativo próprio: a concha-chave** — concha
`antes_de:bau` ("parece chave de alguma coisa") → baú `depois_de:concha` ("a
concha encaixa no desenho da tampa: era a chave o tempo todo") — recompensa a
ordem sem exigi-la; sem concha, o polvo ajuda no mutirão da tampa, e sem os
dois o baú abre sozinho no capricho.

**Disciplina aplicada:** fichas A1/A2 zeradas — a varredura pegou "bicho" (ch)
no n1 do polvo → "morador"; "pra ele" no corpo do peixe → "esperando a
confiança chegar"; "sozinhas" predicativo na relação alga×tartaruga → "por
conta própria". "estrela-do-mar" evitada por prudência (id `estrela` já existe
no catálogo global — o token com hífen não colide, mas imagem repetida sim).

## Gates (estado no momento desta revisão)

- lint-manifesto (4 cenários lintados): **0 erros, 0 avisos**.
- Fumaça de presença: **960 histórias** (4 cenários) — replay determinístico,
  presença em **100%** dos slots (limiar: 60%).
- `bun x tsc --noEmit` ✅ · `npm test` 147/147 ✅ (goldens do Quintal INTOCADOS)
  · `npm run check:paridade` ✅ · e2e canônico 108/108 ✅.
- Âncoras novas (7): peixe*, concha, coral, alga*, polvo, tartaruga, baú —
  espelhadas na edge. **Redeploy pendente** (mesmo lote do quarto/floresta).

## Fumaça manual — linha real (concha → alga → tartaruga → polvo → coral → peixe, n3, aberto)

> A luz do sol entra na água em fios compridos, acendendo o caminho até o
> fundo. A Joana respira fundo, mergulha devagarinho e desce — o mar balança
> ela como quem diz: bem-vinda. A concha é enrolada em espiral, lisa de
> escorregar. A Joana segue o desenho com o dedo até a abertura, e então
> encosta no ouvido: tem um mar pequenininho morando ali. Foi então que as
> fitas verdes se abrem como cortina de teatro, e a tartaruga atravessa no
> meio, devagar — a Joana assiste de boca aberta. E, na correnteza, o peixe se
> ajeita na sombra da tartaruga e vai de carona, remando de mentirinha — a
> Joana ri por dentro: até morador pega carona. Foi então que o polvo vê a
> concha na mão da Joana e estica um braço, interessadíssimo — polvo é
> colecionador, e aquela é das boas. De repente, um jardim de coral abre lá
> embaixo — galhos redondos, leques abertos, todas as cores paradas. A Joana
> boia por cima devagar, sem tocar, passeando de cor em cor com os olhos. Um
> peixe pequeno e dourado chega sem medo nenhum e fica — nadando em volta da
> Joana, na frente, do lado, como quem mostra que ela é visita bem-vinda. E a
> Joana entende, na hora de subir: o mar que a concha contou no começo era
> isto aqui — e o peixe fecha a visita nadando uma volta inteira de tchau em
> volta dela.

## Decisões para o veto do dono

1. **`alga` no lugar da `bolha`** da semente fase08 (lh no nome; a alga rende
   a dança da correnteza, corpo inteiro participando).
2. **Ética do tesouro**: no conta n4 do baú, "tesouro de mar se visita, não se
   leva embora" — coerente com "olhar pode, levar não" do polvo colecionador.
   Exceção deliberada: o eco `se_terminou_com: concha` deixa a concha ir junto
   ("o presente que o fundo deixou levar") — presente dado é diferente de
   coisa tirada.
3. **Emoji do baú: 🧰** (caixa de ferramentas — não há emoji de baú de
   tesouro; alternativa seria 💰, rejeitada por virar "dinheiro").
4. **Nome de UI do peixe: "peixinho"** (id global `peixe`), casando com a
   semente fase08.
