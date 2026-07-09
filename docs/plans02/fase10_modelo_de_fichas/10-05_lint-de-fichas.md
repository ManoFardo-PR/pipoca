# fase10 · 10-05 · Lint de fichas

## Identidade
- id: `fase10-10-05`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Especificar o lint determinístico das fichas — as regras-erro e os avisos que todo arquivo `pipoca.fichas.v1` deve passar antes de qualquer lote ser aceito.

## Pré-requisitos / Depende de
- `[[fase10-10-00]]` — o contrato cujos invariantes mecanizáveis viram regras aqui.
- `[[fase10-10-01]]` — a camada 1 que as regras E1–E3 e E5 cobrem.
- `[[fase10-10-02]]` — a camada 2 que a checagem de ids cobre.
- `[[fase10-10-03]]` — a regra do n1 (UMA sensação).

## Arquivos afetados
- `src/core/fichas/lint_fichas.ts` — PLANEJADO (implementação posterior; a pasta `src/core/fichas/` ainda não existe). Precedente na geração 1: `src/core/lint_grafo.ts` (lint do grafo v3, 0 erros/0 avisos como gate de teste).

## Nomes & variáveis
- `lint_fichas.ts` — arquivo planejado do lint (nome segue o precedente `lint_grafo.ts` da geração 1).
- `pipoca.fichas.v1` — o esquema validado (reaproveitado de [[fase10-10-00]]).
- Regras nomeadas: `E1`–`E5` (erros), `A1` (aviso) — vocabulário deste doc, a confirmar na implementação.

## Interfaces / contratos
Entrada: os três arquivos de fichas propostos em [[fase10-10-00]]. Saída: lista de erros e avisos por ficha/campo; **0 erros** é condição de aceite de lote; avisos exigem olhar humano, não bloqueiam.

### Regras-ERRO

**E1 · Os 4 níveis presentes** em `descricao` e em `sensacao.corpo`.
- Dispara: `"descricao": { "n1": "uma luzinha que pisca", "n2": "…", "n3": "…" }` (falta n4).
- Passa: os 4 níveis presentes, como no vagalume canônico de [[fase10-10-00]].

**E2 · `genero` e `numero` presentes** em toda ficha de identidade.
- Dispara: `"lua": { "descricao": { … } }` (sem `genero`/`numero` — e a lua é feminina: sem o campo, o realizador erra artigo).
- Passa: `"lua": { "genero": "f", "numero": "sg", … }`.

**E3 · Nenhum campo vazio** (string vazia ou só espaços em qualquer nível/campo).
- Dispara: `"n1": ""` ou `"registro": "  "`.
- Passa: todo campo com conteúdo real.

**E4 · n1 de `corpo` com UMA sensação** — heurística inicial: a string do n1 não contém `;`.
- Dispara: `"n1": "os olhos seguem a pisca; chegar perto na ponta dos pés"` (dois fragmentos no nível de sílabas → texto picado, a lição da prova de conceito em [[fase10-10-03]]).
- Passa: `"n1": "os olhos seguem a pisca"`.

**E5 · Tolerância a vizinho** — a `descricao` de uma ficha de identidade não menciona outro objeto do catálogo (checagem por id: nome/apelidos declarados dos demais objetos não aparecem no texto).
- Dispara: `"folha": { "descricao": { "n2": "a folha que o vento derruba do galho" } }` (cita `vento` — interação é papel da camada 2, ver [[fase10-10-02]]).
- Passa: `"folha": { "descricao": { "n2": "uma folha que desce rodando devagar" } }`.

Checagem irmã da E5 na camada 2: toda relação referencia ids existentes no catálogo (`objeto`/alvo fora do catálogo = ERRO).

### Regra-AVISO

**A1 · Palavra de decodificação difícil no n1 da `descricao`** — lista inicial curta e EXPANSÍVEL de palavras longas/de encontros consonantais duros para leitores de sílabas.
- Lista inicial proposta (DECISÃO ABERTA — validar com o Manoel e expandir com o uso): `rodopiando`, `atravessa`, `silhueta`, `reluzente`, `esvoaçante`.
- Dispara: `"n1": "uma folha esvoaçante"`.
- Passa: `"n1": "uma folha que desce rodando"`.

Candidato a aviso futuro (registrado em [[fase10-10-01]] e [[fase10-10-03]], sem regra ainda): teto de tamanho da descrição n4; gesto de `corpo` repetido entre objetos.

## Regras de negócio
1. **Lint é gate, não juiz:** 0 erros libera o lote para a validação humana célula a célula — nunca a substitui (parada dura de [[fase10-10-04]]).
2. **Erro bloqueia, aviso aponta:** ERRO impede aceite do lote; AVISO exige decisão humana registrada.
3. **Determinístico e sem rede:** só código; nenhuma chamada a LLM (mesmo espírito da Camada 1 do experimento `experimentos/beats-para-paragrafos/avaliar/camada1-fidelidade.ts`).
4. **Heurísticas são iniciais:** E4 (sem `;`) e A1 (lista de palavras) nascem simples e evoluem com evidência; endurecer só com caso real.

## Passos de implementação
1. Fechar a DECISÃO ABERTA da lista A1 com o Manoel.
2. Implementar `src/core/fichas/lint_fichas.ts` com E1–E5 + A1, seguindo o precedente de `src/core/lint_grafo.ts`.
3. Testes: para CADA regra, um caso que dispara e um que passa (os exemplos deste doc viram fixtures).
4. Encadear no fluxo de lote da migração ([[fase10-10-04]]): lint verde → validação humana.

## Estados / edge-cases
- Arquivo de fichas com `esquema` desconhecido → ERRO imediato (não valida campo a campo).
- Catálogo vazio ou arquivo ausente → ERRO explícito, não silêncio.
- Falso positivo da E5 (ex.: "gato" dentro de palavra maior) → casar por palavra inteira/id, não substring; registrar exceções quando surgirem.
- A1 com acento/caixa variados → normalizar (minúsculas, sem diacríticos) antes de comparar.

## Critérios de aceitação / verificação
- [ ] Cada regra (E1–E5, A1) especificada com exemplo que dispara e exemplo que passa, embutidos.
- [ ] Mapeamento invariante→regra fechado com [[fase10-10-00]] (invariantes 2, 3 e 4 cobertos por E2, E1 e E5).
- [ ] DECISÃO ABERTA da lista A1 registrada.
- [ ] Arquivo planejado e precedente da geração 1 citados.

## Relações com outros docs
- Depende de: `[[fase10-10-00]]`, `[[fase10-10-01]]`, `[[fase10-10-02]]`, `[[fase10-10-03]]`
- É consumido por: `[[fase10-10-04]]` (gate de lote da migração)
- Reconcilia / conserta: —
