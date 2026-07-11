# fase13 · 13-00 · Fronteiras e contratos entre módulos

> ✅ **STATUS · 2026-07-11 · IMPLEMENTADA** — o módulo de geração vive em `src/core/geracao/geracao.ts` (gerar em :120; política de ROTA POR NÍVEL configurável, default realizador em todos — :44; personagem canônico do perfil legado — :52), exposto pelo seam como novo sub-objeto (`src/app/bridge.ts:160`, `composicao` intocado). Regra de ouro testada com provedores fake (35 asserts em `src/core/geracao/geracao.test.ts`); origem sempre sinalizada. Roteiro: ../TRILHA-plans02.md

## Identidade
- id: `fase13-13-00`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: pivot

## Objetivo
Fixar o mapa de módulos da geração 2 e o que passa em cada fronteira — cada módulo conhece só o contrato do vizinho, nunca as tripas — e registrar o que muda no acoplamento real de hoje.

## Pré-requisitos / Depende de
- `[[fase10-10-00]]` — o contrato de fichas (fronteira Conteúdo→Compositor).
- `[[fase11-11-00]]` — o Pacote de Composição (fronteira Compositor→Realizador).
- `[[fase12-12-00]]` — o contrato do realizador (fronteira Realizador→App).

## Arquivos afetados
Nenhum nesta fase (planejamento de integração). O acoplamento ATUAL descrito abaixo vive em: `src/app/estado.js` (1015 linhas, expõe `window.PipocaApp` :947), `src/app/bridge.ts` (:137, :139-152, :256) e `pipoca.bundle.js` (o compilado que o app consome).

## Nomes & variáveis
- `PipocaCanonico` — o seam global ATUAL (verificado): definido em `src/app/bridge.ts:137`, exposto em `globalThis` em `src/app/bridge.ts:256`; o sub-objeto `composicao` (`bridge.ts:139-152`) mapeia `iniciar`/`montar`/`abrirProximaRodada`/`convergiu` etc. para `src/core/composicao.js`.
- `src/core/geracao/` — o módulo NOVO fixado (2026-07-09) entre app e motores: gera a história de ponta a ponta (compõe → realiza → valida → fallback). O nome "geracao" evita a homonímia verificada com `src/ia/orquestrador.ts` (cadeia de fallback de PROVEDORES, outra coisa). **Regra:** não criar um segundo símbolo `orquestrador` no repositório.
- Reaproveitados com grafia idêntica: `compor`, `PacoteComposicao` ([[fase11-11-00]] e [[fase11-11-01]]); `realizar`, `veredito` ([[fase12-12-00]]); `pipoca.fichas.v1` ([[fase10-10-00]]).

## Interfaces / contratos

### O mapa de módulos (a cadeia da geração 2)

```
CONTEÚDO            COMPOSITOR              REALIZADOR                    APP
docs/fichas/*.v1  →  compor(estado,      →  realizar(pacote, opcoes)  →  exibe texto,
(3 camadas,          fichas, perfil)        → { texto, paragrafos,       salva história,
 pipoca.fichas.v1)   → PacoteComposicao       veredito }                  não sabe a origem
                                             (LLM + validador,
                                              fallback A+ v3 via 12-04)
```

O que passa em cada fronteira (e SÓ isso):
| fronteira | o que atravessa | o que NUNCA atravessa |
|---|---|---|
| Conteúdo → Compositor | os 3 catálogos de fichas (JSON versionado) | frases prontas; personagem (vem do perfil) |
| Compositor → Realizador | o `PacoteComposicao` (autossuficiente; textos resolvidos no nível) | condições `se` (D4); acesso a fichas/grafo/gramática |
| Realizador → App | `{ texto, paragrafos, veredito }` + origem sinalizada (LLM/fallback) | o prompt; o provedor; o Pacote cru (salvo para persistência, ver [[fase13-13-02]]) |
| App → Compositor | `estado` da partida (linha/rodada/modos) + `perfil` (nome, gênero, nível) | qualquer texto |

### Regra de ouro (cada módulo só conhece o contrato do vizinho)
- O **app** não sabe se o texto veio de LLM ou do fallback A+ v3 (só recebe a origem como metadado para telemetria).
- O **realizador** não conhece a gramática do compositor (nenhum `se` atravessa — D4) nem o banco de fichas.
- O **compositor** não conhece o provedor de LLM, o prompt, nem o app.
- O **conteúdo** (fichas) não conhece ninguém: é dado versionado.

