# Prompt · Atualizar documentação — Motor A+ · Grafo Autoral V3 (cunha 08-00)

> **Para: Claude Code · Repositório `ManoFardo-PR/pipoca` (main)**
> **Natureza: SOMENTE DOCUMENTAÇÃO.** Nenhum arquivo fora de `docs/` é tocado.
> Nenhum código é alterado. Nenhum planejamento novo é inventado — todo o
> conteúdo a registrar está NESTE prompt e no contrato anexo
> (`docs\plans\_contratos\contrato-grafo-autoral-v3.md`, fornecido junto).

---

## Contexto (decisões já tomadas — não rediscutir)

1. O **Motor A+ · Grafo Autoral V3** (`pipoca.grafo-autoral.v3`) é a evolução
   aprovada do v2: variantes por célula, condições de posição, ecos no
   desfecho, conectivos, replay determinístico. Contrato completo no arquivo
   anexo. Ele **não** possui estado narrativo — isso é deliberado; estado
   narrativo pertence ao Motor B (Diretor Narrativo), que segue no jardim.
2. **Encaixe nas fases:** o v3 entra como sub-passo **`fase08-08-00`**
   (pertence ao pipeline de conteúdo), mas **executa ANTES da fase 07**,
   porque o teste com a criança (`[[fase07-07-03]]`) deve rodar sobre o
   Motor A+, e os 4 cenários da fase 08 devem nascer direto no v3.
3. A fase 06 continua em andamento; nada nela muda.

## Regras invioláveis

- `docs/plans/_diagnostico.md` é gerado pelo checker — **NUNCA editar à mão**.
- Cross-references exatamente nos formatos `[[faseFF-FF-NN]]` e
  `[[_contratos/nome]]`.
- Schemas: **nunca mutar um `.vN` publicado** — o v3 é entrada nova na tabela,
  o v2 permanece intocado.
- Docs substituídos recebem selo `SUPERSEDED`, não são deletados.
- Gate de saída: `node docs/plans/check_plans.mjs` deve retornar **10/10**.
  Se qualquer checagem quebrar, corrigir a costura (links/nomes), não o checker.

---

## Tarefa 1 — Criar `docs/plans/fase08_conteudo/08-00_motor-a-plus-grafo-v3.md`

Usar o gabarito `_TEMPLATE.md`. Conteúdo (ajustar apenas formatação ao
template, não o mérito):

```markdown
# fase08 · 08-00 · Motor A+ · Grafo Autoral V3

## Identidade
- id: `fase08-08-00`
- nó(s) da arquitetura: MA, GRAPH (evolução; não cria nó novo)
- tela(s) do brief: —
- classe: motor/conteúdo

## Objetivo
Evoluir o motor de composição e o schema autoral (v2 → v3) para multiplicar a
diversidade percebida sem IA em runtime: variantes por célula, condições de
posição, ecos no desfecho e conectivos, com replay determinístico.

## Pré-requisitos / Depende de
- `[[fase00-00-13]]` — schema do grafo (linhagem v1→v2→v3).
- Contrato canônico: `[[_contratos/grafo-autoral-v3]]`.

## Arquivos afetados
- `src/core/composicao.ts` (evoluir) — leitor v3 + normalização v2, PRNG
  semeado, gramática de condições, conectivos, ecos. Contrato público
  `montar(estado, nivel) → texto` INALTERADO.
- `docs/quintal.v3.json` (criar) — conteúdo v3 do Quintal (oficina + validação
  humana). `quintal.v2.json` permanece intocado.
- `src/core/composicao.test.ts` (criar) — os 7 blocos de teste do contrato.

## Nomes & variáveis
- `pipoca.grafo-autoral.v3` — schema novo.
- `TextoV3`, `CondicaoV3`, `max_ecos` — tipos/campos novos.
- Condições: `tem:` `nao_tem:` `pos:inicio|miolo|fim` `antes_de:` `depois_de:`;
  `func:*` é namespace RESERVADO (aceito, nunca casa, lint avisa).
- Seed: `fnv1a(cenario.id + linha + nivel)` + `mulberry32` — replay
  determinístico obrigatório.
- Metadados `genero`/`numero`: declaração obrigatória (lint), consumo futuro.

## Interfaces / contratos
- `[[_contratos/grafo-autoral-v3]]` (fonte da verdade deste sub-passo);
  `[[_contratos/schemas-json]]`; `[[_contratos/tipos-core]]`.

## Regras de negócio
1. Tempero é sabor, nunca portão (herdada do v2; nenhuma condição bloqueia escolha).
2. Mesma linha + mesmo nível ⇒ mesmo texto, sempre (replay 2e).
3. Leitor v3 aceita grafos v2 (golden tests de equivalência em fixtures canônicas).
4. Conectivos só no miolo; pool n1 restrito a alta decodificabilidade.
5. Todo texto em runtime foi autorado e validado por humano (oficina IA é
   ferramenta offline, jamais autora final).

## Passos de implementação
(sequência da §7 do contrato)
1. Tipos + leitor v3 com normalização e compat v2.
2. PRNG semeado + variantes.
3. Gramática de condições (incl. reserva `func:*`).
4. Conectivos.
5. Ecos no desfecho (`se_comecou_com`, compostos, `max_ecos`).
6. Oficina de conteúdo → `quintal.v3.json` → validação humana célula a célula.
7. Troca do grafo ativo (v2 permanece no repositório).

## Estados / edge-cases
- Grafo v2 carregado no leitor v3 → funciona (normalização).
- `func:*` em condição → nunca casa + aviso de lint.
- Célula sem os 4 níveis ou objeto sem `genero`/`numero` → lint reprova.

## Critérios de aceitação / verificação
- [ ] `bun x tsc --noEmit` limpo.
- [ ] `composicao.test.ts`: os 7 blocos do contrato passam.
- [ ] Golden tests v2 ≡ v3 nas fixtures canônicas.
- [ ] `quintal.v3.json` validado por humano, jogável de ponta a ponta.

## Relações com outros docs
- Depende de: `[[fase00-00-13]]`
- É consumido por: `[[fase08-08-01]]`, `[[fase07-07-03]]`, `[[fase07-07-04]]`
- Reconcilia / conserta: referências a `pipoca.grafo-autoral.v1` nos docs da
  fase 08 (ver Tarefa 4)
```

