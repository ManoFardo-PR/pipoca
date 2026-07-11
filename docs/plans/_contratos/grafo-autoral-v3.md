# Contrato · Motor A+ · Grafo Autoral V3 — diversidade sem IA no runtime

> 🟡 **STATUS · 2026-07-06 · PROPOSTA** — evolução do `pipoca.grafo-autoral.v2`
> (`docs/quintal.v2.json` + `src/core/composicao.ts`). Nada aqui altera a mecânica
> de rodadas, âncoras ou portão. Ver [[_contratos/schemas-json]].
>
> 📝 **Changelog · 2026-07 · lapidação da costura** — §4.1 (novo): duas regras de
> runtime na costura conectivo+texto (rebaixamento da inicial + supressão do
> conectivo quando a variante já abre por marcador), rng preservado; campos
> aditivos `moldura.nomes_proprios?` e `moldura.marcadores_iniciais?`; §6.7 ganha
> aviso de "abre por marcador". Texto autoral e mecânica inalterados.
>
> 🧬 **Nota de linhagem · 2026-07-11 (geração 2 integrada)** — este contrato SEGUE
> VÁLIDO para o motor de reserva (o A+ v3 permanece em produção como prévia do
> portão e fallback de conteúdo). Os sucessores no posto de TITULAR do texto
> gerado são `pipoca.fichas.v1` (conteúdo — plans02 · fase10-10-00, dono em
> `docs/plans02/fase10_modelo_de_fichas/`) e `pipoca.pacote-composicao.v1`
> (estrutura — plans02 · fase11-11-00, dono em
> `docs/plans02/fase11_a_mais_compositor/`). Roteiro ativo:
> `docs/plans02/TRILHA-plans02.md`.

---

## 0. Problema e tese

**Problema:** os ~15.096 estados do v2 são combinatoriamente distintos mas
perceptualmente parecidos — um texto fixo por objeto, indiferente à posição,
com temperos que só reagem a coexistência (`tem:X`).

**Tese do v3:** diversidade percebida = `variantes × posição × ecos`, tudo
autorado e determinístico. Três mecanismos, um schema:

| Mecanismo | O que resolve | Origem na discussão |
|---|---|---|
| **Variantes por célula** | mesmice entre partidas | "18 formas por evento" / B1 |
| **Condições de posição** | texto cego ao arranjo | matriz imagem × posição |
| **Ecos (callbacks)** | sensação de desconexo | diretor narrativo mínimo |

**Invariantes preservados do v2:** moldura fixa; tempero é sabor, nunca portão;
banco = novas + sobras; funções puras; portão perdoador; leitura destrava rodada.

**Nomenclatura canônica:** este motor chama-se **Motor A+** — evolução direta do
Motor A. Ele melhora a costura, mas **não possui estado narrativo** (não sabe que
a história passou de medo para coragem). Isso é deliberado. O termo **Motor B**
fica reservado ao Diretor Narrativo (§2), que é quem terá esse estado.

**Propriedade nova (obrigatória):** *replay determinístico* — mesma linha +
mesmo nível ⇒ exatamente o mesmo texto, sempre. Nenhum `Math.random()`.

---

## 1. Mudanças de schema (v2 → v3)

`esquema: "pipoca.grafo-autoral.v3"`. Arquivo novo (`quintal.v3.json`); o v2
não é mutado (regra de versionamento de [[_contratos/schemas-json]]).

### 1.1 Variantes — `Texto` vira `TextoV3`

Cada nível aceita **string (compat v2) ou array de strings** (variantes):

```jsonc
"conta": {
  "n1": ["Um gato. Dois olhos.", "Dois olhos. Um gato!", "Um gato espia."],
  "n2": "Na cerca, dois olhos verdes acendem: um gato."   // string = 1 variante
}
```

- Alvo autoral: **3–5 variantes** por célula em n1/n2; 2–3 em n3/n4.
- Seleção por PRNG semeado (ver §3). Leitor v3 trata string como array de 1.

