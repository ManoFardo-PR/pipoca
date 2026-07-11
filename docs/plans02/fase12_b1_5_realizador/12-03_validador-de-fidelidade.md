# fase12 · 12-03 · Validador de fidelidade (Camada 1 promovida a runtime)

> ✅ **STATUS · 2026-07-10 · IMPLEMENTADA** — `src/core/realizador/validador.ts:103` (`validar`): presença POR BEAT, gênero bidirecional parametrizado, teto sobre o máximo canônico (+25%), ritmo n1 como GATE (12/2), aviso de tempo verbal e de parágrafos. Âncora do orvalho CORRIGIDA (`gota*`, :42 — os 12 FAILs do PR #21 eram "Gotas" no plural; lista estreita, não omissão). Testes dispara/passa na suíte do realizador. Roteiro: ../TRILHA-plans02.md

## Identidade
- id: `fase12-12-03`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Promover a Camada 1 do experimento a validador de runtime — o coração da segurança do realizador: checagens determinísticas do texto CONTRA O PACOTE, saída PASS/FAIL + motivos.

## Pré-requisitos / Depende de
- `[[fase12-12-00]]` — o contrato onde o `veredito` deste validador aterrissa.
- `[[fase11-11-00]]` — o Pacote: a referência contra a qual TUDO é validado (não mais a `HistoriaBase` do experimento).

## Arquivos afetados
PLANEJADO: `src/core/realizador/validador.ts` (proposta). Linhagem verificada (não tocar): `experimentos/beats-para-paragrafos/avaliar/camada1-fidelidade.ts` (o gate determinístico) e `avaliar/termos-nucleo.ts` (âncoras e termos).

## Nomes & variáveis
- `veredito` — reaproveitado de [[fase12-12-00]]: `{ pass, motivos[], avisos[] }` (+ métricas de ritmo quando n1).
- `ANCORAS_POR_OBJETO` — a tabela de termos-âncora por objeto (linhagem: `termos-nucleo.ts:11-19`).
- `VereditoCamada1` — o tipo do experimento (`tipos.ts:106-112`), linhagem do `veredito` de runtime.
- `HistoriaBase` — a referência ANTIGA do experimento ([[fase10-10-04]]); no runtime a referência é o `PacoteComposicao`.
- Reaproveitados com grafia idêntica: `PacoteComposicao`, `beats`, `restricoes` ([[fase11-11-00]]); `corpo` ([[fase10-10-03]]).

## Interfaces / contratos

### As checagens (linhagem verificada, limiares verbatim de `camada1-fidelidade.ts:10-13`)

| # | checagem | como era no experimento | limiar |
|---|---|---|---|
| 1 | Cobertura de núcleo | cada objeto da linha deixa ao menos uma âncora lexical no texto (`:33-43`), tabela `ANCORAS_POR_OBJETO` (`termos-nucleo.ts:11-19` — ex.: vagalume = faísca/luz/lanterna*/pisca*; frasco = pote/vidro/frasco*/tampa*) | ≥1 âncora por objeto |
| 2 | Presença do personagem | fração de SENTENÇAS com termo de protagonista/corpo (`:45-49`; termos em `termos-nucleo.ts:21-50`) | `LIMIAR_PRESENCA = 0.6` |
| 3 | Nome/gênero | nome presente; indício de troca = artigo do gênero oposto antes do nome, ou "menino" (`:51-66`) — "joana" HARDCODED | binário |
| 4 | Teto de crescimento | `(palavrasRealizado − palavrasBase) / palavrasBase` (`:68-74`) | `TETO_CRESCIMENTO = 0.25` |
| 5 | Ritmo n1 | pontos finais e média frases/beat (`:90-100`) — **métrica INFORMATIVA no experimento, não gate** (`pass = motivos.length === 0`, `:102`) | `LIMIAR_PONTOS_FINAIS_N1 = 12` · média ≤ `2` frases/beat |
| — | Avisos (não reprovam) | nomes próprios fora do elenco; fala entre aspas que não existia (`:76-88`) | — |

Nota de correção: o limiar de pontos finais do n1 é **12** (verificado em `camada1-fidelidade.ts:12`), não os "15" às vezes citados de memória.

### O que MUDA na promoção a runtime

| mudança | motivo (com evidência) |
|---|---|
| **Presença contada contra BEATS, não fração de sentenças** | lição da fase 10 confirmada nos dados: os 3 únicos reprovados do experimento (94/97) são FALSOS-FAIL de presença (50%, 50% e 58% vs limiar 60% — `saida/avaliacao/reprovados.md`) em textos que são boas FUSÕES de sentenças; punir fusão contradiz o próprio prompt ("menos pontos finais"). No runtime: cada beat do Pacote deve deixar marca de corpo/personagem — a régua é por beat, não por sentença |
| **Personagem parametrizado** | o experimento valida "joana" fixa (`:56-63`); o runtime valida `personagem.nome`/`personagem.genero` do Pacote (artigo oposto ao gênero + termos de gênero trocado) |
| **Base de crescimento = derivada do Pacote** | no experimento a base era o texto do motor (`HistoriaBase`); no runtime a base é a soma do material textual do Pacote (descricoes+corpos+interacoes) — registrar a fórmula na implementação; o teto de 25% segue (folgado: crescimento médio observado = 2.8%, `relatorio-completo.md:9`, zero avisos de teto — `consolidado.json:16`) |
| **Ritmo n1 vira GATE** | evolução deliberada: no experimento era métrica separada; no runtime, com o n1 sendo o ponto sensível ([[fase12-12-05]]), estourar ritmo reprova |
| **Âncoras: origem da tabela** | a tabela por objeto continua determinística; candidata natural a derivar das próprias fichas (a `descricao` de cada objeto contém suas âncoras) — registrar como opção de implementação, decidir na migração |

### Saída
`veredito = { pass, motivos[], avisos[], ritmoN1? }` — `pass = motivos.length === 0` (linhagem `:102`). O veredito alimenta a política de falha ([[fase12-12-04]]): FAIL nunca chega à criança.

## Regras de negócio
1. **Determinístico e sem rede:** só código; nenhuma chamada a LLM (mesmo espírito da Camada 1 e do lint de [[fase10-10-05]]).
2. **Valida contra o Pacote:** a única referência é o `PacoteComposicao` — o validador não vê fichas, grafo nem o prompt.
3. **Presença por beat** (a mudança nº 1): falso-FAIL de fusão é defeito conhecido e corrigido por design.
4. **Erro reprova, aviso registra:** motivos → FAIL → 12-04; avisos seguem no veredito para telemetria/calibração.
5. **Limiar muda só com evidência:** os valores (0.6→por-beat, 0.25, 12, 2) são semente; recalibrar exige dados da validação em escala (portão de [[fase10-10-04]]).

## Passos de implementação
1. Portar as checagens 1–5 com as mudanças da tabela (presença por beat; personagem do Pacote; base do Pacote; ritmo-gate).
2. Definir a origem da tabela de âncoras (fixa vs derivada das fichas) durante a migração 10-04.
3. Testes: reproduzir os 3 falsos-FAIL do experimento como casos que agora PASSAM (por beat) — a prova da correção.
4. Encadear no pipeline do realizador ([[fase12-12-00]], passo 2).

## Estados / edge-cases
- Texto vazio ou só espaços → FAIL imediato (motivo "resposta vazia"), antes das checagens.
- Beat cujo objeto não tem âncora na tabela → AVISO no experimento (`:37`); no runtime, com âncoras derivadas de fichas, vira ERRO de configuração (nunca silêncio).
- Nome do personagem que colide com palavra comum (ex.: "Luz") → a checagem de âncora/presença tokeniza por palavra (linhagem `termos-nucleo.ts:64`); registrar caso-teste.
- Crescimento NEGATIVO (texto menor que a base) → legal (fusões encolhem; observado 259→257 no experimento); só o teto superior reprova.

## Critérios de aceitação / verificação
- [ ] As 5 checagens + avisos especificados com linhagem verbatim e limiares (12, não 15).
- [ ] A tabela "o que muda para runtime" completa — em especial presença POR BEAT com os 3 falsos-FAIL citados como evidência.
- [ ] Saída `veredito` fechada com [[fase12-12-00]] e consumo pelo [[fase12-12-04]] apontado.
- [ ] Teste planejado que reproduz os falsos-FAIL como PASS registrado.

## Relações com outros docs
- Depende de: `[[fase12-12-00]]`, `[[fase11-11-00]]`
- É consumido por: `[[fase12-12-04]]` (o veredito decide a cascata), `[[fase12-12-05]]` (a calibração otimiza contra este validador)
- Reconcilia / conserta: —
