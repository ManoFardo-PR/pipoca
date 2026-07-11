# fase14 · 14-00 · Auditoria de dependências (o que ainda usa frases)

> ✅ **STATUS · 2026-07-11 · AUDITORIA REEXECUTADA** — grep reexecutado com a fase 13 implantada: a tabela consumidor→destino abaixo segue válida, com consumidores NOVOS nascidos nas fases 12–13, todos SEGUE (consomem o v3 no posto de reserva): `src/core/realizador/cascata.ts` (fallback via montar), `src/core/geracao/geracao.ts` (fallback do módulo de geração), `src/app/estado.js` (prévia determinística + A+ cru no teto de espera) e o e2e novo `tests/e2e/run-geracao2-canonico.mjs` (prova de vida do v3 no caminho infeliz). O e2e canônico v3 SEGUE VIVO. As duas amarras duras conferidas (checker :170 verde; v3 no bundle regenerado). Nada foi movido — o arquivamento aguarda o gatilho triplo do 14-01. Roteiro: ../TRILHA-plans02.md

## Identidade
- id: `fase14-14-00`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: pivot

## Objetivo
Mapear TODO consumidor do banco de frases (`docs/quintal.v3.json` + o caminho de montagem de texto do v3) e fixar o destino de cada um na geração 2 — a base factual de toda a fase 14.

## Pré-requisitos / Depende de
- `[[fase10-10-04]]` — a destilação frases→fichas (o que a migração consome do banco).
- `[[fase12-12-04]]` — a política de falha que mantém o v3 VIVO como fallback.
- `[[fase13-13-01]]` — a prévia determinística que também mantém o `montar` v3 em uso.

**A tensão central desta fase (registrada com honestidade):** diferente da aposentadoria v1/v2 (motores mortos removidos), o A+ v3 **continua VIVO na geração 2** — é o fallback de conteúdo ([[fase12-12-04]]) e a prévia do portão ([[fase13-13-01]], decisão fixada). "Aposentar o banco de frases" NÃO significa remover o v3 do runtime; significa rebaixá-lo de TITULAR a RESERVA, com o realizador assumindo o texto lido no portão. **O que se aposenta é o POSTO, não o motor.** Qualquer plano que remova o v3 do bundle quebra o fallback — proibido por design.

## Arquivos afetados
Nenhum nesta fase (auditoria/planejamento). Os consumidores listados abaixo são o INVENTÁRIO verificado; mudanças neles pertencem à execução condicionada ([[fase14-14-01]]).

## Nomes & variáveis
- `ESQUEMA_COMPOSICAO_V3` — a constante do esquema ativo (`src/core/composicao.ts:37`, `"pipoca.grafo-autoral.v3"`), replicada nos bundles.
- `lintGrafoV3` — o lint do grafo (`src/core/lint_grafo.ts:82`), consumido pelo admin e pela suíte.
- `validarGrafoAutoral` — a validação do admin (`src/admin/validar_grafo.ts:46`).
- Reaproveitados com grafia idêntica: `montar` (o tecelão do v3, `src/core/composicao.ts:505`); `montarComposicao`, `preverComposicao` ([[fase13-13-01]]); `pacoteOrigem` ([[fase13-13-02]]).

## Interfaces / contratos

### A tabela consumidor→destino (completa, sem "a decidir")
Destinos: **SEGUE** (permanece servindo o posto de reserva — fallback/prévia), **MIGRA** (passa ao fluxo novo), **SELO** (doc da geração 1 que recebe selo/linhagem em [[fase14-14-02]]).