### O acoplamento HOJE (verificado) e o que muda
Hoje o app fala DIRETO com o motor: `estado.js` acessa `window.PipocaCanonico.composicao` (acessor `_comp()`, `src/app/estado.js:678-681`) e chama `C.iniciar` (:730), `C.montar` (:792-796), `C.abrirProximaRodada` (:802) — o A+ v3 é o único caminho. O grafo chega por `fetch("./docs/quintal.v3.json")` (`_initComposicao`, :665-676, chamado no boot :986).

Amanhã: entre o app e os motores entra o **módulo de geração** (`src/core/geracao/`) — recebe o estado+perfil, chama compositor→realizador, aplica a política de falha ([[fase12-12-04]]) e devolve texto+origem. O A+ v3 permanece EXATAMENTE onde está (fallback vivo, intocável até a fase 14 — texto simples); o que muda é quem o chama: o módulo de geração, não mais o `estado.js` direto. O ponto de enxerto exato vive em [[fase13-13-01]].

**Decisão fixada (2026-07-09):** o módulo de geração é um MÓDULO NOVO — `src/core/geracao/` — fora do app: testável sem DOM, o app fica fino (regra de ouro). O nome "geracao" (quem gera a história de ponta a ponta) foi escolhido para não colidir com o `src/ia/orquestrador.ts` vivo; fica a regra: nenhum segundo símbolo `orquestrador` no repositório.

## Regras de negócio
1. **Regra de ouro:** módulo conhece só o contrato do vizinho; toda comunicação pelas quatro fronteiras da tabela — sem atalhos.
2. **Contratos são os das fases 10–12:** esta fase NÃO redefine shapes; costura os existentes (`pipoca.fichas.v1`, `pipoca.pacote-composicao.v1`, o resultado de `realizar`).
3. **O A+ v3 não se move:** fallback vivo em produção; nenhum refactor de `src/core/composicao.ts` nesta geração (aposentadoria do banco de frases = fase 14, texto simples).
4. **Origem sempre sinalizada** na fronteira Realizador→App (regra herdada de [[fase12-12-04]]).
5. **Seam explícito:** o padrão `PipocaCanonico` (bridge + bundle + global) é o precedente de como expor o orquestrador ao `estado.js` — mesma disciplina, novo sub-objeto.

## Passos de implementação
1. Declarar o contrato do módulo de geração (`src/core/geracao/`; entrada: estado+perfil; saída: texto+paragrafos+origem) — 1 página, colada aos contratos existentes.
2. Expor via bridge (novo sub-objeto em `PipocaCanonico` ou irmão), mantendo `composicao` intocado.
3. Integrar no app conforme [[fase13-13-01]]; persistir conforme [[fase13-13-02]]; deploy conforme [[fase13-13-03]].

## Estados / edge-cases
- Fichas não carregadas (fetch falhou) → o módulo de geração não tenta compor: cai direto no caminho v3 atual (que tem o próprio grafo) e sinaliza a origem.
- Realizador indisponível (edge fora do ar) → cascata → fallback A+ v3 ([[fase12-12-04]]); o app não percebe diferença estrutural.
- Perfil sem gênero (gap real do tipo Perfil atual — ver [[fase13-13-01]]) → o módulo de geração não chama o compositor sem personagem completo; a extensão do perfil é pré-requisito de integração.
- Versões de contrato divergentes (Pacote v1 vs realizador esperando v2) → rejeição explícita na fronteira, nunca coerção silenciosa.

## Critérios de aceitação / verificação
- [ ] Mapa de módulos + tabela de fronteiras (o que passa / o que nunca passa) completos.
- [ ] Regra de ouro enunciada com os três "não sabe" (app/realizador/compositor).
- [ ] Acoplamento atual descrito como É (com caminho:linha) e o delta (orquestrador entre app e motores) registrado.
- [ ] Decisão fixada do módulo de geração (`src/core/geracao/`, fora do app; regra anti-homonímia) registrada.

## Relações com outros docs
- Depende de: `[[fase10-10-00]]`, `[[fase11-11-00]]`, `[[fase12-12-00]]`
- É consumido por: `[[fase13-13-01]]`, `[[fase13-13-02]]`, `[[fase13-13-03]]`
- Reconcilia / conserta: —
