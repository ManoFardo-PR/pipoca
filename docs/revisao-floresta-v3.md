# Revisão de autoria — A Floresta Sussurrante (`docs/floresta.v3.json`)

> Cenário novo (Etapa 2 do plano de autoria dos 4 cenários, 2026-09-09), escrito
> no registro da Oficina A2. Régua de voz: o gato do Quintal (calma antiga) e a
> folha (movimento acompanhado com o corpo).

**As três leis aplicadas:** (1) o corpo da Joana é o centro — toda variante
carrega a Joana, "ela/dela" ou corpo (fumaça: presença em **100%** dos slots nas
240 histórias da floresta); (2) a FLORESTA é a contadora — "não grita as coisas
que sabe: sussurra, e só pra quem entra devagar"; (3) desejo plantado na
abertura (ir atrás dos sussurros, um por um), corpo colhido no desfecho (volta
mais leve, segredos guardados no peito "pra não derramar nenhum").

**Mapa sensorial** (dominante por objeto): trilha = pés no chão (terra macia) ·
**cogumelo (núcleo)** = visão-brilho (luz baixinha na sombra) · riacho =
audição+frio (água nos dedos) · pássaro = audição (canto e resposta) · musgo =
tato (veludo fresco) · borboleta = movimento acompanhado (voo sem pressa) ·
**clareira (chave)** = visão-grande (luz aberta). Arco da tarde: caminho →
segredo aceso → conversa da água → chamado → veludo → guia delicada → sala
secreta de luz.

**Estrutura (= Quintal):** R1 revela trilha/cogumelo/riacho/pássaro, escolhe 3,
ordena, trava pontas; R2 musgo, R3 borboleta, R4 clareira no miolo. Abertura e
convergente ×4 níveis (3/3/2/2); conectivos 3/4/4/3 (n1 de 1 palavra, com
"Mais adiante,"/"E, num sussurro," dando o andamento de caminhada); **9 ecos
alcançáveis** (2 compostos cogumelo→trilha e pássaro→riacho + 3 por fim + 4 por
começo); 12 temperas (10 obj×obj espelhadas nas relações + trilha/cogumelo
`pos:inicio` + clareira-chave `pos:fim`); 10 relações objeto×objeto + 7
manifestações. Fio narrativo novo: a borboleta como GUIA (`antes_de:clareira`
"voa na frente, como quem conhece o caminho" → clareira `depois_de:borboleta`
"era pra cá que ela estava trazendo") — recompensa quem ordena borboleta antes
da clareira, sem quebrar nenhuma outra ordem.

**Disciplina aplicada:** nenhuma variante abre por marcador (a tempera do riacho
"Então era isso…" virou "O caminho sabia aonde ia…" ainda no rascunho); fichas
com A1/A2 **zerados** — a varredura pegou 4 dígrafos de n1 que passaram na
primeira escrita: "caminho" (nh!) na trilha ×2, "brilho" no cogumelo, "cheio"
na clareira → "passagem de terra", "pés seguem pela terra", "olhos vão até a
luz", "todo de luz".

## Gates (estado no momento desta revisão)

- lint-manifesto (3 cenários lintados): **0 erros, 0 avisos**.
- Fumaça de presença: **720 histórias** (3 cenários) — replay determinístico,
  presença em **100%** dos slots (limiar: 60%).
- `bun x tsc --noEmit` ✅ · `npm test` 147/147 ✅ (goldens do Quintal INTOCADOS)
  · `npm run check:paridade` ✅ · e2e canônico 108/108 ✅.
- Âncoras novas (7): trilha, cogumelo, riacho, pássaro, musgo, borboleta,
  clareira — espelhadas na edge. **Redeploy da edge pendente** (junto com o do
  quarto); até lá a floresta roda honesta no A+.

## Fumaça manual — linha real (trilha → cogumelo → borboleta → musgo → pássaro → riacho, n3, aberto)

> A floresta fala baixinho, num sussurro de folhas e sombra, e a Joana entra
> pisando leve — quem quer ouvir segredo não pode chegar fazendo barulho. A
> tarde da Joana começa pelos pés: o primeiro passo na terra macia, e a floresta
> inteira ficando quieta pra ver quem chegou. E, num sussurro, no lugar mais
> escuro do pé da árvore, um cogumelo acende uma luzinha verde-clarinha. A Joana
> abaixa devagar, as mãos nos joelhos, o rosto chegando pertinho do brilho. De
> repente, a borboleta encontra a luzinha do cogumelo e fica rodeando, encantada
> — e a Joana espia os dois segredos se conhecendo. Foi então que uma pedra
> grande veste um tapete de musgo, verde e fresquinho. A Joana espalma a mão em
> cima e afunda devagar — é o macio mais macio da floresta inteira. E, num
> sussurro, a borboleta atravessa o ar bem na frente do pássaro, e ele só
> acompanha com a cabecinha, educado — a Joana sorri: na floresta os pequenos se
> respeitam. O caminho sabia aonde ia: entrega a Joana bem na beira da água,
> como quem dá um presente. E a água do riacho continua a conversa sem parar,
> cantando um tchau comprido que acompanha a Joana até a saída.

## Decisões para o veto do dono

1. **Elenco final** vs semente da fase08: entraram `musgo` (no lugar de
   pinha/graveto — sensorial mais rico e sem dígrafo) e `borboleta`+`clareira`;
   `lanterna` REJEITADA (colide com âncora do vagalume).
2. **Clareira como chave `pos:fim`** — a floresta "guarda o melhor pro fim";
   espelha o frasco do Quintal e o cobertor do Quarto.
3. **Âncora "água" do riacho** é generosa (aparece em frases do pássaro/musgo
   ligadas ao riacho) — leniência pró-PASS, mesmo precedente da "luz" do
   vagalume.
4. **"sussurro de folhas" na abertura** menciona folha (objeto do Quintal) como
   paisagem — não é beat da floresta, sem efeito no validador.
