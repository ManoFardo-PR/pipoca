# fase00 · 00-13 · Schema do grafo autoral (GRAPH)

## Identidade
- id: `fase00-00-13`
- nó(s) da arquitetura: GRAPH
- tela(s) do brief: —
- classe: mvp

## Objetivo
Congelar o schema `pipoca.grafo-autoral.v1` (estrutura `GrafoAutoral`/`Cenario`/`Objeto`/`Fragmento4`/`Regra`/`DesfechoAberto`, níveis `n1`–`n4`, `papel_no_fim`, gramática de `regras.se`) e adicionar o **único** campo novo planejado: `cenario.ordem_canonica?: string[]`, que alimenta o `ValidadorOrdem`.

## Pré-requisitos / Depende de
- `[[fase00-00-01]]`

## Arquivos afetados
- `src/core/grafo/tipos.ts` — tipos do grafo (espelham [[_contratos/tipos-core]]; já existem em `motor_a.ts`).
- `src/core/grafo/validarGrafo.ts` — validador de carga do envelope `pipoca.grafo-autoral.v1` (criar).
- `docs/quintal_grafo.json` — cenário de referência; **editar** apenas para adicionar `ordem_canonica` (campo opcional).
- `src/conteudo/quintal_grafo.json` — cópia importável do grafo no build (criar/sincronizar).

## Nomes & variáveis
Tipos canônicos (de [[_contratos/tipos-core]], congelados em `motor_a.ts` — **não renomear**):
- `Nivel = "n1" | "n2" | "n3" | "n4"`
- `ModoDesfecho = "convergente" | "aberto"`
- `PapelNoFim = "nucleo" | "chave" | "neutro"`
- `Fragmento4 { n1; n2; n3; n4 }`
- `Regra { se; entao }` — `se: "tem:<id>" | "nao_tem:<id>"`
- `Objeto { id; emoji; nome; papel_no_fim; gatilho; regras }`
- `DesfechoAberto { se_terminou_com; fragmento }`
- `Cenario { id; nome; personagem; paleta; abertura; objetos; desfechos }`
- `GrafoAutoral { esquema; niveis; regra_de_ouro; cenario }`
- **NOVO (opcional)**: `Cenario.ordem_canonica?: string[]` — ids dos objetos na ordem autoral pretendida.
- `validarGrafo(json): GrafoAutoral` — função de carga (criar).
- `ESQUEMA_GRAFO = "pipoca.grafo-autoral.v1"` — string de versão.

## Interfaces / contratos
Schema canônico: `pipoca.grafo-autoral.v1` ([[_contratos/schemas-json]]). Forma congelada, com a mudança marcada:

```ts
export interface Cenario {
  id: string;
  nome: string;
  personagem: string;
  paleta: string;
  abertura: Fragmento4;
  ordem_canonica?: string[];   // ← NOVO, OPCIONAL — ids na ordem autoral (p/ ValidadorOrdem)
  objetos: Objeto[];
  desfechos: { convergente: Fragmento4; aberto: DesfechoAberto[] };
}
```

Trecho do JSON (baseado em `docs/quintal_grafo.json`):

```jsonc
{
  "esquema": "pipoca.grafo-autoral.v1",
  "niveis": {
    "n1": "Primeiras palavras — sílabas e palavras soltas",
    "n2": "Frases curtas — uma linha",
    "n3": "Pequenos textos — frases ligadas",
    "n4": "Parágrafos — histórias mais longas"
  },
  "regra_de_ouro": "Todo fragmento novo precisa ser lido no portão antes de soltar o próximo objeto.",
  "cenario": {
    "id": "quintal_anoitecer",
    "nome": "O Quintal ao Anoitecer", "personagem": "a Joana", "paleta": "entardecer quente virando azul-noite",
    "abertura": { "n1": "É noite. A Joana vai ao quintal.", "n2": "…", "n3": "…", "n4": "…" },
    "ordem_canonica": ["vagalume", "frasco", "vento"],     // ← NOVO, opcional
    "objetos": [
      { "id": "vagalume", "emoji": "🪲", "nome": "vaga-lume", "papel_no_fim": "nucleo",
        "gatilho": { "n1": "Uma luz. No mato. Pisca, pisca.", "n2": "…", "n3": "…", "n4": "…" },
        "regras": [] },
      { "id": "frasco", "emoji": "🫙", "nome": "frasco", "papel_no_fim": "chave",
        "gatilho": { "n1": "…", "n2": "…", "n3": "…", "n4": "…" },
        "regras": [ { "se": "tem:vagalume", "entao": { "n1": "…", "n2": "…", "n3": "…", "n4": "…" } } ] }
    ],
    "desfechos": {
      "convergente": { "n1": "…", "n2": "…", "n3": "…", "n4": "…" },
      "aberto": [ { "se_terminou_com": "frasco", "fragmento": { "n1": "…", "n2": "…", "n3": "…", "n4": "…" } } ]
    }
  }
}
```

