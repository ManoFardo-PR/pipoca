# fase11 · 11-02 · Gramática de decisão reaproveitada (posição · tem · depois_de · ecos · rotação)

> ✅ **STATUS · 2026-07-10 · IMPLEMENTADA** — `src/core/compositor/gramatica.ts`: semântica reimplementada idêntica ao v3 (não importada), seleção D5 (especificidade + ordem + teto 2 por Pacote) e derivação de `eco` (aberto/convergente). Cobertura nos blocos 3 e 6 da suíte (48 asserts verdes). Roteiro: ../TRILHA-plans02.md

## Identidade
- id: `fase11-11-02`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Fixar como a gramática de decisão do v3 é reaproveitada na moeda nova: as mesmas condições, agora selecionando FICHAS DE RELAÇÃO (nunca temperos-frase) — e registrar o que se aposenta na tradução.

## Pré-requisitos / Depende de
- `[[fase11-11-00]]` — o Pacote onde o resultado da gramática aterrissa (`relacoes` e `eco`).
- `[[fase10-10-02]]` — a ficha de relação chaveada por estas condições (e as decisões D4/D5).

## Arquivos afetados
PLANEJADO: a avaliação de condições vive dentro de `src/core/compositor/` (proposta: `src/core/compositor/gramatica.ts`). Fonte da semântica: `src/core/composicao.ts` (o v3, intocável — a gramática é REIMPLEMENTADA com semântica idêntica, não importada, para manter os módulos independentes; registrar a escolha na implementação se houver motivo para importar).

## Nomes & variáveis
- `se` — reaproveitado de [[fase10-10-02]]: a condição da relação (string ou array = E lógico).
- `tem:`, `depois_de:`, `antes_de:`, `pos:` — reaproveitados de [[fase10-10-02]], semântica verificada abaixo.
- `nao_tem:` — existe no v3 (`src/core/composicao.ts:207-209`) e ENTRA na moeda nova com a mesma semântica; nenhuma ficha da fase 10 a usa ainda (registrado).
- `func:*` — namespace reservado do v3: aceito, nunca casa (`src/core/composicao.ts:221-222`); segue reservado na moeda nova.
- `eco`, `beats`, `restricoes` — reaproveitados de [[fase11-11-00]].

## Interfaces / contratos

### Mapa condição→efeito (semântica REAL do v3, verificada linha a linha)

| condição | semântica no v3 (`src/core/composicao.ts`) | efeito na moeda nova |
|---|---|---|
| `tem:X` | X presente na linha, **com guarda contra o próprio objeto** (`alvo !== objId`, :205) | seleciona relação de co-presença; a guarda é preservada |
| `nao_tem:X` | X ausente da linha (:207-209) | mantida; relação de ausência (sem uso nas fichas ainda) |
| `pos:inicio` / `pos:fim` / `pos:miolo` | índice 0 / último / interior (:210-212) — **`pos:miolo` existe no v3** | relação/manifestação de posição; as três formas entram |
| `antes_de:X` / `depois_de:X` | direcionais; **exigem AMBOS na linha** (:213-220) | relação de antecipação/resposta; alvo ausente ⇒ não casa |
| `func:*` (e condição desconhecida) | cai no `return false` — nunca casa, nunca lança (:221-222) | idem: aceito, nunca casa |
| `se` em array | E lógico; **array vazio nunca casa** (`casaSe`, :226-231) | idem |

### Seleção de relações (teto 2 + especificidade, D5)
No v3, vence o PRIMEIRO tempero que casa e tem texto no nível (loop em :247-253, fallback `conta` :253). Na moeda nova, a regra D5 de [[fase10-10-02]] generaliza:
1. Coletar as relações candidatas (condição casa, avaliada pelo compositor com a semântica acima).
2. Ordenar por **especificidade** = número de condições no `se` (maior vence).
3. Desempate: **ordem do array** — a herdeira direta do primeiro-que-casa do v3.
4. Aplicar o **teto de 2 por Pacote**; as vencedoras entram em `beats[].relacoes` já resolvidas (com `alvo`, sem `se` — D4).

