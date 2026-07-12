# fase08 · 08-00 · Motor A+ · Grafo Autoral V3

> 🔄 **SUPERADO COMO TITULAR · 2026-07-11 — VIVO COMO FALLBACK** — o Motor A+ v3 deixou de ser o gerador TITULAR do texto das histórias: a geração 2 (fichas → compositor → realizador, `docs/plans02/`) assumiu o posto — o texto realizado por LLM é o que se salva e relê; a prévia lida no portão segue sendo o texto determinístico deste motor (plans02 · fase13-13-01, decisão fixada). O motor descrito aqui PERMANECE em produção como fallback de conteúdo (plans02 · fase12-12-04) e prévia do portão — este doc segue descrevendo um motor vivo, agora de reserva. Nada daqui foi arquivado (o arquivamento aguarda o gatilho triplo de plans02 · fase14-14-01, incluída a primeira sessão real); ver `docs/plans02/TRILHA-plans02.md`.
>
> 🔄 **RECONCILIADO · 2026-07-12 (após A2 · P2)** — a frase acima ("a prévia lida no portão segue sendo o texto determinístico deste motor") descrevia o código de então, que DIVERGIA da decisão 13-01:50. Corrigido: o portão agora LÊ o texto REALIZADO (o A+ v3 é a RESERVA VISÍVEL quando a realização estoura o teto de 8s ou falha). Onde este motor segue TITULAR e determinístico: a **prévia por MOVIMENTO da T4** (zero LLM por movimento — e2e prova) e o **fallback** de conteúdo. Linhagem nunca se apaga — o texto original permanece. Ver `docs/plans02/fase13_integracao_modularizacao/13-01_orquestracao-no-app.md` (nota RECONCILIADO).
>
> 🟢 **STATUS · 2026-07-06 · COMPLETO — passos 1–7** — motor+lint+testes (passos 1–5), oficina de conteúdo com validação humana → `docs/quintal.v3.json` (passo 6) e troca do grafo ativo (passo 7: `_initComposicao` fetcha o v3; bundle regenerado; golden v3 congelado). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md
>
> 🔧 **2026-07 · lapidação da costura** — duas regras de runtime na costura conectivo+texto (rebaixamento da inicial + supressão do conectivo quando a variante já abre por marcador); rng preservado, texto autoral e mecânica inalterados. Golden v3 regenerado (só minúsculas/conectivos suprimidos). Ver `[[_contratos/grafo-autoral-v3]]` §4.1.

## Identidade
- id: `fase08-08-00`
- nó(s) da arquitetura: MA, GRAPH (evolução; não cria nó novo)
- tela(s) do brief: —
- classe: motor/conteúdo

## Objetivo
Evoluir o motor de composição e o schema autoral (v2 → v3) para multiplicar a diversidade percebida sem IA em runtime: variantes por célula, condições de posição, ecos no desfecho e conectivos, com replay determinístico.

## Pré-requisitos / Depende de
- `[[fase00-00-13]]` — schema do grafo (linhagem v1→v2→v3).

## Arquivos afetados
- `src/core/composicao.ts` (evoluir) — leitor v3 + normalização v2, PRNG semeado, gramática de condições, conectivos, ecos. Contrato público `montar(estado, nivel) → texto` INALTERADO.
- `docs/quintal.v3.json` (criar) — conteúdo v3 do Quintal (oficina + validação humana). `quintal.v2.json` permanece intocado.
- `src/core/composicao.test.ts` (criar) — os 7 blocos de teste do contrato.

## Nomes & variáveis
- `pipoca.grafo-autoral.v3` — schema novo.
- `TextoV3`, `CondicaoV3`, `max_ecos` — tipos/campos novos.
- Condições: `tem:` `nao_tem:` `pos:inicio|miolo|fim` `antes_de:` `depois_de:` `func:*` (namespace RESERVADO — aceito, nunca casa, lint avisa).
- Seed: `fnv1a(cenario.id + linha + nivel)` + `mulberry32` — replay determinístico obrigatório.
- Metadados `genero`/`numero`: declaração obrigatória (lint), consumo futuro.

## Interfaces / contratos
- `[[_contratos/grafo-autoral-v3]]` (fonte da verdade deste sub-passo).
- `[[_contratos/schemas-json]]`.
- `[[_contratos/tipos-core]]`.

## Regras de negócio
1. Tempero é sabor, nunca portão (herdada do v2; nenhuma condição bloqueia escolha).
2. Mesma linha + mesmo nível ⇒ mesmo texto, sempre (replay 2e).
3. Leitor v3 aceita grafos v2 (golden tests de equivalência em fixtures canônicas).
4. Conectivos só no miolo; pool n1 restrito a alta decodificabilidade.
5. Todo texto em runtime foi autorado e validado por humano (oficina IA é ferramenta offline, jamais autora final).

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
- Reconcilia / conserta: referências a `pipoca.grafo-autoral.v1` nos docs da fase 08 (ver Tarefa 4)