| consumidor (verificado) | o que faz hoje | destino |
|---|---|---|
| `src/app/estado.js:666` (`_initComposicao` :664-676; boot :986) | fetch do `docs/quintal.v3.json` | SEGUE — o fallback e a prévia precisam do grafo carregado |
| `src/app/estado.js:792-796` (`montarComposicao`) | tece o texto do portão | SEGUE — vira o caminho de prévia + fallback ([[fase13-13-01]]) |
| `src/app/estado.js:857-863` (`preverComposicao`) | prévia sem efeito colateral | SEGUE — decisão fixada: prévia é determinística |
| `src/app/estado.js:894-923` (`_capturarHistoriaSalva`) | salva a história convergida | MIGRA — a captura passa a receber o texto do módulo de geração, com `origem` e `pacoteOrigem` ([[fase13-13-02]]) |
| `src/app/bridge.ts:149` (`montar: compMontar`) | expõe o `montar` ao app | SEGUE — o seam continua servindo prévia/fallback |
| `src/core/composicao.ts` (incl. lapidação de conectivos :268-345, aplicada :512-530) | o motor e a costura de texto | SEGUE — **a lapidação NÃO perde função**: com a prévia determinística fixada, ela segue viva em todo texto de prévia/fallback |
| `src/core/lint_grafo.ts` (`lintGrafoV3` :82) + `src/admin/validar_grafo.ts:46` + `Conteudo.dc.html:119,129` + `bridge_admin.ts:55,133` + `admin.test.ts:71` | valida o grafo autoral no admin e na suíte | SEGUE — o conteúdo do fallback continua precisando de gate; o admin ganhará um irmão para fichas (lint de [[fase10-10-05]]) sem aposentar este |
| `src/core/composicao.test.ts:26` (grafo real) + `:25` golden v3 (`composicao_golden_v3.json` — só `casos`, REFERENCIA o grafo ativo; bloco 8 :378-398) | suíte + golden byte a byte | SEGUE — protege o comportamento do fallback; nota: o golden v2 EMBUTE o grafo (o v2 foi arquivado) — se um dia o v3 for arquivado de verdade, o golden v3 precisa embutir antes (lição do precedente) |
| `tests/fumaca-presenca-v3.ts:25` | fumaça de presença sobre o grafo | SEGUE — gate editorial do conteúdo do fallback |
| `tests/e2e/run-linha-verde-canonico.mjs:611-626` ("prova de vida do v3", lê o arquivo :614) · `run-reordenar-miolo.mjs:49` (via runtime) | e2e do fluxo atual | MIGRA parcialmente — o canônico ganha variante para o fluxo novo (texto do realizador no portão); a prova de vida do v3 PERMANECE cobrindo prévia/fallback |
| `docs/plans/check_plans.mjs:28` (lê o grafo), `:160` (schema no Set), **`:170` (FALHA DURA se `pipoca.grafo-autoral.v3` sumir do grafo ativo)** | checker da geração 1 | SEGUE — amarra dura nº 1: o arquivo e o esquema não podem sumir enquanto o checker da geração 1 valer |
| `experimentos/beats-para-paragrafos/` (`gerar-historias.ts:10`, `avaliar/avaliar-pares.test.ts:7`, `linha-aleatoria.ts:16,19` — importa `montar`) | a prova de conceito da era beats | MIGRA — a versão-fichas ([[fase10-10-04]]) assume; a versão-beats vira candidata a arquivo em [[fase14-14-01]] DEPOIS que a versão-fichas rodar |
| `pipoca.bundle.js:2006` · `pipoca.admin.bundle.js:412` | os compilados que embutem o v3 | SEGUE — amarra dura nº 2: regenerar normalmente; **nunca remover o v3 do bundle** |
| Docs da geração 1 (`_contratos/schemas-json.md`, `_contratos/grafo-autoral-v3.md`, `fase08_conteudo/08-00…` e irmãos, `TRILHA-DE-IMPLEMENTACAO.md`, `revisao-quintal-v3*.md`) | descrevem o v3 como titular | SELO — recebem selo/nota de linhagem em [[fase14-14-02]]; nada se apaga |

### As duas amarras duras (invariantes de execução)
1. **`check_plans.mjs:170`**: o checker da geração 1 falha se o esquema `pipoca.grafo-autoral.v3` sair do grafo ativo — o arquivo permanece onde está.
2. **Bundles**: o v3 embarcado é o fallback offline-de-conteúdo do runtime — removê-lo do bundle quebra [[fase12-12-04]]. Proibido por design.

## Regras de negócio
1. **Aposenta-se o POSTO, não o motor:** o v3 sai de titular do texto lido; permanece reserva (fallback + prévia).
2. **Tabela sem "a decidir":** todo consumidor tem destino fixado (SEGUE/MIGRA/SELO) — critério de aceitação deste doc.
3. **Nada se remove nesta fase:** a auditoria só mapeia; mover/arquivar é [[fase14-14-01]], condicionado.
4. **Auditoria por grep antes de qualquer movimento** (disciplina do precedente `old/README.md`: "verificado por grep no repositório inteiro antes de cada mudança").
5. **Lição do golden v2:** fixture de coisa arquivada EMBUTE o dado; fixture de coisa viva REFERENCIA — o golden v3 só muda de regime se o v3 um dia deixar de ser reserva.

## Passos de implementação
1. Reexecutar o grep de consumidores no momento da execução (a tabela acima é o baseline de 2026-07-09; código muda).
2. Confirmar cada destino com o estado então-vigente das fases 10–13 implementadas.
3. Entregar a tabela atualizada como entrada de [[fase14-14-01]] (arquivamento) e [[fase14-14-02]] (selos).

## Estados / edge-cases
- Consumidor novo surgido entre o baseline e a execução → entra na tabela com destino fixado antes de qualquer movimento.
- Consumidor SEGUE que perder função no caminho (ex.: prévia mudar de decisão) → reclassificar formalmente ANTES de arquivar; nunca arquivar por inferência.
- Bundle regenerado sem o v3 por acidente → o e2e canônico (prova de vida) e a suíte quebram — é exatamente para isso que eles SEGUEM.
- Checker da geração 1 desativado no futuro → a amarra nº 1 cai, mas a nº 2 (fallback) permanece; as duas são independentes.

## Critérios de aceitação / verificação
- [ ] Tabela consumidor→destino COMPLETA, com caminho:linha verificado e sem nenhum "a decidir".
- [ ] A tensão titular→reserva registrada (o que se aposenta é o posto).
- [ ] As duas amarras duras registradas (checker :170; bundle).
- [ ] Regra "nada se remove nesta fase" explícita.

## Relações com outros docs
- Depende de: `[[fase10-10-04]]`, `[[fase12-12-04]]`, `[[fase13-13-01]]`
- É consumido por: `[[fase14-14-01]]`, `[[fase14-14-02]]`
- Reconcilia / conserta: —
