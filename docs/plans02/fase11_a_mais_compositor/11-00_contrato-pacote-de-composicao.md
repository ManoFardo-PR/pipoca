# fase11 · 11-00 · Contrato do Pacote de Composição

## Identidade
- id: `fase11-11-00`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: pivot

## Objetivo
Definir o contrato `pipoca.pacote-composicao.v1` — a moeda de saída do compositor e a única entrada do realizador: estrutura, nunca prosa.

## Pré-requisitos / Depende de
- `[[fase10-10-00]]` — o contrato `pipoca.fichas.v1` de onde vêm todos os textos do Pacote.
- `[[fase10-10-01]]` — a ficha de identidade (origem de `descricao`).
- `[[fase10-10-02]]` — a ficha de relação (origem de `interacao`; decisões D4/`alvo` e D5/teto 2).
- `[[fase10-10-03]]` — a ficha de sensação (origem de `corpo`).

## Arquivos afetados
Nenhum arquivo de dados novo: o Pacote é estrutura trafegada entre compositor e realizador. PLANEJADOS (criar só na implementação):
- `src/core/compositor/pacote.ts` — tipos TS do contrato (proposta de caminho; o módulo `src/core/compositor/` ainda não existe — verificado).
- `src/core/fixtures/pacote_golden_v1.json` — o exemplo deste doc congelado como golden (ver [[fase11-11-03]]).

## Nomes & variáveis
- `pipoca.pacote-composicao.v1` — id do esquema do Pacote, no padrão dos esquemas da casa.
- `PacoteComposicao` — o tipo raiz do contrato.
- `beats` — a lista ordenada de unidades de composição (ordem = ordem da linha da criança).
- `papel` — posição narrativa do beat: abertura, miolo ou fecho.
- `eco` — instrução de eco do desfecho aberto (ou `null`).
- `restricoes` — limites de forma para o realizador (parágrafos e palavras).
- Reaproveitados com grafia idêntica: `alvo`, `interacao` ([[fase10-10-02]]); `voz_do_contador`, `sensacao_no_personagem` ([[fase10-10-00]]); `descricao` ([[fase10-10-01]]); `corpo` ([[fase10-10-03]]); `NivelKey` (`src/core/composicao.ts:38`).

## Interfaces / contratos

### O contrato

```jsonc
{
  "esquema": "pipoca.pacote-composicao.v1",
  "cenario":    { "id": "quintal_anoitecer", "descricao": "…", "voz_do_contador": "…" },
  "personagem": { "nome": "…", "genero": "m|f" },          // vem do perfil (cadastro), nunca de ficha
  "nivel": "n1|n2|n3|n4",
  "beats": [                                                // ordem = ordem da linha da criança
    {
      "objeto": "vagalume",
      "papel": "abertura|miolo|fecho",
      "descricao": "<descricao[nivel] da ficha de identidade>",
      "corpo": "<sensacao.corpo[nivel] da ficha de identidade>",
      "relacoes": [                                         // já RESOLVIDAS pelo compositor; teto 2 por Pacote (D5)
        { "alvo": "frasco", "interacao": "<interacao[nivel] da ficha de relação>" }
      ]
    }
  ],
  "eco": { "abre_com": "vagalume", "fecha_com": "vento" },  // ou null (desfecho convergente)
  "restricoes": { "paragrafos": 2, "palavras_max_por_paragrafo": 40 }
}
```

Campos:

| campo | tipo | obrigatório | nota |
|---|---|---|---|
| `esquema` | string fixa | sim | `pipoca.pacote-composicao.v1` |
| `cenario.id` / `cenario.descricao` / `cenario.voz_do_contador` | string | sim | da ficha de cenário; `descricao` é string única (D3) |
| `personagem.nome` / `personagem.genero` | string / `"m"`\|`"f"` | sim | do perfil — invariante de [[fase10-10-00]] |
| `nivel` | `NivelKey` | sim | nível de leitura do perfil |
| `beats[]` | lista, mínimo 1 | sim | ordem ≡ ordem da linha; nunca reordenar |
| `beats[].objeto` | string (id do catálogo) | sim | |
| `beats[].papel` | `"abertura"`\|`"miolo"`\|`"fecho"` | sim | derivação em [[fase11-11-01]] |
| `beats[].descricao` / `beats[].corpo` | string | sim | JÁ resolvidos no nível — o realizador não vê fichas |
| `beats[].relacoes[]` | lista (pode ser vazia) | sim | sem condição `se`: a relação chega RESOLVIDA (D4) |
| `beats[].relacoes[].alvo` / `.interacao` | string | sim | `alvo` explícito (D4) |
| `eco` | objeto `{abre_com, fecha_com}` ou `null` | sim | decisão de arranjo do compositor ([[fase11-11-02]]) |
| `restricoes.paragrafos` / `.palavras_max_por_paragrafo` | inteiros > 0 | sim | tabela abaixo |

### Restrições por nível (semente calibrável)
Valores da prova de conceito; calibráveis pela validação em escala (portão de [[fase10-10-04]]):

| nível | parágrafos | palavras máx. por parágrafo |
|---|---|---|
| n1 | 2 | 25 |
| n2 | 2 | 40 |
| n3 | 2 | 55 |
| n4 | 2 | 70 |

