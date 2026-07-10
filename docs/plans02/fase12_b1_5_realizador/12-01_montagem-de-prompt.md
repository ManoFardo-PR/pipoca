# fase12 · 12-01 · Montagem de prompt a partir do Pacote

## Identidade
- id: `fase12-12-01`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Especificar o prompt-template do realizador — onde as 3 leis editoriais vivem (decisão D-11.1) — e como cada campo do Pacote vira instrução para o LLM.

## Pré-requisitos / Depende de
- `[[fase12-12-00]]` — o contrato do realizador que este template serve.
- `[[fase11-11-00]]` — o Pacote, fonte de TODO o conteúdo do prompt (matéria); o template só acrescenta método.

## Arquivos afetados
PLANEJADO: `src/core/realizador/prompt_template.ts` (proposta; implementação posterior). Linhagem verificada: o prompt-semente do experimento vive em `experimentos/beats-para-paragrafos/gemini-cliente.ts:41-52` (`montarSystemInstruction`) — precedente de formato, não de runtime.

## Nomes & variáveis
- `montarSystemInstruction` — a função do experimento (linhagem, `gemini-cliente.ts:41`); o template de runtime a evolui.
- `DESCRICAO_NIVEL` — a régua de nível do experimento (`gemini-cliente.ts:34-39`): n1 "Primeiras palavras — sílabas e palavras soltas" · n2 "Frases curtas — uma linha" · n3 "Pequenos textos — frases ligadas" · n4 "Parágrafos — histórias mais longas".
- Reaproveitados com grafia idêntica: `realizar`, `paragrafos` ([[fase12-12-00]]); `PacoteComposicao`, `beats`, `papel`, `eco`, `restricoes`, `sensacao_no_personagem`, `voz_do_contador` ([[fase11-11-00]]); `corpo` ([[fase10-10-03]]).

## Interfaces / contratos

### As 3 leis editoriais vivem AQUI (D-11.1)
O Pacote carrega matéria; este template carrega método. As leis entram como instruções fixas do system prompt:
1. **Lei 1 — o corpo da criança é o centro:** "o que a personagem FAZ e SENTE no corpo guia cada cena; use os gestos dados, não invente emoções abstratas".
2. **Lei 2 — o cenário é o contador:** "a voz do lugar abre e costura a história" (alimentada por `voz_do_contador` + `sensacao_no_personagem` do Pacote — D-11.2).
3. **Lei 3 — desejo plantado, corpo colhido:** "plante a vontade na abertura; feche colhendo-a no corpo".

### O prompt-semente VALIDADO (linhagem verbatim)
O system instruction que gerou os textos aprovados do experimento (94/97 na Camada 1, crescimento médio 2.8%) — `experimentos/beats-para-paragrafos/gemini-cliente.ts:41-52`:

```
Reescreva os trechos abaixo como um texto infantil fluido e contínuo.
NÃO invente acontecimentos, objetos, personagens ou falas.
NÃO remova nenhum acontecimento. NÃO mude a ordem.
NÃO troque o nome (Joana), o gênero ou a idade da protagonista.
Mantenha o vocabulário do nível ${nivel} (${DESCRICAO_NIVEL[nivel]}) — nem mais simples, nem mais difícil.
Uma frase pode unir-se à outra com "e", "mas", "então", "depois".
Menos pontos finais, sem frases picadas — mas sem floreio que não existia.
Máx. ${teto} palavras. Devolva só o texto final.
```

No experimento, a parte "user" é só o texto-base cru (`gemini-cliente.ts:105`), o teto = `ceil(palavras × 1.25)` (`gemini-cliente.ts:98-100`) e a saída é JSON com `texto_limpo` (`gemini-cliente.ts:28-32`).

### O template de runtime (evolução do semente — a materializar)
O runtime troca "reescreva os trechos" por "realize o Pacote". Mapa campo→instrução:

