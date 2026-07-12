# plans02 · Trilha (fases 10–14)

> Roteiro da geração 2 (arquitetura de fichas). Complementa — não substitui — a trilha da
> geração 1 (`docs/plans/TRILHA-DE-IMPLEMENTACAO.md`), que segue válida para o runtime atual
> (Motor A+ v3, fallback em produção).

## Mapa de status

| Fase | Status | Onde |
|------|--------|------|
| 10 Modelo de fichas | 🟢 CONCLUÍDA (2026-07-10; 3 pendências herdadas pela fase 12 — ver "Fechamento da fase 10") | `fase10_modelo_de_fichas/` — 6 docs com selo de status |
| 11 A+ compositor | 🟢 IMPLEMENTADA (2026-07-10 — `src/core/compositor/`, compor() determinístico + golden; PR da fase 11) | `fase11_a_mais_compositor/` — 4 docs com selo de status |
| 12 B1.5 realizador | 🟢 CONCLUÍDA (2026-07-11 — parada de voz ENCERRADA POR DECISÃO EXECUTIVA; ver "Fechamento da fase 12") | `fase12_b1_5_realizador/` — 6 docs com selo de status |
| 13 Integração & modularização | 🟢 IMPLEMENTADA (2026-07-11 — `src/core/geracao/` no runtime, edge deployada; ver "Fases 13+14 implementadas") | `fase13_integracao_modularizacao/` — 4 docs com selo de status |
| 14 Aposentar banco de frases | 🟡 PARCIAL (selos de linhagem ✅ aplicados; ARQUIVAMENTO aguarda o gatilho triplo — sessão real) | `fase14_aposentar_banco_de_frases/` — 3 docs com selo de status |

Nota: as decisões abertas da fase 10 foram **fechadas em 2026-07-09** — registradas nos próprios docs como "Decisão fixada" (caminhos/esquema; cenário×personagem na ficha de cenário; descrição de cenário string única; campo alvo no contrato; teto de 2 relações por Pacote; lista A1 + regra de dígrafo).

Nota: as decisões abertas da fase 11 foram **fechadas em 2026-07-09** sob o princípio **Pacote = matéria · prompt-template = método**: as 3 leis editoriais vivem no prompt-template do realizador (não no Pacote); o bloco de cenário do Pacote inclui a sensação do lugar no personagem, resolvida no nível.

Nota: as decisões abertas da fase 12 foram **fechadas em 2026-07-09**: segmentação de parágrafos por instrução ao LLM, com número de parágrafos crescente por rodada (sem segmentador pós-LLM); few-shot por nível (exemplos autorais, a materializar na calibração); a escolha realizador-vs-A+ cru no n1 segue como CRITÉRIO decidido pela grade 4×4 da validação em escala, não decisão de pessoa.

Nota: as decisões abertas da fase 13 foram **fechadas em 2026-07-09**: o módulo de geração é módulo novo em `src/core/geracao/` (sem segundo símbolo "orquestrador" no repo); a prévia do portão é determinística (A+ v3), realização por LLM só no commit; gênero no perfil e evolução do esquema de histórias são campos ADITIVOS OPCIONAIS nos v1 de storage (`.v2` reservado para quebra de shape; "nunca mutar `.vN`" protege schemas autorais); a migração fichas JSON→BD fica no jardim, com condição de colheita.

## Fechamento do detalhamento (2026-07-09)

**As 5 fases (10–14) estão detalhadas.** Próxima etapa = IMPLEMENTAÇÃO, começando pela fase 10 (fichas), com o portão da validação em escala ([[fase10-10-04]]) obrigatório ANTES de comprometer a fase 11. A fase 14 executa só quando o gatilho triplo do [[fase14-14-01]] disparar (validação em escala + fase 13 implantada + primeira sessão real). Decisões em aberto remanescentes: apenas a DECISÃO ABERTA condicionada do [[fase14-14-01]] (congelar vs manutenção mínima do v3 — decidida com dados de acionamento do fallback) e o CRITÉRIO do [[fase12-12-05]] (n1: grade 4×4 decide).

## Nota de sequência (portão da fase 11)

A validação em escala do modelo de fichas (experimento existente adaptado para fichas) deve
ocorrer ao fim da fase 10, **ANTES** de comprometer a fase 11. O critério vive em
[[fase10-10-04]] (Critérios de aceitação / verificação — validação em escala com Camada 1,
juiz e leitura em voz alta do Manoel).

