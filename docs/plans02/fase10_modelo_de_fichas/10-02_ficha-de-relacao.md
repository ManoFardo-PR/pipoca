# fase10 · 10-02 · Ficha de relação (objeto × objeto / objeto × cenário)

## Identidade
- id: `fase10-10-02`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Especificar a camada 2 do modelo de fichas: as relações — objeto×objeto, objeto×cenário e cenário×personagem — chaveadas pelas condições da gramática v3, descrevendo INTERAÇÃO para o realizador.

## Pré-requisitos / Depende de
- `[[fase10-10-00]]` — o contrato `pipoca.fichas.v1`.
- `[[fase10-10-01]]` — as fichas de identidade que as relações conectam.

## Arquivos afetados
- `docs/fichas/relacoes.quintal.v1.json` — PLANEJADO (proposta de [[fase10-10-00]]); criado só na implementação.
- `docs/fichas/cenarios.v1.json` — PLANEJADO; recebe a parte cenário quando a DECISÃO ABERTA de [[fase10-10-00]] fechar.

## Nomes & variáveis
- `FichaRelacao` — reaproveitado de [[fase10-10-00]].
- `se` — condição da gramática v3 que ativa a relação (reaproveitada da geração 1, `docs/quintal.v3.json`): `tem:`, `depois_de:`, `antes_de:`, `pos:`.
- `objeto` — id do objeto-alvo da relação.
- `interacao` — objeto com os 4 níveis descrevendo a interação (objeto×objeto).
- `manifestacao` — objeto com os 4 níveis (objeto×cenário): como o objeto se manifesta naquele mundo.
- `voz_do_contador` — reaproveitado de [[fase10-10-00]] (camada 3).

## Interfaces / contratos

### As três tabelas de relação

**1 · objeto × objeto** — chave = condição da gramática v3. A geração 1 já usa exatamente estas condições no campo `tempera` do `docs/quintal.v3.json`:

| condição | significado |
|---|---|
| `tem:X` | X está presente na linha (qualquer posição) |
| `depois_de:X` | este objeto vem depois de X na ordem da linha |
| `antes_de:X` | este objeto vem antes de X (antecipação) |
| `pos:inicio` / `pos:fim` | este objeto abre/fecha a linha |

**2 · objeto × cenário** — como o objeto se manifesta naquele mundo (o vagalume DO quintal ao anoitecer; sem condição, vale sempre que o objeto aparece no cenário).

**3 · cenário × personagem** — a sensação que o lugar provoca na criança (Lei 2: o cenário como contador; o quintal = a voz que sussurra segredos). Onde este bloco vive (arquivo de relações ou ficha de cenário) é DECISÃO ABERTA registrada em [[fase10-10-00]].

### Exemplo 1 — vento→folha (antecipação), traduzido da geração 1
Linhagem: no `docs/quintal.v3.json` o vento tem a tempera `"se": ["tem:folha", "antes_de:folha"]` com a frase pronta n2 "O vento sacode o galho lá em cima, e ela estica o pescoço: alguma coisa se soltou.". Na ficha, a frase vira **interação** (dado, não texto final):

```jsonc
{
  "se": "antes_de:folha",
  "objeto": "vento",
  "alvo": "folha",
  "interacao": {
    "n1": "o vento sacode o galho; algo se solta",
    "n2": "o vento sacode o galho lá em cima; alguma coisa se solta",
    "n3": "o vento sobe e sacode os galhos; uma coisinha se solta e começa a descer rodando",
    "n4": "o vento sobe pelos galhos como quem acorda alguém; lá no alto algo se solta e desce rodando, sem pressa — um presente anunciado"
  }
}
```

### Exemplo 2 — vagalume×frasco (a faísca que entra no pote), traduzido da geração 1
Linhagem: tempera do vagalume `"se": ["tem:frasco", "depois_de:frasco"]` — a lição da ordem do pote: a faísca só entra no pote se o pote já apareceu (n3 da geração 1: "A faísca roda no ar, acha o pote que a Joana já carregava e entra devagarinho, como quem chega em casa.").

