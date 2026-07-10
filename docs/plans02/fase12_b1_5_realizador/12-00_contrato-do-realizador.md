# fase12 · 12-00 · Contrato do realizador

## Identidade
- id: `fase12-12-00`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: pivot

## Objetivo
Definir o contrato do realizador — `realizar(pacote, opcoes) → { texto, paragrafos, veredito }` — o módulo que transforma o Pacote de Composição em prosa infantil via LLM, com validação determinística embutida.

## Pré-requisitos / Depende de
- `[[fase11-11-00]]` — o Pacote de Composição, única entrada de conteúdo do realizador.
- `[[fase10-10-00]]` — o contrato de fichas (linhagem dos textos que chegam resolvidos no Pacote).

O realizador é o "B1.5": o LLM como REALIZADOR (decide COMO contar), nunca como autor (o compositor já decidiu O QUE acontece). Princípio matéria/método da fase 11: o Pacote traz a matéria; o método (as 3 leis, as regras de redação) vive no prompt-template (doc 12-01 desta fase, citado sem link aqui para não virar dependência).

## Arquivos afetados
PLANEJADOS (criar só na implementação):
- `src/core/realizador/realizar.ts` — a função central (proposta; `src/core/realizador/` não existe — verificado).
- `src/core/realizador/` roda em contexto EDGE quando envolve chamada real de LLM — a chave de API nunca chega ao cliente (padrão verificado no repo: chaves só como secrets da Edge Function `functions/proxy-ia/index.ts:121-126`; grep de chaves em `src/` = zero; detalhe em [[fase12-12-02]]).

## Nomes & variáveis
- `realizar` — a função central planejada: `realizar(pacote, opcoes)` → resultado abaixo.
- `veredito` — o resultado da validação de fidelidade (PASS/FAIL + motivos + avisos; shape detalhado em [[fase12-12-03]]).
- `opcoes` — configuração da chamada: provedor, modelo, temperatura, teto de tentativas — em produção, provedor/modelo são decididos no SERVIDOR (precedente verificado: o proxy lê `config_ia` e o cliente não escolhe, `functions/proxy-ia/index.ts:266-270`); `opcoes` plena é para testes/calibração.
- `paragrafos` — a saída segmentada em parágrafos (lista de strings).
- Reaproveitados com grafia idêntica: `PacoteComposicao`, `restricoes`, `eco` ([[fase11-11-00]]); `NivelKey` (`src/core/composicao.ts:38`).

## Interfaces / contratos

### Assinatura e saída

```jsonc
// realizar(pacote: PacoteComposicao, opcoes) →
{
  "texto": "…",            // a prosa inteira, contínua
  "paragrafos": ["…", "…"], // o mesmo texto segmentado (|paragrafos| = restricoes.paragrafos)
  "veredito": {             // shape completo em fase12-12-03
    "pass": true,
    "motivos": [],          // vazio quando pass
    "avisos": []
  }
}
```

- **Entrada:** o Pacote é autossuficiente — o realizador NÃO acessa fichas, grafo, gramática nem banco de dados (fronteira de [[fase11-11-00]]). Também não conhece a gramática do compositor: nenhuma condição `se` chega até aqui (D4).
- **`opcoes`:** `{ provedor?, modelo?, temperatura?, teto_tentativas? }` — todos opcionais; defaults e cascata em [[fase12-12-04]].
- **Contrato de honestidade:** o realizador NUNCA retorna texto com `veredito.pass === false` como se fosse sucesso; a política de falha ([[fase12-12-04]]) decide o que fazer com reprovações.

### Exemplo real — o Pacote-exemplo de [[fase11-11-00]] (linha vagalume→frasco→vento, n2) → saída
A prosa abaixo é ILUSTRATIVA (escrita à mão no formato que o LLM deve produzir; a PoC de fichas executada com LLM real ainda não existe como código no repo — a validação em escala do portão de [[fase10-10-04]] é quem a materializa):

```jsonc
{
  "texto": "O quintal fala baixinho, e a Joana escuta. Um vaga-lume acende e apaga, e os olhos dela seguem a pisca. Ela chega perto na ponta dos pés, e a faísca entra no pote: uma lanterninha só dela. A Joana segura o pote com as duas mãos e espia através do vidro. Então um vento fresco passa, mexe no cabelo e arrepia a pele dos braços — e a luzinha pisca, como quem diz até já.",
  "paragrafos": [
    "O quintal fala baixinho, e a Joana escuta. Um vaga-lume acende e apaga, e os olhos dela seguem a pisca. Ela chega perto na ponta dos pés, e a faísca entra no pote: uma lanterninha só dela.",
    "A Joana segura o pote com as duas mãos e espia através do vidro. Então um vento fresco passa, mexe no cabelo e arrepia a pele dos braços — e a luzinha pisca, como quem diz até já."
  ],
  "veredito": { "pass": true, "motivos": [], "avisos": [] }
}
```