### 1.2 Gramática de condições — `se` ganha posição e conjunção

```
condição := "tem:<id>" | "nao_tem:<id>"          // v2, mantidas
          | "pos:inicio" | "pos:fim" | "pos:miolo" // posição do PRÓPRIO objeto
          | "antes_de:<id>" | "depois_de:<id>"     // ordem relativa na linha
          | "func:<funcao>"                        // RESERVADO no v3 (regra 5)
se       := condição | [condição, ...]             // array = AND
```

```jsonc
"tempera": [
  { "se": ["tem:folha", "depois_de:folha"], "entao": { /* gato brinca com a folha JÁ vista */ } },
  { "se": "pos:fim",                        "entao": { /* gato como último ato da noite */ } },
  { "se": "tem:folha",                      "entao": { /* v2, continua válido */ } }
]
```

Regras de avaliação (mantém espírito v2):
1. Temperos avaliados **na ordem do array**; o **primeiro que casa vence**.
2. Convenção autoral: ordenar do mais específico ao mais genérico.
3. `antes_de:X` / `depois_de:X` só casam se `X` está na linha.
4. Nenhuma condição jamais bloqueia escolha da criança (sabor, não portão).
5. `func:` é **namespace reservado** para funções dramáticas futuras
   (`chamada`, `descoberta`, `obstaculo`, `ajuda`, `fechamento`): o leitor v3
   aceita sem erro, a condição **nunca casa**, e o lint avisa. `pos:*` é
   estrutural hoje; `func:*` assume quando existir o mapa slot→função (jardim).

### 1.3 Ecos — desfecho que olha para trás

O v2 já tem `desfecho.aberto[].se_terminou_com` (callback da âncora final).
O v3 adiciona o simétrico e o composto:

```jsonc
"desfecho": {
  "convergente": { /* TextoV3, agora com variantes */ },
  "aberto": [
    { "se_terminou_com": "gato",     "fragmento": { /* v2 */ } },
    { "se_comecou_com":  "vagalume", "fragmento": {
        "n2": ["E tudo começou com uma faísca no escuro.",
               "A faísca do começo piscou uma última vez, como quem diz tchau."]
    } },
    { "se_comecou_com": "vagalume", "se_terminou_com": "frasco", "fragmento": {
        "n2": "A faísca do começo dorme agora dentro do pote. A noite fecha o círculo."
    } }
  ]
}
```

- Avaliação: primeiro fragmento cujas condições **todas** casam; os demais
  fragmentos compatíveis **podem** ser concatenados até um teto (`max_ecos: 2`,
  default 1) — decisão autoral por cenário.
- Efeito: o final referencia o começo ⇒ a história "fecha o círculo". É o
  mecanismo de maior impacto contra a sensação de desconexo.

### 1.4 Conectivos — tecido conjuntivo do miolo

```jsonc
"moldura": {
  "abertura": { /* ... */ },
  "conectivos": {
    "n1": ["Aí,", "Então,"],
    "n2": ["Então,", "De repente,", "Logo depois,", "Foi quando"],
    "n3": ["Foi então que", "De repente,", "Pouco depois,", "E, sem aviso,"],
    "n4": ["Foi então que", "Sem que ninguém esperasse,", "Pouco depois,"]
  },
  "desfecho": { /* ... */ }
}
```

- Aplicados **apenas aos slots do miolo** (âncoras abrem/fecham sem prótese).
- Sorteio semeado com restrição **sem repetição consecutiva**.
- Critério n1: **só conectivos de alta decodificabilidade** (1 palavra, padrão
  silábico simples). "De repente" estreia no n2 — oralmente é leve, mas na
  alfabetização inicial pesa. Grafia e vírgula fazem parte da string autorada
  (zero flexão em runtime ⇒ zero risco de concordância).
- Previsto (jardim): marcação de **dificuldade por conectivo** e eventual split
  **n1a/n1b**, se a sessão real mostrar atrito de decodificação dentro do n1.

### 1.5 Metadados de concordância (declaração OBRIGATÓRIA, consumo futuro)