> Antes de gravar, conferir contra o `_TEMPLATE.md` real e contra os ids que o
> checker valida (ex.: se `[[fase00-00-13]]` não resolver, usar o id correto do
> doc de schema do grafo na fase00).

## Tarefa 2 — Canonizar o contrato em `_contratos/`

- Copiar o arquivo anexo `contrato-grafo-autoral-v3.md` para
  `docs/plans/_contratos/grafo-autoral-v3.md` (conteúdo VERBATIM; só ajustar
  links relativos se necessário para o checker).
- Em `docs/plans/_contratos/schemas-json.md`:
  - Adicionar linha na tabela: `pipoca.grafo-autoral.v3` · dono
    `[[../fase08_conteudo/08-00_motor-a-plus-grafo-v3]]` (ajustar ao formato
    de link usado na tabela existente) · persistido por: conteúdo autoral.
  - Adicionar seção curta "`pipoca.grafo-autoral.v3`" apontando para
    `[[grafo-autoral-v3]]` como fonte da verdade — NÃO duplicar o schema.
  - Não alterar as seções do v1/v2.

## Tarefa 3 — Atualizar `docs/plans/TRILHA-DE-IMPLEMENTACAO.md`

- No mapa de status: linha da fase 08 ganha nota "08-00 (Motor A+/v3) —
  **executa antes da fase 07**".
- Inserir, entre o Marco 6 e o Marco 7, um bloco curto:
  **"Cunha · 08-00 · Motor A+ (antecipado da fase 08)"** — 2 a 4 linhas: o quê
  (v3 conforme `[[_contratos/grafo-autoral-v3]]`), por quê (o teste com a
  criança `[[fase07-07-03]]` deve rodar sobre o A+; os 4 cenários da fase 08
  nascem direto no v3, evitando dupla autoria), e o lembrete de que a fiação
  da telemetria (pendente da fase 03) corre em paralelo, antes da sessão real.
- Atualizar a data do cabeçalho "Atualizado:".

## Tarefa 4 — Corrigir referências de schema na fase 08

- Nos docs `fase08_conteudo/08-0X_cenario-*.md` e `08-01` (guia de autoria):
  onde constar `pipoca.grafo-autoral.v1`, atualizar para
  `pipoca.grafo-autoral.v3` com referência a `[[_contratos/grafo-autoral-v3]]`
  e a `[[fase08-08-00]]` como pré-requisito.
- NÃO reescrever o mérito desses docs (objetos, tons, cenários); só a versão
  do schema e as dependências.
- Se algum doc ficar integralmente obsoleto (avaliar; improvável), aplicar o
  selo `SUPERSEDED` em vez de deletar.

## Tarefa 5 — README da pasta de planos

- Em `docs/plans/README.md`, na linha da fase 08 da tabela, acrescentar menção
  ao `08-00` (Motor A+/v3) como pré-requisito do pipeline; se houver nota de
  ordem de execução, registrar "08-00 antes da fase 07".

## Verificação final (obrigatória, nesta ordem)

1. `node docs/plans/check_plans.mjs` → **10/10** (o `_diagnostico.md` se
   regenera sozinho; não editar).
2. Revisar que NENHUM arquivo fora de `docs/` foi modificado.
3. Listar em resumo final: arquivos criados, arquivos alterados, e qualquer
   ambiguidade encontrada (ex.: id real do doc de schema na fase00) com a
   decisão tomada.
