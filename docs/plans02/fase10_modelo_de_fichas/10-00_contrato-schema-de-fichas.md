# fase10 · 10-00 · Contrato do schema de fichas

## Identidade
- id: `fase10-10-00`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: pivot

## Objetivo
Definir o contrato `pipoca.fichas.v1` — as três camadas de fichas (identidade, relação, cenário), seus arquivos, o versionamento e os invariantes que toda a fase 10 obedece.

## Pré-requisitos / Depende de
Nenhum doc do plans02 — este é o pivô que abre a geração 2. Linhagem (geração 1, citada por caminho simples): o banco de frases `docs/quintal.v3.json` (esquema `pipoca.grafo-autoral.v3`, ~203 variantes de texto), a revisão editorial `docs/revisao-quintal-v3-A2.md` e a prova de conceito do realizador em `experimentos/beats-para-paragrafos/`.

**Por quê fichas:** na geração 1 o Motor A+ escreve frases prontas — cada nova imagem custa 4 níveis × N variantes de texto autoral. Na geração 2 o A+ vira compositor (decide e emite estrutura) e um realizador LLM escreve a prosa; o conteúdo vira **fichas reaproveitáveis** — dados sobre o que cada coisa É, como interage e o que provoca no corpo — validadas por prova de conceito (10 gerações, 4 níveis, 2 gêneros: fidelidade 100%, flexão de gênero limpa, relações e ecos respeitados).

## Arquivos afetados
Todos **PLANEJADOS** — criar somente na implementação, guiada por este doc (a fase 10 planeja; `docs/fichas/` ainda não existe e não nasce aqui):
- `docs/fichas/objetos.v1.json` — fichas de identidade (camada 1, cross-cenário).
- `docs/fichas/relacoes.quintal.v1.json` — fichas de relação do cenário quintal (camada 2).
- `docs/fichas/cenarios.v1.json` — fichas de cenário (camada 3).

**Decisão fixada (2026-07-09):** os três caminhos acima e o id de esquema `pipoca.fichas.v1` estão CONFIRMADOS como o contrato desta geração.

## Nomes & variáveis
- `pipoca.fichas.v1` — id do esquema (campo `esquema` de cada arquivo de fichas), no padrão dos esquemas da geração 1.
- `FichaIdentidade` — tipo da camada 1: o que o objeto É.
- `FichaRelacao` — tipo da camada 2: como o objeto interage (objeto×objeto, objeto×cenário, cenário×personagem).
- `FichaCenario` — tipo da camada 3: o mundo e sua voz de contador.
- `NivelKey` — reaproveitado da geração 1 (`src/core/composicao.ts`): as chaves de nível `n1`, `n2`, `n3`, `n4`.

## Interfaces / contratos

### Camada 1 — `FichaIdentidade` (arquivo: `docs/fichas/objetos.v1.json`)
Base canônica **validada na prova de conceito** — o vagalume completo:

```jsonc
{
  "esquema": "pipoca.fichas.v1",
  "objetos": {
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
  }
}
```

Nota de evolução: na prova de conceito `corpo` era **string única**; a lição do n1 (texto picado quando o realizador recebe três fragmentos de corpo num nível de sílabas) exigiu **corpo por nível** — n1 = UMA sensação; a riqueza escala com o nível, como a descrição. O porquê detalhado vive em [[fase10-10-03]].

Campos da camada 1:

| campo | tipo | obrigatório | nota |
|---|---|---|---|
| `genero` | `"m"` \| `"f"` | sim | flexão de artigos/adjetivos pelo realizador |
| `numero` | `"sg"` \| `"pl"` | sim | idem |
| `descricao` | objeto com os 4 níveis (string cada) | sim (os 4 níveis) | dial de riqueza: n1 curto e decodificável → n4 imagem rica |
| `sensacao.dominante` | string | sim | sentido dominante (ver mapa em [[fase10-10-03]]) |
| `sensacao.registro` | string | sim | tom emocional (ex.: "encanto silencioso") |
| `sensacao.corpo` | objeto com os 4 níveis (string cada) | sim (os 4 níveis) | n1 = UMA sensação (sem `;`) |

### Camada 2 — `FichaRelacao` (arquivo: `docs/fichas/relacoes.quintal.v1.json`)
Chaveada pelas condições da gramática v3 (`tem:`, `depois_de:`, `antes_de:`, `pos:`). Descreve **interação** para o realizador — nunca frase pronta. Shape (detalhamento e exemplos completos em [[fase10-10-02]]):

```jsonc
{
  "esquema": "pipoca.fichas.v1",
  "cenario": "quintal_anoitecer",
  "objeto_x_objeto": [
    { "se": "antes_de:folha", "objeto": "vento", "alvo": "folha",
      "interacao": { "n1": "…", "n2": "…", "n3": "…", "n4": "…" } }
  ],
  "objeto_x_cenario": [
    { "objeto": "vagalume",
      "manifestacao": { "n1": "…", "n2": "…", "n3": "…", "n4": "…" } }
  ]
}
```