```jsonc
{
  "se": "depois_de:frasco",
  "objeto": "vagalume",
  "alvo": "frasco",
  "interacao": {
    "n1": "a faísca acha o pote; entra",
    "n2": "a faísca acha o pote que ela carregava e entra",
    "n3": "a faísca roda no ar, acha o pote que ela já carregava e entra devagarinho",
    "n4": "a faísca roda no ar, encontra o pote de vidro carregado desde cedo e entra devagarinho — fica lá dentro piscando, como quem chega em casa"
  }
}
```

**DECISÃO ABERTA:** o shape acima acrescenta o campo `alvo` ao shape mínimo de [[fase10-10-00]] (`se` + `objeto` + `interacao`) para nomear os dois lados da relação sem parsing da condição — confirmar se `alvo` entra no contrato ou se o alvo é sempre derivado da condição `se`.

## Regras de negócio
1. **Interação, nunca frase pronta:** a relação descreve o que acontece entre os dois lados (antecipação, resposta, eco) como matéria para o realizador — se o texto da ficha puder ir direto para a história, está errado.
2. **Chave = gramática v3:** as condições `tem:`/`depois_de:`/`antes_de:`/`pos:` são reaproveitadas com a MESMA semântica da geração 1 — o compositor (fase 11) avalia as condições; a ficha só declara.
3. **Os dois lados existem:** toda relação referencia ids presentes no catálogo de identidade ([[fase10-10-01]]) — regra de lint ([[fase10-10-05]]).
4. **Direção importa:** `depois_de:frasco` no vagalume ≠ `antes_de:folha` no vento; a relação pertence ao objeto que reage/anuncia.
5. **DECISÃO ABERTA:** teto de relações simultâneas por Pacote de Composição (quantas relações o compositor pode ativar numa mesma história sem sobrecarregar o realizador). A prova de conceito não estressou este limite.

## Passos de implementação
1. Fechar as DECISÕES ABERTAS (campo `alvo`; onde vive cenário×personagem; teto por Pacote).
2. Inventariar as temperas do `docs/quintal.v3.json` (todas as entradas `se`/`entao` dos 7 objetos) — cada tempera vira candidata a relação, conforme [[fase10-10-04]].
3. Traduzir tempera→relação: destilar a frase pronta em interação (como nos exemplos acima), preservando condição e significado da cena.
4. Autorar objeto×cenário e cenário×personagem para o quintal.
5. Validação humana célula a célula + lint por lote.

## Estados / edge-cases
- Condição satisfeita mas relação ausente → não é erro: o realizador compõe só com as identidades (relação é tempero, não obrigação).
- Duas relações ativas para o mesmo par na mesma linha → precedência a definir na fase 11 (compositor); a ficha não resolve empate.
- Relação com condição composta (a geração 1 tem `se` em array, ex.: `["tem:frasco", "depois_de:frasco"]`) → o shape aceita string ou array, semântica E (todas as condições valem).
- Eco no desfecho (a geração 1 tem ecos chaveados por `se_comecou_com`/`se_terminou_com`) → NÃO entra na camada 2; ecos são decisão de arranjo do compositor (fase 11).

## Critérios de aceitação / verificação
- [ ] As três tabelas de relação especificadas (objeto×objeto, objeto×cenário, cenário×personagem).
- [ ] Os 2 exemplos reais da geração 1 traduzidos e embutidos (vento→folha, vagalume×frasco), com a linhagem citada.
- [ ] Regra "interação, nunca frase pronta" enunciada e exemplificada.
- [ ] DECISÕES ABERTAS registradas (3 neste doc, incluindo o teto de relações por Pacote).

## Relações com outros docs
- Depende de: `[[fase10-10-00]]`, `[[fase10-10-01]]`
- É consumido por: `[[fase10-10-04]]`, `[[fase10-10-05]]`
- Reconcilia / conserta: —