`objetos.<id>.genero: "m"|"f"` e `numero: "sg"|"pl"` — o motor ainda não os
consome, mas a declaração é **obrigatória e fiscalizada pelo lint autoral
(§6.7)**: metadado sem fiscalização vira decoração esquecida. Existem para que
um realizador futuro com templates flexionáveis (ou o Diretor/Motor B) não
exija nova versão de schema nem re-auditoria dos 7+ objetos.

---

## 2. O que NÃO entra no v3 (jardim)

- **Diretor Narrativo completo** (planejador de eventos, arco emocional,
  antecipação): agora é a definição oficial do **Motor B**. Colheita: primeira
  sessão real indicando que variantes+posição+ecos saturaram.
- **LLM em runtime** (B2/B3): quando/se vier, entra como *realizador* atrás do
  mesmo contrato `montar()`, nunca como autor.
- **Templates com flexão em runtime**: adiado junto com o realizador futuro.
- **Funções dramáticas avaliadas** (`func:chamada`, `func:descoberta`,
  `func:obstaculo`, `func:ajuda`, `func:fechamento`): entram quando existir o
  mapa slot→função dramática. O namespace já está reservado (§1.2, regra 5).
- **Dificuldade por conectivo / split n1a-n1b**: colheita = atrito de
  decodificação observado no n1 em sessão real.
- **Matriz 20×8 / cenários novos**: expansão de conteúdo pós-validação do
  mecanismo com os 7 objetos atuais.

---

## 3. Determinismo — seleção semeada

```
seed = fnv1a( cenario.id + "|" + linha.join(",") + "|" + nivel )
rng  = mulberry32(seed)          // PRNG minúsculo, puro, sem dependências
```

- **Uma** sequência de rng por montagem, consumida em ordem fixa
  (slot 0 → N: variante; depois conectivo; por fim desfecho).
- Garantias: (a) replay perfeito — a criança pede "de novo" e recebe *a mesma*
  história; (b) arranjo diferente ⇒ variantes e conectivos diferentes, mesmo
  quando os objetos coincidem; (c) preview T4 ≡ commit T5 por construção.

---

## 4. Realizador — mudanças em `composicao.ts`

Contrato público **inalterado**: `montar(estado, nivel) → texto`. Internamente:

```
montar(estado, nivel):
  rng    = semear(cenario.id, linha, nivel)
  partes = [ variante(moldura.abertura[nivel], rng) ]
  para (i, objetoId) em linha:
    celula = resolverCelula(objeto, ctx(i, linha))   // §1.2: 1º tempero que casa, senão conta
    txt    = variante(celula[nivel], rng)
    se slotEhMiolo(i): txt = conectivo(nivel, rng, ultimoConectivo) + " " + txt
    partes.push(txt)
  partes.push( resolverDesfecho(modos, linha, nivel, rng) )  // §1.3
  retorna partes.join(separadorDoNivel(nivel))
```

Tipos novos: `TextoV3 = Record<NivelKey, string | string[]>`; `CondicaoV3`;
`se: string | string[]`. Leitor aceita v2 e v3 (normalização na carga).

### 4.1 Lapidação da costura conectivo + texto (2026-07)

Duas regras **puramente de runtime** no `montar`, aplicadas **só quando um conectivo
é de fato prefixado a um slot de miolo**. Não tocam abertura, âncoras nem desfecho, e
**não alteram nenhum texto autorado** (`quintal.v3.json` intacto):

1. **Rebaixamento da inicial.** Com o conectivo à frente ("Então, …"), a primeira
   letra da variante é rebaixada para minúscula ("Então, **u**m pote…"). **Exceção:**
   se a primeira palavra for um **nome próprio protegido**, o texto fica intacto
   ("Então, Joana corre."). A lista de protegidos = palavras capitalizadas derivadas de
   `cenario.personagem` (fallback `Joana`) ∪ o campo novo, opcional,
   `moldura.nomes_proprios?: string[]`.

