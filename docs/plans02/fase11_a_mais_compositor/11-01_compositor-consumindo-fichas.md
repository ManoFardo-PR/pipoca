# fase11 · 11-01 · Compositor consumindo fichas

## Identidade
- id: `fase11-11-01`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Especificar o compositor — `compor(estado, fichas, perfil)` produz um `PacoteComposicao` puro e determinístico a partir das fichas, sem escrever uma frase sequer.

## Pré-requisitos / Depende de
- `[[fase11-11-00]]` — o contrato do Pacote que esta função produz.
- `[[fase10-10-00]]` — o contrato `pipoca.fichas.v1` que ela consome.
- `[[fase10-10-01]]` — ficha de identidade (origem de `descricao`).
- `[[fase10-10-03]]` — ficha de sensação (origem de `corpo`).

## Arquivos afetados
PLANEJADOS (criar só na implementação):
- `src/core/compositor/compor.ts` — a função central (proposta de caminho; `src/core/compositor/` não existe — verificado).
- `src/core/compositor/pacote.ts` — tipos do contrato (de [[fase11-11-00]]).
- **NÃO tocar** `src/core/composicao.ts` — o Motor A+ v3 (559 linhas, em produção) permanece intocável nesta geração até a fase 14; o compositor nasce AO LADO, não é refactor.

## Nomes & variáveis
- `compor` — a função central planejada: `compor(estado, fichas, perfil) → PacoteComposicao`. **Nota de homonímia (verificada):** o v3 já exporta um `compor` (recompor o miolo com pontas travadas, `src/core/composicao.ts:461-469`) — são módulos distintos e propósitos distintos; ao citar, qualificar sempre ("o `compor` do compositor" vs "o `compor` do v3").
- `PacoteComposicao`, `beats`, `papel` — reaproveitados de [[fase11-11-00]].
- `estado` — o estado de composição da partida (linha da criança, rodada, modos) — no v3 é `EstadoComp` (`src/core/composicao.ts:102`); o compositor consome o equivalente da nova geração, a fechar na implementação.
- `fichas` — os três catálogos carregados de `docs/fichas/*.v1.json` (import de JSON versionado — decisão da fase 10; banco de dados é assunto da fase 13).
- `perfil` — nome, gênero e nível de leitura da criança (cadastro).

## Interfaces / contratos
Assinatura planejada e propriedades:

- `compor(estado, fichas, perfil) → PacoteComposicao` — **pura** (sem I/O, sem relógio), **determinística** (mesma entrada ⇒ Pacote byte-idêntico) e **sem RNG**.
- **Diferença deliberada vs o v3:** as fichas têm UMA descrição por nível — não há variantes a sortear. No v3, o sorteio de variantes é o único consumo de aleatoriedade (`escolherVariante` consome rng apenas quando o pool tem mais de 1 item, `src/core/composicao.ts:159-164`, com seed determinística em `montar`, `src/core/composicao.ts:508`). O compositor elimina a categoria inteira: zero rng.

O que `compor` faz, na ordem:
1. **Resolve o nível** do perfil (`NivelKey`) e projeta cada célula: `descricao[nivel]`, `corpo[nivel]`, `interacao[nivel]`.
2. **Monta os beats na ordem da linha** da criança — nunca reordena (garantia de existência do compositor).
3. **Deriva `papel`** (mecânica verificada no v3): as pontas são travadas desde a rodada 1 (`ordenarR1` marca `pontasTravadas`, `src/core/composicao.ts:475-488`) e as rodadas 2+ só inserem no miolo (`podeInserir` exige slot interior, `src/core/composicao.ts:405-410`). Logo: `linha[0]` = abertura, última posição = fecho, todo o resto = miolo — válido desde a R1, não só na rodada final.
4. **Seleciona relações** pela gramática ([[fase11-11-02]]): condições avaliadas, teto 2, especificidade, `alvo` explícito.
5. **Injeta cenário** (id, `descricao`, `voz_do_contador` da ficha de cenário) **e personagem** (do perfil).
6. **Preenche `eco`** (se desfecho aberto) e `restricoes` (tabela do nível, [[fase11-11-00]]).

## Regras de negócio
1. **Nunca inventa objeto, nunca reordena a linha** — a garantia de existência do compositor.
2. **Determinismo:** mesmo `estado + fichas + perfil` ⇒ Pacote byte-idêntico (testado em [[fase11-11-03]]).
3. **Parsing de condição `se` é privilégio exclusivo do compositor** (D4 de [[fase10-10-02]]); o Pacote sai sem condições.
4. **Tolerância a vizinho preservada:** `descricao` entra crua no beat; interação entre objetos só via `relacoes`.
5. **Falha explícita, nunca silenciosa:** objeto sem ficha ou nível ausente → erro nomeado (o lint de [[fase10-10-05]] impede a montante, mas o compositor não confia — dupla barreira).
6. **Fichas por import versionado:** origem = JSON no repositório (`docs/fichas/*.v1.json`); migração a banco é fase 13 (fora deste doc).

## Passos de implementação
1. Definir o tipo do `estado` da nova geração (ou reusar o `EstadoComp` do v3 — decidir na implementação, registrando a escolha).
2. Implementar os passos 1–6 de "Interfaces / contratos" em `src/core/compositor/compor.ts`.
3. Cobrir com os testes de [[fase11-11-03]] (determinismo, ordem, papéis, falhas explícitas).
4. Validar o Pacote produzido contra o golden de [[fase11-11-00]].

## Estados / edge-cases
- Objeto pedido sem ficha no catálogo → erro explícito com o id do objeto (nunca beat vazio).
- Nível ausente numa ficha → erro explícito com objeto+campo+nível (nunca degradar para outro nível — invariante de [[fase10-10-00]]).
- Linha com 1 objeto → beat único `papel: "abertura"`; linha com 2 → abertura + fecho (miolo vazio é legal).
- Relação apontando para `alvo` fora da linha → a condição não casa (semântica de `antes_de:`/`depois_de:` exige ambos presentes, `src/core/composicao.ts:213-220`); nunca incluir relação com alvo ausente.
- Perfil sem nível válido → erro explícito antes de compor (validação de entrada).

## Critérios de aceitação / verificação
- [ ] Assinatura, pureza, determinismo e ausência de RNG declarados, com a diferença vs o v3 citada por linha.
- [ ] Derivação de `papel` fixada com a mecânica real de âncoras verificada (`ordenarR1`/`podeInserir`).
- [ ] Origem das fichas (import de JSON versionado) e fronteira com a fase 13 registradas.
- [ ] Edge-cases de ficha/nível ausente com falha explícita especificados.
- [ ] Nota de homonímia `compor` (compositor) × `compor` (v3) registrada.

## Relações com outros docs
- Depende de: `[[fase11-11-00]]`, `[[fase10-10-00]]`, `[[fase10-10-01]]`, `[[fase10-10-03]]`
- É consumido por: `[[fase11-11-02]]` (a seleção de relações é um passo do compor), `[[fase11-11-03]]`
- Reconcilia / conserta: —