Note o que o exemplo demonstra: os 3 beats na ordem; `corpo` de cada objeto virando gesto (olhos/ponta dos pés; duas mãos/espiar; pele/cabelo); a relação vagalume×frasco realizada; o `eco` honrado (fecha com a luzinha do objeto de abertura); 2 parágrafos ≤ 40 palavras (restrições do n2); gênero feminino correto.

**DECISÃO ABERTA:** `paragrafos` é segmentado pelo LLM (instrução no prompt: "devolva N parágrafos") ou por um segmentador determinístico pós-LLM (o LLM devolve texto contínuo; código divide por sentenças/balanço)? A favor do LLM: parágrafos com unidade narrativa. A favor do determinístico: garantia dura de `restricoes.paragrafos` sem depender de obediência. Registrar as duas opções; a validação em escala informa a escolha.

## Regras de negócio
1. **Realizador, nunca autor:** decide COMO contar; O QUE acontece já veio decidido no Pacote — não inventa, não remove, não reordena, não troca nome/gênero (regras operacionais no prompt, [[fase12-12-01]]).
2. **Pacote autossuficiente:** nenhum acesso a fichas/grafo/gramática/BD; nenhuma condição `se` (D4).
3. **Validação embutida:** toda saída passa pelo validador de fidelidade ([[fase12-12-03]]) antes de retornar; `veredito` sempre presente.
4. **Nunca entregar texto infiel:** reprovação → política de falha ([[fase12-12-04]]); jamais retorno silencioso de FAIL como sucesso.
5. **Chave de API nunca no cliente:** chamada real de LLM só em edge/proxy (padrão verificado; [[fase12-12-02]]).
6. **Base empírica citável:** o experimento in-repo (`experimentos/beats-para-paragrafos/`) validou o formato beats→prosa com 94/97 na Camada 1 e crescimento médio de 2.8% (`saida/avaliacao/relatorio-completo.md:9`); a PoC de fichas (10 gerações, 4 níveis, 2 gêneros, fidelidade total, registrada na fase 10) é a base narrada — os números de runtime virão da validação em escala.

## Passos de implementação
Ordem para quando a implementação começar (este doc só planeja):
1. Declarar os tipos do contrato (`realizar`, resultado, `opcoes`) em `src/core/realizador/`.
2. Implementar o pipeline: montar prompt ([[fase12-12-01]]) → chamar provedor ([[fase12-12-02]]) → validar ([[fase12-12-03]]) → política de falha ([[fase12-12-04]]).
3. Cobrir com o exemplo deste doc como caso de referência (entrada = golden do Pacote de [[fase11-11-00]]).

## Estados / edge-cases
- Pacote com esquema desconhecido → erro explícito antes de qualquer chamada de LLM.
- `veredito.pass === false` em todas as tentativas → o resultado da cascata é o fallback A+ v3 ([[fase12-12-04]]); `realizar` sinaliza a origem do texto.
- LLM devolve número errado de parágrafos → tratado conforme a DECISÃO ABERTA (instrução vs segmentador); em ambos os casos o veredito registra o desvio.
- Sem rede → sem geração (decisão de produto adiada, registrada em [[fase12-12-04]]); o realizador falha explícito, o app decide a experiência.

## Critérios de aceitação / verificação
- [ ] Assinatura e shape de saída completos, com tipo e obrigatoriedade.
- [ ] Fronteira declarada: Pacote autossuficiente; sem fichas/grafo/gramática/BD; sem condição `se`.
- [ ] Exemplo real embutido (Pacote do 11-00 → saída ilustrativa) com o que ele demonstra listado.
- [ ] Contrato de honestidade (nunca entregar FAIL como sucesso) registrado.
- [ ] DECISÃO ABERTA da segmentação registrada com as duas opções.

## Relações com outros docs
- Depende de: `[[fase11-11-00]]`, `[[fase10-10-00]]`
- É consumido por: `[[fase12-12-01]]`, `[[fase12-12-02]]`, `[[fase12-12-03]]`, `[[fase12-12-04]]`, `[[fase12-12-05]]`
- Reconcilia / conserta: —