### Ecos → campo `eco` do Pacote
No v3 (`textoDesfecho`, :355-374): só em desfecho aberto (:357); `se_comecou_com` casa com `linha[0]` e `se_terminou_com` com a última posição, ambos presentes = E (:364-367); fragmento sem condição é pulado (:364-365); `max_ecos` default 1 (:360); sem eco → convergente (:373). Na moeda nova, o compositor NÃO seleciona fragmento de texto: preenche `eco: {abre_com: linha[0], fecha_com: última}` quando o desfecho é aberto (ou `null`), e o REALIZADOR ecoa com as próprias palavras. A decisão de arranjo (haver eco ou não) permanece do compositor; a redação do eco migra para o realizador.

### O que se APOSENTA da v3 nesta tradução
- **Seleção de variantes por PRNG:** seed `fnv1a(cenario.id|linha|nivel)` (:508), `mulberry32` (:126-134), `escolherVariante` (:159-164) — sem objeto: fichas têm UMA célula por nível. A variedade de superfície vira trabalho do realizador.
- **Conectivos:** `escolherConectivo` com regra de não-repetição (:261-266) e o tecer com supressões no `montar` (:516-534) — costura de frases é prosa, logo é do realizador.
- **`insere_em`:** declarado no `RodadaV2` (:64) mas NUNCA lido pelo motor (verificado) — não migra; a inserção no miolo é governada por `podeInserir` (:405-410), cuja consequência (papéis) já vive em [[fase11-11-01]].
- **Rotação de sensação** (variar o sentido secundário entre células, disciplina da revisão A2): deixa de ser propriedade do banco de frases; o material sensorial agora é dado por nível na ficha ([[fase10-10-03]]) e a variação de superfície é do realizador.

## Regras de negócio
1. **Mesma semântica, moeda nova:** cada condição avalia EXATAMENTE como no v3 (tabela acima); o que muda é o efeito — selecionar fichas de relação, não temperos-frase.
2. **Guarda do `tem:` preservada:** `tem:` nunca casa com o próprio objeto (linhagem :205).
3. **Compositor avalia, realizador nunca:** nenhuma condição atravessa a fronteira do Pacote (D4).
4. **Teto 2 + especificidade + ordem** (D5) — regra fechada, calibrável só pelo portão do 10-04.
5. **`func:*` reservado:** aceito no dado, nunca casa, nunca lança — mesma postura defensiva do v3.

## Passos de implementação
1. Reimplementar a avaliação de condições em `src/core/compositor/gramatica.ts` com a semântica da tabela (usar os casos do teste do v3 como referência de comportamento).
2. Implementar a seleção D5 (candidatas → especificidade → ordem → teto 2).
3. Implementar a derivação de `eco` (aberto/convergente).
4. Cobrir com os blocos 3 e 6 de [[fase11-11-03]].

## Estados / edge-cases
- Condição com alvo fora do catálogo → o lint pega a montante ([[fase10-10-05]]); o compositor trata como não-casa (defensivo).
- `se` array vazio → nunca casa (linhagem :228) — lint deve avisar (candidata a regra futura, registrar em revisão do 10-05 quando houver).
- Empate de especificidade E de ordem impossível (array tem ordem total) — não há caso indefinido.
- Desfecho aberto com linha de 1 objeto → `abre_com` = `fecha_com` (mesmo objeto); legal, o realizador decide como ecoar.
- Mais de 2 relações no MESMO beat após o corte global → o teto é por Pacote, não por beat (D5); registrar no teste de precedência.

## Critérios de aceitação / verificação
- [ ] Tabela condição→efeito completa, com cada semântica citada por `caminho:linha` do v3.
- [ ] Guarda `alvo !== objId` do `tem:` registrada e preservada.
- [ ] `nao_tem:` e `pos:miolo` (presentes no v3, ausentes do resumo usual) registrados como mantidos.
- [ ] Regra de seleção D5 (especificidade + ordem + teto 2) fechada e mapeada para os testes.
- [ ] Ecos traduzidos (compositor decide, realizador redige) e aposentadorias listadas (PRNG, conectivos, `insere_em`, rotação de sensação).

## Relações com outros docs
- Depende de: `[[fase11-11-00]]`, `[[fase10-10-02]]`
- É consumido por: `[[fase11-11-01]]` (passo 4 do compor), `[[fase11-11-03]]`
- Reconcilia / conserta: —