**Decisão fixada (2026-07-09):** a relação cenário×personagem vive na **ficha de cenário** (camada 3) — o arquivo de relações fica só com objeto×objeto e objeto×cenário. E o campo `alvo` entra no contrato da relação: os dois lados são declarados explicitamente; o realizador nunca deriva o alvo parseando a condição `se` (o porquê e o detalhe em [[fase10-10-02]]).

### Camada 3 — `FichaCenario` (arquivo: `docs/fichas/cenarios.v1.json`)

```jsonc
{
  "esquema": "pipoca.fichas.v1",
  "cenarios": {
    "quintal_anoitecer": {
      "nome": "o quintal ao anoitecer",
      "descricao": "…",
      "voz_do_contador": "o quintal fala baixinho, como quem sussurra segredos só pra ela",
      "sensacao_no_personagem": { "n1": "…", "n2": "…", "n3": "…", "n4": "…" }
    }
  }
}
```

**Decisão fixada (2026-07-09):** a `descricao` do cenário é **string única** — não é por nível. Nota de jardim: variações futuras de cenário serão TEMÁTICAS (ex.: temas de época), não por nível de leitura — quando vierem, entram como NOVAS fichas de cenário, não como campos por nível. A ficha de cenário também hospeda a relação cenário×personagem (`sensacao_no_personagem`, por nível — o shape veio da camada 2; a decisão moveu ONDE vive, não o formato) e a `voz_do_contador` (Lei 2).

## Regras de negócio
1. **Versionamento:** `.vN` publicado nunca é mutado; substituído vai a `old/` com selo — mesma disciplina da geração 1.
2. **`genero`/`numero` obrigatórios** em toda ficha de identidade (regra de lint, ver [[fase10-10-05]]).
3. **Os 4 níveis obrigatórios** em `descricao` e em `sensacao.corpo` (regra de lint).
4. **Tolerância a vizinho:** a descrição de identidade não pode pressupor outro objeto do catálogo — descrever interação é papel exclusivo da ficha de relação.
5. **A régua editorial da geração 1 permanece** (formulação canônica em `docs/revisao-quintal-v3-A2.md`): Lei 1 — o corpo da criança é o centro; Lei 2 — o cenário é o contador; Lei 3 — desejo plantado na abertura, corpo colhido no desfecho.
6. **JSON-first:** fichas nascem como JSON versionado no repositório; migração a banco de dados é assunto da fase 13, fora deste doc.
7. **Personagem vem do perfil:** nome e gênero da criança vêm do cadastro/perfil, **nunca** de arquivo de ficha.

## Passos de implementação
Ordem para quando a implementação começar (este doc só planeja):
1. Criar `docs/fichas/` com os três arquivos, cada um só com o campo `esquema` preenchido.
2. Autorar as fichas na ordem: identidade ([[fase10-10-01]]) com sensação ([[fase10-10-03]]) → relações ([[fase10-10-02]]) — minerando o quintal conforme [[fase10-10-04]].
3. Rodar o lint ([[fase10-10-05]]) a cada lote autorado.
4. Rodar a validação em escala ([[fase10-10-04]], critério-portão) antes de dar a fase 10 por aceita.

## Estados / edge-cases
- Objeto pedido pelo compositor sem ficha no catálogo → erro explícito de composição; nunca inventar conteúdo.
- Nível ausente numa ficha → ERRO de lint; o runtime nunca degrada silenciosamente para outro nível.
- Relação apontando para objeto fora do catálogo → ERRO de lint.
- Evolução do esquema → novo arquivo `.v2`; o `.v1` vai a `old/` com selo (invariante 1).
- Dois cenários usando o mesmo objeto → a identidade (camada 1) é compartilhada; o que muda é a camada 2 (relações daquele cenário).

## Critérios de aceitação / verificação
- [ ] Schema exemplificado por um objeto real completo (vagalume) na camada 1 e presente nos shapes das camadas 2 e 3.
- [ ] Todos os campos com tipo e obrigatoriedade declarados (tabelas/shapes acima).
- [ ] Os 7 invariantes de "Regras de negócio" registrados; os mecanizáveis mapeados para regras de lint em [[fase10-10-05]].
- [ ] Decisões fixadas em 2026-07-09 registradas no corpo: caminhos/esquema confirmados; cenário×personagem na ficha de cenário; `descricao` do cenário string única.

## Relações com outros docs
- Depende de: —
- É consumido por: `[[fase10-10-01]]`, `[[fase10-10-02]]`, `[[fase10-10-03]]`, `[[fase10-10-04]]`, `[[fase10-10-05]]`
- Reconcilia / conserta: — (evolui a geração 1: `docs/quintal.v3.json` e os planos de conteúdo de `docs/plans/fase08_conteudo/`, citados por caminho)
