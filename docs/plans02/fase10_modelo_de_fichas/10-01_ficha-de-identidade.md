# fase10 · 10-01 · Ficha de identidade (objeto: o que é)

## Identidade
- id: `fase10-10-01`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Especificar a camada 1 do modelo de fichas: a ficha de identidade — o que o objeto É, cross-cenário, com descrição em dial de riqueza pelos 4 níveis.

## Pré-requisitos / Depende de
- `[[fase10-10-00]]` — o contrato `pipoca.fichas.v1` que esta camada obedece.

## Arquivos afetados
- `docs/fichas/objetos.v1.json` — PLANEJADO (proposta de [[fase10-10-00]]); criado só na implementação.

## Nomes & variáveis
- `FichaIdentidade` — reaproveitado de [[fase10-10-00]].
- `genero`, `numero` — flexão gramatical do objeto (obrigatórios).
- `descricao` — objeto com os 4 níveis; o "dial de riqueza".
- `sensacao` — bloco de sensação corporal; o detalhe do campo `corpo` vive em [[fase10-10-03]].
- `NivelKey` — reaproveitado da geração 1 (`src/core/composicao.ts`).

## Interfaces / contratos
A ficha de identidade responde **"o que é isto?"** em quatro alturas de leitura — e nada mais. Exemplo completo validado na prova de conceito:

```jsonc
"vagalume": {
  "genero": "m",
  "numero": "sg",
  "descricao": {
    "n1": "uma luzinha que pisca",
    "n2": "um vaga-lume que acende e apaga",
    "n3": "um vaga-lume que pisca devagar, como uma estrelinha que desceu para brincar",
    "n4": "um vaga-lume solitário, faísca viva que acende e some no escuro, piscando como quem chama"
  },
  "sensacao": {
    "dominante": "visão",
    "registro": "encanto silencioso",
    "corpo": {
      "n1": "os olhos seguem a pisca",
      "n2": "os olhos seguem a pisca; chegar perto na ponta dos pés",
      "n3": "os olhos que seguem a pisca; a vontade de chegar perto na ponta dos pés",
      "n4": "os olhos que seguem a pisca; a vontade de chegar perto na ponta dos pés, prendendo a respiração"
    }
  }
}
```

O **dial de riqueza** da `descricao`: n1 = imagem mínima e decodificável (sílabas simples); n2 = a mesma imagem em frase curta; n3 = a imagem com uma comparação; n4 = a imagem com interioridade ("como quem chama"). É a MESMA coisa vista com mais ou menos lente — nunca coisas diferentes por nível.

## Regras de negócio
1. **Cross-cenário:** a identidade vale em qualquer cenário — o vagalume É a mesma criatura no quintal e onde mais aparecer; o que muda por cenário vive na camada 2 ([[fase10-10-02]]).
2. **Tolerância a vizinho:** a `descricao` não pode pressupor nem mencionar outro objeto do catálogo (ex.: a folha não pode ser descrita como "a folha que o vento derruba") — interação é papel exclusivo da ficha de relação. Regra mecanizada no lint ([[fase10-10-05]]).
3. **Matéria-prima, não frase pronta:** a descrição é dado para o realizador compor prosa — não é frase de história; não traz a personagem, não traz verbo de cena dela.
4. **Personagem fora da ficha:** nome e gênero da criança vêm do perfil (invariante de [[fase10-10-00]]).
5. Os 4 níveis são obrigatórios em `descricao` (e em `sensacao.corpo`, ver [[fase10-10-03]]).

## Passos de implementação
1. Confirmar com o Manoel o escopo-alvo (os 7 objetos do quintal, abaixo).
2. Autorar as 7 fichas de identidade minerando o `docs/quintal.v3.json` conforme [[fase10-10-04]] (as imagens autorais das variantes viram descrições).
3. Preencher `sensacao` de cada objeto conforme o mapa sensorial de [[fase10-10-03]].
4. Validação humana célula a célula (parada dura) + lint ([[fase10-10-05]]) por lote.

## Estados / edge-cases
- Objeto com gênero feminino (`folha`, `lua`): a flexão em artigos/adjetivos da descrição precisa estar correta na própria ficha — o realizador flexiona a prosa, não conserta a ficha.
- Objeto plural (nenhum no quintal hoje; `numero` = `"pl"` previsto no contrato) — primeira ficha plural exigirá revisão dos exemplos.
- Descrição n4 longa demais → risco de dominar o parágrafo; teto de tamanho é candidato a aviso de lint (registrado em [[fase10-10-05]]).

## Critérios de aceitação / verificação
- [ ] Exemplo completo do vagalume embutido e conforme o contrato de [[fase10-10-00]].
- [ ] Regra de tolerância a vizinho enunciada e mapeada para o lint.
- [ ] Escopo-alvo da implementação: os **7 objetos do quintal** (ids do `docs/quintal.v3.json`):
  1. `vagalume` — vaga-lume 🪲 (m, papel núcleo; registro assombro/segredo)
  2. `frasco` — pote de vidro 🫙 (m, papel chave; curiosidade/lente)
  3. `vento` — vento 🍃 (m; aconchego/respiração)
  4. `folha` — folha 🍂 (**f**; delicadeza/tempo)
  5. `gato` — gato 🐈 (m; cautela/mistério)
  6. `lua` — lua 🌙 (**f**; deslumbre/vastidão)
  7. `orvalho` — orvalho 💧 (m; preciosidade minúscula)

## Relações com outros docs
- Depende de: `[[fase10-10-00]]`
- É consumido por: `[[fase10-10-02]]`, `[[fase10-10-03]]`, `[[fase10-10-04]]`, `[[fase10-10-05]]`
- Reconcilia / conserta: —