### Exemplo REAL completo — linha vagalume→frasco→vento, n2
Tradução do exemplo validado na prova de conceito. Células do **vagalume** = ficha canônica de [[fase10-10-00]]; células de frasco/vento e do cenário = ILUSTRATIVAS (a autoria real vem na migração, [[fase10-10-04]]). A relação usada é a candidata `tem:frasco` (linhagem: tempera do vagalume no `docs/quintal.v3.json`) — nesta linha `depois_de:frasco` NÃO casa, pois o vagalume vem ANTES do frasco (semântica verificada em `src/core/composicao.ts:217-220`); `tem:frasco` casa em qualquer ordem.

```jsonc
{
  "esquema": "pipoca.pacote-composicao.v1",
  "cenario": {
    "id": "quintal_anoitecer",
    "descricao": "um quintal de casa ao cair da noite: muro baixo, grama, uma árvore e a primeira estrela",
    "voz_do_contador": "o quintal fala baixinho, como quem sussurra segredos só pra ela"
  },
  "personagem": { "nome": "Joana", "genero": "f" },
  "nivel": "n2",
  "beats": [
    {
      "objeto": "vagalume",
      "papel": "abertura",
      "descricao": "um vaga-lume que acende e apaga",
      "corpo": "os olhos seguem a pisca; chegar perto na ponta dos pés",
      "relacoes": [
        { "alvo": "frasco", "interacao": "a faísca entra no pote e vira uma lanterninha só dela" }
      ]
    },
    {
      "objeto": "frasco",
      "papel": "miolo",
      "descricao": "um pote de vidro limpinho, que deixa ver o que mora dentro",
      "corpo": "segurar o pote com as duas mãos; espiar através do vidro",
      "relacoes": []
    },
    {
      "objeto": "vento",
      "papel": "fecho",
      "descricao": "um vento fresco que passa e mexe em tudo de leve",
      "corpo": "a pele dos braços arrepia; o cabelo mexe",
      "relacoes": []
    }
  ],
  "eco": { "abre_com": "vagalume", "fecha_com": "vento" },
  "restricoes": { "paragrafos": 2, "palavras_max_por_paragrafo": 40 }
}
```

**DECISÃO ABERTA:** as 3 leis editoriais (corpo como centro; cenário como contador; desejo plantado/colhido) entram no Pacote como instrução textual fixa, ou vivem no prompt-template do realizador (fase 12, esqueleto)? O shape acima NÃO as carrega.

**DECISÃO ABERTA:** o bloco `cenario` do Pacote inclui a `sensacao_no_personagem` da ficha de cenário? O shape-base não a traz — sem ela o realizador não recebe a sensação que o lugar provoca (Lei 2 sensorial), só a voz do contador.

## Regras de negócio
1. **Autossuficiência:** o Pacote basta ao realizador — quem o recebe não precisa de acesso a fichas, grafo ou gramática (fronteira entre módulos).
2. **Estrutura, nunca prosa:** o compositor não escreve frases de história; todo texto do Pacote é célula de ficha resolvida no nível.
3. **Relações resolvidas (D4):** o Pacote NÃO carrega condição `se`; parsing de condição é privilégio exclusivo do compositor. `alvo` sempre explícito.
4. **Teto 2 (D5):** no máximo 2 relações por Pacote; seleção por especificidade com desempate pela ordem (regra em [[fase11-11-02]]).
5. **Ordem sagrada:** `beats` na ordem da linha da criança; o contrato proíbe reordenação em qualquer ponto a jusante.
6. **Versionamento `.vN`:** esquema publicado nunca é mutado; evolução = `pipoca.pacote-composicao.v2` (invariante da casa, como em [[fase10-10-00]]).
7. **Personagem do perfil:** `personagem` vem do cadastro; nenhum campo de personagem em ficha.

## Passos de implementação
Ordem para quando a implementação começar (este doc só planeja):
1. Declarar os tipos do contrato em `src/core/compositor/pacote.ts`.
2. Materializar o exemplo deste doc como fixture golden (`src/core/fixtures/pacote_golden_v1.json`).
3. Validar o contrato contra o consumo real: compositor ([[fase11-11-01]]) produz; testes ([[fase11-11-03]]) congelam.

## Estados / edge-cases
- Desfecho convergente → `eco: null` (o campo existe sempre; nulo é valor legal).
- Linha sem relação casando → todos os `relacoes: []` (relação é tempero, não obrigação — regra de [[fase10-10-02]]).
- Linha mínima (1 objeto) → beat único com `papel: "abertura"`; a derivação de papel em linha curta é detalhada em [[fase11-11-01]].
- Evolução de esquema → `.v2` novo; consumidores rejeitam esquema desconhecido com erro explícito.

## Critérios de aceitação / verificação
- [ ] Contrato completo com todos os campos tipados e obrigatoriedade declarada (tabela acima).
- [ ] Tabela de `restricoes` por nível registrada como semente calibrável (portão do 10-04).
- [ ] Exemplo REAL completo embutido (linha vagalume→frasco→vento, n2), com células canônicas e ilustrativas marcadas.
- [ ] Regras D4/D5 da fase 10 aplicadas e visíveis no shape.
- [ ] DECISÕES ABERTAS registradas (2 neste doc).

## Relações com outros docs
- Depende de: `[[fase10-10-00]]`, `[[fase10-10-01]]`, `[[fase10-10-02]]`, `[[fase10-10-03]]`
- É consumido por: `[[fase11-11-01]]`, `[[fase11-11-02]]`, `[[fase11-11-03]]` (e pela fase 12 — o realizador — quando for detalhada)
- Reconcilia / conserta: —