**Portão ABERTO em 2026-07-10** — justificativa: a fase 11 é determinística e não depende da
calibração do realizador; a fidelidade — o que a 11 precisava — foi validada (270/291 = 93%
em regime fidelidade-pura; ver "Fechamento da fase 10" abaixo). O veredito de voz da
🛑 Parada Dura 2 foi ADIADO (não dispensado) para o fim da fase 12 — pendência 3 abaixo.

## Validação em escala recalibrada (2026-07-10)

Validação em escala (recalibrada) executada em 2026-07-10; artefatos no PR #21;
aguardando veredito da 🛑 Parada Dura 2 (leitura em voz alta do autor, incluindo o
CRITÉRIO do [[fase12-12-05]] — n1: realizador ou A+ cru). A recalibração (orçamento de
palavras proporcional ao material + tempo presente) corrigiu o telegrama do n1; a grade
nova (22/291 PASS na Camada 1) aponta a próxima calibração para o fator 0,45 vs a
instrução branda de alvo e para o gate de ritmo n1 — decisão do autor no portão
[[fase10-10-04]].

## Fechamento da fase 10 (2026-07-10)

**Fase 10 CONCLUÍDA.** O autor decidiu encerrar o ciclo de validação em escala registrando as
pendências em vez de rodar mais um ciclo agora: o PR #21 foi mesclado com autorização
("fidelidade validada em escala — 270/291 = 93% em regime fidelidade-pura; falhas de
comprimento são calibração do realizador, herdadas pela fase 12"). As falhas de comprimento
(220 de crescimento sobre o alvo + 68 de ritmo n1) são propriedade do realizador (fase 12),
não do modelo de fichas; o núcleo de fidelidade (âncoras, corpo, gênero, nome) ficou sólido.

As 3 pendências herdadas pela fase 12:

1. ⏳ **Tabela canônica de comprimento** por nível×rodada — decisão do autor; proposta em
   aberto: norma do golden v3 ±20% (R1n1=31 · R1n2=55 · R1n3=91 · R1n4=200 · R4n1=71 ·
   R4n2=122 · R4n3=193 · R4n4=403 palavras). Endereço: [[fase12-12-01]] (restrições do
   prompt) e [[fase12-12-05]] (calibração).
2. ⏳ **Few-shot por nível** — exemplos autorais/validados (candidatos: os 22 aprovados +
   os melhores reprovados-só-por-comprimento do PR #21). Endereço: [[fase12-12-01]]
   (decisão D-12.2 já tomada; materialização pendente).
3. ⏳ **Veredito de voz da Parada Dura 2** — leitura em voz alta do autor + CRITÉRIO do
   12-05 (n1: realizador ou A+ cru). ADIADO, não dispensado: passa a ser pré-requisito do
   fim da fase 12 (antes de qualquer integração da fase 13 — nada chega à criança sem ele).
   Endereço: [[fase12-12-05]]. Junto: achados do ciclo 1 a aplicar na 12 — regras de fusão
   no prompt do n1; regra de anáfora ("não usar ele/ela para objetos; repetir o nome");
   investigar a âncora do orvalho (12 dos 21 FAILs reais).

## Fase 12 implementada — Parada de Voz (2026-07-11)

**Fase 12 IMPLEMENTADA; 🛑 PARADA DE VOZ ABERTA — o PR #24 é a parada.** O módulo
`src/core/realizador/` (realizar + prompt-template + provedor plugável + validador +
cascata com fallback A+ v3) está pronto, testado (66 asserts) e calibrado pelo protocolo
do [[fase12-12-05]] (smoke → amostra 71% → lote). O experimento fichas→histórias consome
o pipeline REAL (compor+realizar); o andaime do ciclo 1 foi arquivado.

Ledger das heranças da fase 10:

1. ✅ **Tabela canônica de comprimento** — ADOTADA como default datado ("ajustável pelo
   veredito de voz"): `MAXIMO_PALAVRAS` em `src/core/realizador/prompt_template.ts`, com
   instrução dura "Máximo M palavras" (nunca "cerca de"). Gate = máximo × 1,25.
2. ✅/gap **Few-shot por nível (D-12.2)** — minerado VERBATIM do PR #21 (1–2 por nível,
   banda canônica + nota do juiz); GAP PARCIAL sinalizado: o n1 tem só 1 candidato na
   banda 31–71. Veto/edição do autor na parada (tabela no PR #24).
3. ✅ **Veredito de voz — DECISÃO EXECUTIVA (2026-07-11)**: grade nova 74/137 (54%) vs
   22/291 (7,6%) do ciclo 1, lado a lado; célula n1 em 26%. O autor encerrou a parada
   por decisão executiva no merge do PR #24: o n1 permanece no realizador por ora;
   recalibração futura será por ajuste de prompt; o julgamento final do CRITÉRIO do
   [[fase12-12-05]] migra para a primeira sessão real com a criança. Achados do
   ciclo 1 ✅ aplicados no template (fusão n1, anáfora, presente). **Orvalho ✅
   concluído**: os 12 FAILs eram "Gotas" no plural — lista de âncoras estreita, não
   omissão do modelo; corrigida (`gota*` em `src/core/realizador/validador.ts`).

Limitação registrada: o lote do ciclo 2 é PARCIAL por decisão do autor (instabilidade
recorrente da rede local; 137 estados limpos — t0.2 completa + t0.4 parcial; t0.7
ausente). Retomável a qualquer momento pelo gerador (lotes salvos são pulados). Defesas
adicionadas: pausa no retry transitório e timeout de 180s no transporte.

## Fechamento da fase 12 (2026-07-11)

**Fase 12 CONCLUÍDA por decisão executiva do autor.** A 🛑 Parada de Voz foi encerrada
no merge do PR #24: o realizador está aceito com a grade parcial (74/137 = 54%;
fidelidade 100% no conjunto limpo — zero falhas de âncora/gênero/nome); o n1 fica no
realizador por ora; o juiz final do CRITÉRIO (n1: realizador ou A+ cru) passa a ser a
primeira sessão real. **Portão da fase 13: ABERTO.**

Pendências de jardim (não bloqueiam a fase 13):
- Completar o lote da calibração (um comando: `EXP_TEMPERATURAS="0.2,0.4,0.7"
  bun run experimentos/fichas-para-historias/gerar.ts` — lotes salvos são pulados;
  falta t0.7 inteira + resto da t0.4).
- Recalibrar a célula n1 (por ajuste de prompt) SE a sessão real pedir; junto: o gap
  do few-shot n1 (1 só exemplo na banda 31–71) e a tabela canônica (a testemunha
  R4×n3 falhou só por crescimento +32% — indício de tabela curta).

## Fases 13+14 implementadas — IMPLEMENTAÇÃO CONCLUÍDA (2026-07-11)

**A geração 2 está no runtime.** A fase 13 enxertou o módulo de geração
(`src/core/geracao/` — política de ROTA POR NÍVEL, default realizador em todos;
trocar um nível = uma linha de config) no app real: fichas carregadas no boot ao
lado do grafo; prévia do portão DETERMINÍSTICA (A+ v3, zero LLM por movimento);
realização por LLM em BACKGROUND no commit da rodada, com teto de espera e
fallback A+ cru na captura; perfil com gênero ADITIVO (legado sem gênero ⇒
personagem canônico "Joana", f); persistência aditiva (origem + pacoteOrigem +
rodada + intermediárias por rodada, retrocompatível, sem cache de replay); rota
edge do realizador DEPLOYADA (irmã do proxy-ia; cascata no servidor; cliente
keyless; grep de chave em `src/` = zero); e2e novo da geração 2 (provedor fake)
MANTENDO o e2e canônico v3 vivo. A fase 14 aplicou os selos de linhagem na
geração 1 (decisão executiva: selos agora; arquivamento espera) — o checker da
geração 1 segue 10/10 e nada foi movido para `old/`.

**Esta TRILHA é o roteiro ativo do projeto; `docs/plans/` é história selada
(viva no que descreve o runtime de reserva).** Nenhuma fase resta a implementar.

Pendências de jardim (com condição de colheita, nenhuma bloqueia o uso):
- **Primeira sessão real — O JUIZ FINAL e próximo marco.** Dispara: o veredito
  definitivo do CRITÉRIO do n1 (realizador vs A+ cru — hoje realizador, por
  decisão executiva); e a 3ª condição do gatilho triplo do 14-01 (arquivamento
  da Leva 3 + DECISÃO ABERTA congelar-vs-manutenção-mínima do v3, com dados de
  acionamento do fallback). NOTA: a hipótese prévia↔texto-final foi observada e
  RESOLVIDA (P2, 2026-07-12): o portão lê o realizado — ver [[fase13-13-01]].
- **Calibração do validador (comprimento/tolerância)** — decisão do AUTOR: a
  tabela `MAXIMO_PALAVRAS`/`TETO_CRESCIMENTO` (25%) manda muita realização n2 R1
  (máx. 55 palavras) para a cascata → fallback. A taxa PASS/FAIL real só é
  observável quando a edge tiver secrets (abaixo). Colher com dados de `uso_ia`
  + os textos gerados; junto: gap do few-shot n1.
- **Rota do n1** (realizador vs A+ cru): a config de 1 linha existe; a decisão é
  da sessão real.
- **Parametrizar o NOME no conteúdo v3** (112 "Joana" no `docs/quintal.v3.json`):
  só se a sessão real exigir — hoje o v3 é fallback/prévia e o realizador já usa
  o nome do perfil; o few-shot do prompt já foi parametrizado (P3).
- Completar o lote da calibração (t0.7 + resto da t0.4 — um comando, retomável).
- Cache de replay: só se a sessão real mostrar a criança pedindo "a mesma
  história de novo" e a versão nova frustrando (13-02).
- Migração fichas JSON→BD: só com mais de um cenário em produção OU edição por
  não-dev virando necessidade real (13-03).
- **⚠️ Config de produção da rota edge — AÇÃO DO AUTOR (bloqueia o caminho feliz
  REAL).** A função `realizador` está deployada e trancada (verify_jwt) e a
  `config_ia` da plataforma já existe (migração `2026-07-12_config_plataforma` +
  ids de modelo reais). PORÉM o smoke real (P0) revelou a causa-raiz mais
  profunda: **os SECRETS de API dos provedores NÃO estão configurados na edge**
  (`GEMINI_API_KEY`/`DEEPSEEK_API_KEY` = ausentes → 502 `realizacao_esgotada`).
  Sem as chaves (privadas do autor), 100% das histórias seguem no fallback A+ v3
  ("Joana"). Colher: setar os secrets no dashboard Supabase e rodar
  `bun run scripts/smoke-realizador.mjs run` até um 200 com `origem.fonte:"llm"`.

## Incidente da primeira sessão real (2026-07-11) — identidade do personagem

> 🔄 **CORREÇÃO DA NARRATIVA · 2026-07-12 (A3 + smoke P0):** o "primeiro 200"
> celebrado abaixo **NÃO foi o caminho feliz do edge** — foi o **fallback A+ v3
> LOCAL** (o cliente converte qualquer não-200 da edge em fallback no
> dispositivo, `proxy_realizador.ts`). A edge nunca completou uma realização:
> 100% das POSTs deram 503 `nao_configurado` (sem linha `config_ia`) e, após o
> conserto da config (P0), 502 `realizacao_esgotada` (secrets de provedor
> ausentes na edge). Como conferir a origem de uma história salva: campo
> `origem.fonte` no envelope `pipoca.historias.v1:<perfilId>` do localStorage —
> `"llm"` = edge realizou; `"fallback-a-mais"` = A+ v3 local (com `origem.motivo`
> desde o P1). O incidente da identidade abaixo é REAL e independente (era o
> `PERSONAGEM_CANONICO` antes do LLM, não o few-shot), corrigido no PR #26.

A primeira sessão real registrou **um 200 na exibição** (compor → validador →
exibição funcionaram) — mas por FALLBACK LOCAL, não pela edge (ver correção
acima) — e o primeiro defeito de verdade: o perfil real "Pietro" (sem gênero
definido) recebeu a história da **"Joana"**. Causa-raiz (forense completo em
`forense-personagem.md`): a regra de default registrada no [[fase13-13-01]]
("perfil sem gênero ⇒ personagem canônico") substituía a identidade INTEIRA —
nome incluído — quando só a concordância faltava; o código a implementou
fielmente, o defeito era da regra.

Correção (PR `fix/identidade-personagem`): o nome do personagem é **SEMPRE o do
perfil** (nunca substituído; "Joana" fica só em conteúdo legado/demonstração);
gênero ausente ⇒ o app **pede uma vez** na ativação do perfil e persiste a
escolha; sem resposta, concordância feminina com o nome real; gênero
**obrigatório** no cadastro (Onboarding e Perfis). Decisão evoluída carimbada no
[[fase13-13-01]] com linhagem; teste do incidente na suíte (Pietro sem gênero ⇒
história do Pietro) e 3 cenários de identidade no e2e da geração 2.
