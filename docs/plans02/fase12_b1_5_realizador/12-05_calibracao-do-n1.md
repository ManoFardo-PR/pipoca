# fase12 · 12-05 · Calibração do n1

## Identidade
- id: `fase12-12-05`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Planejar a calibração do nível mais sensível: os requisitos do n1 que a base empírica revelou, o método de calibração (Camada 1 + leitura em voz alta) e o critério de decisão realizador-vs-A+ cru.

## Pré-requisitos / Depende de
- `[[fase12-12-00]]` — o contrato calibrado.
- `[[fase12-12-01]]` — o prompt-template que a calibração itera.
- `[[fase12-12-03]]` — o validador contra o qual se otimiza.

## Arquivos afetados
Nenhum arquivo novo próprio — a calibração itera `src/core/realizador/prompt_template.ts` (de [[fase12-12-01]]) e consome a validação em escala (adaptação de `experimentos/beats-para-paragrafos/`, portão de [[fase10-10-04]]).

## Nomes & variáveis
- `LIMIAR_PONTOS_FINAIS_N1` — limiar verificado do experimento: **12** (`experimentos/beats-para-paragrafos/avaliar/camada1-fidelidade.ts:12`). Nota de correção: o valor às vezes citado de memória é "15"; o código diz 12 — os docs usam 12.
- `LIMIAR_MEDIA_FRASES_POR_BEAT_N1` — **2** frases por beat (`camada1-fidelidade.ts:13`).
- Reaproveitados com grafia idêntica: `realizar`, `veredito` ([[fase12-12-00]]); `corpo` ([[fase10-10-03]]); `restricoes`, `beats` ([[fase11-11-00]]); `DESCRICAO_NIVEL` ([[fase12-12-01]]).

## Interfaces / contratos

### Por que o n1 é o ponto sensível (base empírica)
- No experimento in-repo, o n1 é o nível com a menor naturalidade do juiz LLM (3.5–3.9 em `saida/avaliacao/grade.json`; comentários recorrentes de "ritmo mecânico" em `para-leitura.md`) e teve a única célula < 100% da rodada 1 (R1×n1 = 5/6, `relatorio-completo.md:11-18`).
- A lição do texto picado ([[fase10-10-03]]): três fragmentos de corpo num nível de sílabas reintroduzem o defeito que a geração 2 nasceu para eliminar.

### Requisitos do n1 (o que a calibração protege)
1. **UMA sensação de corpo por beat** — a regra do n1 fixada em [[fase10-10-03]] (`corpo.n1` sem `;`, lint E4 de [[fase10-10-05]]); no prompt, a injeção de corpo do beat n1 é UMA, nunca lista.
2. **Teto de palavras por frase** — frases de sílabas: curtas; o teto numérico é semente a fixar na primeira rodada de calibração (registrar o valor escolhido no template versionado).
3. **Poucos pontos finais** — limiar verificado: ≤ **12** pontos finais e média ≤ **2** frases/beat (a régua do validador, agora GATE no runtime — [[fase12-12-03]]).
4. **Fusão limitada** — no n1, a instrução genérica "menos pontos finais, una frases" do prompt-semente é SUBSTITUÍDA por instrução própria ([[fase12-12-01]]): unir pouco, nunca criar período longo.

### O método de calibração
1. Rodar a **validação em escala** (o experimento adaptado a fichas — portão de [[fase10-10-04]]) com a matriz por nível.
2. Medir com a **Camada 1 de runtime** ([[fase12-12-03]]) — inclusive o ritmo-gate.
3. **Ler em voz alta: o juiz final é o Manoel.** A nota do juiz LLM é sinal auxiliar, NUNCA alvo de otimização — otimizar contra o juiz LLM é overfitting ao gosto de um modelo (e o juiz já se mostrou sistematicamente mais severo com o n1: 3.5–3.9).
4. Iterar o prompt-template ([[fase12-12-01]], versionado) contra Camada 1 + ouvido; parar quando a grade do n1 fechar.

**DECISÃO ABERTA:** se a calibração não fechar, o n1 usa realizador ou cai para o A+ cru? O critério (registrado, não decidido): a **grade 4×4 por nível** da validação em escala decide — célula n1 consistentemente abaixo do padrão das demais (Camada 1 + veto do ouvido) ⇒ n1 fica no A+ v3 e os demais níveis usam o realizador; grade fechada ⇒ realizador em todos. Nenhum número de corte é fixado antes de existirem os dados.

## Regras de negócio
1. **Otimizar contra Camada 1 + ouvido, nunca contra a nota do juiz LLM** (o juiz reporta, não governa).
2. **O n1 pode divergir dos demais níveis** no template (instruções próprias) — divergir de comportamento, nunca de contrato (o Pacote é o mesmo).
3. **Ritmo do n1 é gate** no runtime (12 pontos / 2 frases-beat como semente; recalibrar só com dados da validação em escala).
4. **Decisão realizador-vs-A+ por nível é reversível:** registrada na TRILHA com a grade que a justificou; nova rodada de calibração pode revertê-la.
5. **Template versionado** ([[fase12-12-01]]): sem versão de template não há comparação entre rodadas de calibração.

## Passos de implementação
1. Materializar as instruções n1 no template (UMA sensação; teto por frase; fusão limitada).
2. Rodar a matriz da validação em escala; extrair a grade por nível.
3. Sessão de leitura em voz alta (Manoel) sobre as amostras do n1 (e contra-amostras do A+ cru).
4. Fechar a DECISÃO ABERTA com a grade em mãos; registrar na TRILHA.

## Estados / edge-cases
- n1 passa na Camada 1 mas soa mecânico ao ouvido → o ouvido veta (o gate é necessário, não suficiente).
- n1 reprova só no ritmo-gate com texto bom → suspeitar do limiar antes do prompt (12/2 são sementes) — mas mudar limiar exige dados, não caso único.
- Regressão nos outros níveis ao calibrar o n1 → few-shot por nível ([[fase12-12-01]], DECISÃO ABERTA de lá) é o antídoto natural; a matriz completa roda a cada iteração justamente para pegar isso.
- A+ cru escolhido para o n1 → o app compõe: n1 via `montar` v3, n2–n4 via realizador — a costura vive na orquestração (fase 13, texto simples).

## Critérios de aceitação / verificação
- [ ] Requisitos do n1 registrados (UMA sensação; teto por frase; ≤12 pontos; ≤2 frases/beat) com origem verificada.
- [ ] Correção do "15 → 12" registrada explicitamente.
- [ ] Método fechado: Camada 1 + voz alta; juiz LLM como sinal, nunca alvo.
- [ ] DECISÃO ABERTA registrada como CRITÉRIO (grade 4×4 decide), sem decidir agora.

## Relações com outros docs
- Depende de: `[[fase12-12-00]]`, `[[fase12-12-01]]`, `[[fase12-12-03]]`
- É consumido por: — (fecha a fase 12; a decisão n1 alimenta a orquestração da fase 13)
- Reconcilia / conserta: —