## Regras de negócio
1. **Schema congelado**: a forma de `pipoca.grafo-autoral.v1` é a de `motor_a.ts`. Mudança de forma exige novo `.vN` (nunca mutar `.v1`).
2. **`niveis` é `Record<Nivel, string>`**: exatamente as 4 chaves `n1..n4`, com os 4 rótulos do grafo (Primeiras palavras / Frases curtas / Pequenos textos / Parágrafos) — os rótulos são propriedade de [[fase00-00-15]].
3. **`papel_no_fim` ∈ {`nucleo`, `chave`, `neutro`}**; cada cenário tem exatamente um objeto `nucleo` (o vaga-lume no Quintal).
4. **Gramática de `regras[].se`**: somente `"tem:<objetoId>"` ou `"nao_tem:<objetoId>"`. Avaliada por `MotorGrafoAutoral` ([[fase00-00-17]]) — o schema só restringe o formato textual.
5. **Cada `Fragmento4` tem as 4 chaves `n1..n4` não vazias** (a degradação por nível nunca produz texto vazio).
6. **`desfechos.convergente` é obrigatório**; `desfechos.aberto` é uma lista (pode ser vazia) de `DesfechoAberto`. Quando um objeto final não tem ramo aberto, o motor cai no convergente (degradação segura, regra do [[fase00-00-17]]).
7. **`ordem_canonica` é OPCIONAL**: se presente, contém ids existentes em `cenario.objetos` (sem repetição); se ausente, a ordem certa é derivada por ordenação topológica das `regras` — regra detalhada em [[fase00-00-18]] e [[fase00-00-20]].
8. **Ids estáveis**: o `id` de cada `Objeto` é a chave usada em `HiStoriaState.objetos`, em `regras.se`, em `desfechos.aberto.se_terminou_com` e em `ordem_canonica`. Renomear um id é uma mudança de schema.

## Passos de implementação
1. Em `tipos.ts`, declarar/re-exportar os tipos congelados e adicionar `ordem_canonica?: string[]` a `Cenario` (alinhado a [[_contratos/tipos-core]]).
2. Adicionar `ordem_canonica` ao `docs/quintal_grafo.json` (ex.: `["vagalume","frasco","vento"]` para a trajetória convergente de referência) sem tocar no resto.
3. Em `validarGrafo.ts`, escrever a validação de carga (pseudocódigo):
   - `esquema === ESQUEMA_GRAFO`;
   - `niveis` tem exatamente `n1..n4` (strings não vazias);
   - cada `objeto`: `id` único, `emoji`/`nome` presentes, `papel_no_fim` válido, `gatilho` é `Fragmento4` completo, cada `regra.se` casa `/^(tem|nao_tem):\w+$/`;
   - exatamente um objeto `papel_no_fim === "nucleo"`;
   - `desfechos.convergente` é `Fragmento4` completo; cada `aberto[].se_terminou_com` referencia um id existente;
   - se `ordem_canonica` presente: itens existem em `objetos`, sem duplicatas.
4. Sincronizar a cópia importável em `src/conteudo/quintal_grafo.json` (build com `resolveJsonModule`).
5. Documentar que SA_CONTENT ([[fase04-04-04]]) é quem edita/publica grafos em produção; aqui o grafo é fixo (Quintal).

## Estados / edge-cases
- **Grafo sem `ordem_canonica`**: válido; a ordem sai da topológica das regras (ver [[fase00-00-18]]).
- **`ordem_canonica` com id inexistente ou duplicado**: `validarGrafo` rejeita.
- **Regra com operador desconhecido** (ex.: `"foi:vagalume"`): rejeitada na validação; em runtime o motor a trata como condição falsa (defensivo).
- **`Fragmento4` faltando um nível**: rejeitado (evita texto vazio no portão).
- **Mais de um objeto `nucleo` / nenhum**: rejeitado.
- **Versão de schema diferente**: tratado como grafo inválido no MVP (sem migração silenciosa).

## Critérios de aceitação / verificação
- [ ] `docs/quintal_grafo.json` carrega como `GrafoAutoral` válido com `ordem_canonica` presente.
- [ ] `validarGrafo` aceita o Quintal e rejeita: id duplicado, `papel_no_fim` inválido, `regra.se` malformada, `Fragmento4` incompleto, `ordem_canonica` com id inexistente.
- [ ] `MotorGrafoAutoral` ([[fase00-00-17]]) consome o grafo validado sem alteração de forma.
- [ ] As fixtures de [[fase00-00-21]] (`["vagalume","frasco","vento"]` e `["vagalume","gato","coruja"]`) referenciam ids existentes no grafo.
- [ ] Adição de `ordem_canonica` não quebra `motor_a.ts` (campo opcional, ignorado pelo motor; lido só pelo `ValidadorOrdem`).

## Relações com outros docs
- Depende de: `[[fase00-00-01]]`
- É consumido por: `[[fase00-00-15]]` (níveis), `[[fase00-00-16]]` (CN), `[[fase00-00-17]]` (Motor A), `[[fase00-00-18]]` (ValidadorOrdem), `[[fase00-00-14]]` (schemas perfil/save referenciam `cenarioId`), `[[fase04-04-04]]` (SA_CONTENT edita grafos)
- Reconcilia / conserta: `[[fase00-00-20]]` (o conteúdo dos cards e a ordem certa passam a sair deste grafo)
- Contratos: `[[_contratos/schemas-json]]`, `[[_contratos/tipos-core]]`