| campo do Pacote | vira no prompt |
|---|---|
| `cenario.descricao` + `voz_do_contador` + `sensacao_no_personagem` | bloco de abertura: o lugar, sua voz (Lei 2) e o que ele faz sentir |
| `personagem.nome` + `personagem.genero` | "a protagonista é <nome> (<gênero>)" → concordância; a regra NÃO-troque parametrizada (o semente tinha "Joana" fixo — generalizar) |
| `nivel` | a régua `DESCRICAO_NIVEL` + as instruções específicas do nível ([[fase12-12-05]] para o n1) |
| `beats[]` na ordem | um bloco por beat: `descricao` (o que é) + `corpo` (o gesto — injeção por beat, extensão da PoC de fichas) + `relacoes` (interações a realizar) |
| `beats[].papel` | abertura planta o desejo (Lei 3); fecho colhe no corpo |
| `restricoes` | "N parágrafos; máx. M palavras por parágrafo" (substitui o teto único do semente) |
| `eco` | "termine ecoando <abre_com> com as próprias palavras" (quando não-nulo) |

As linhas do semente marcadas como EXTENSÃO (não estavam no prompt verificado; vêm da PoC de fichas narrada na fase 10, a materializar na validação em escala): a injeção de `corpo` por beat e a regra do n1 (UMA sensação por beat — [[fase10-10-03]]).

**DECISÃO ABERTA:** few-shot (exemplo de entrada→saída dentro do prompt) fixo no template ou por nível? Fixo é mais simples; por nível permite calibrar o n1 sem contaminar o n4. A validação em escala ([[fase10-10-04]]) mede as duas variantes.

## Regras de negócio
1. **Método aqui, matéria no Pacote** (princípio de [[fase11-11-00]]): o template nunca acrescenta fatos — só regras de redação.
2. **As quatro proibições** (linhagem verificada no semente): não invente / não remova nem mude a ordem / não troque nome-gênero-idade / não mude o nível — parametrizadas pelo Pacote (nome do perfil, não "Joana" fixo).
3. **Fusão permitida, floreio não:** frases podem unir-se com "e/mas/então/depois"; nada de conteúdo que não existia (linhagem do semente).
4. **Restrições explícitas no prompt** E verificadas fora dele ([[fase12-12-03]]): instruir não substitui validar.
5. **Template versionado:** mudanças de template são registradas (a calibração do 12-05 itera SOBRE este template; sem versão, sem comparação).

## Passos de implementação
1. Materializar o template de runtime (semente + mapa campo→instrução + leis) em `src/core/realizador/prompt_template.ts`.
2. Parametrizar nome/gênero (remover o "Joana" fixo do semente).
3. Adicionar a injeção de `corpo` por beat e a regra do n1.
4. Rodar a validação em escala com as duas variantes de few-shot (DECISÃO ABERTA) e fixar a vencedora.

## Estados / edge-cases
- `eco` nulo → a instrução de eco é omitida (não "eco opcional" no texto do prompt — instrução ausente é mais segura que instrução condicional).
- Beat sem relações → bloco do beat só com descricao+corpo.
- Nome do perfil com caixa/acentos incomuns → o template escreve o nome exatamente como veio; a validação de gênero ([[fase12-12-03]]) usa o mesmo nome.
- Nível n1 → as instruções específicas do n1 ([[fase12-12-05]]) SUBSTITUEM a linha genérica de fusão (no n1, fusão é limitada, não incentivada).

## Critérios de aceitação / verificação
- [ ] As 3 leis materializadas como instruções do template (D-11.1 cumprida).
- [ ] Prompt-semente embutido verbatim com caminho:linha; extensões da PoC marcadas como a materializar.
- [ ] Mapa campo-do-Pacote→instrução completo (incluindo `sensacao_no_personagem` — D-11.2).
- [ ] As quatro proibições parametrizadas (nome do perfil, não hardcoded).
- [ ] DECISÃO ABERTA do few-shot registrada com as duas opções.

## Relações com outros docs
- Depende de: `[[fase12-12-00]]`, `[[fase11-11-00]]`
- É consumido por: `[[fase12-12-05]]` (a calibração itera sobre este template), `[[fase12-12-02]]` (o prompt montado é a entrada do provedor)
- Reconcilia / conserta: —