2. **Supressão do conectivo.** Se a variante **já abre por um marcador** que faz o
   papel de conectivo (ex.: "Agora …", "De repente …"), o conectivo é **suprimido**
   nesse slot — evita "Logo depois, Agora …". O conjunto `marcadoresIniciais` é montado
   em runtime: união de **todos os pools** de `moldura.conectivos` (todos os níveis,
   normalizados: sem vírgula, casefold) ∪ lista base
   `[agora, então, aí, depois, logo, de repente, foi quando, logo depois, pouco depois,
   no fim, por fim]` ∪ o campo novo, opcional, `moldura.marcadores_iniciais?: string[]`.
   A comparação é por palavra(s), incluindo marcadores de 2 palavras ("de repente").

**Determinismo (invariante crítico):** o conectivo é **sempre sorteado** (consome o rng
na ordem fixa da §3) mesmo quando descartado — assim a supressão de um slot **não desloca
o rng dos demais**. O conectivo descartado **não conta** como "último conectivo" para a
regra de não-repetição consecutiva (§1.4).

Ambos os campos novos da `moldura` são **aditivos e opcionais** (compat total com grafos
já publicados). O lint (§6.7) emite **aviso** — nunca erro — para variantes de
`conta`/`tempera` que abrem por marcador (o conectivo será suprimido ali).

---

## 5. Carga autoral e oficina

| Bloco | Células novas (≈) | Observação |
|---|---|---|
| Variantes das 28 contas base | +60–80 textos | 2–4 extras por célula |
| Temperos posicionais | +10–15 blocos × 4 níveis | foco: gato, lua, vagalume, frasco |
| Ecos `se_comecou_com` | 7 × 4 níveis | + 2–3 compostos escolhidos a dedo |
| Conectivos | 4 pools pequenos | minutos, não horas |

**Total: ~150–220 textos curtos.** Oficina: IA local (Ollama) ou Claude API
gera candidatos com few-shot dos SEUS textos v2 como régua de registro;
validação humana célula a célula é inegociável (é ela que garante "sem erros").

---

## 6. Testes (quita o débito conhecido: `composicao.ts` sem testes unitários)

1. **Determinismo:** mesma linha+nível ⇒ texto idêntico em 100 execuções.
2. **Sensibilidade:** linhas com mesmos objetos em ordens distintas ⇒ textos distintos.
3. **Gramática:** cada condição de §1.2 com casos positivos/negativos; AND; precedência do primeiro tempero.
4. **Ecos:** `se_comecou_com`, composto, teto `max_ecos`.
5. **Compat (golden):** `quintal.v2.json` no leitor v3 produz **equivalência
   textual exata num conjunto canônico de linhas** fixado em fixture — não byte
   a byte universal, pois separadores e normalização interna podem mudar
   legitimamente. Byte a byte fica como ideal, não como critério de quebra.
6. **Conectivos:** nunca dois iguais consecutivos; ausentes nas âncoras.
7. **Lint autoral:** toda célula tem os 4 níveis; nenhum array vazio; todo
   objeto declara `genero` e `numero` (§1.5); condição `func:*` gera aviso de
   namespace reservado; pool de conectivos n1 só aceita entradas de 1 palavra;
   variante de `conta`/`tempera` que **abre por marcador** (§4.1) gera **aviso**
   (nunca erro) — sinaliza que o conectivo será suprimido naquele slot.

---

## 7. Sequência de implementação sugerida

1. Tipos + leitor v3 com normalização e compat v2 (testes 5 e 7).
2. PRNG semeado + variantes (testes 1 e 2).
3. Gramática de condições (teste 3).
4. Conectivos (teste 6).
5. Ecos no desfecho (teste 4).
6. Oficina de conteúdo → `quintal.v3.json` → validação humana.
7. Troca do grafo ativo; v2 permanece no repositório (não mutar `.vN` publicado).

*Fora de escopo desta sequência, mas antes da primeira sessão real (prioridade
já registrada): fiação da telemetria nos 5 pontos do fluxo.*
