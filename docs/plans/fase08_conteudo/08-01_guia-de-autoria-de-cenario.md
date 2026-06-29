# fase08 · 08-01 · Guia de autoria de cenário

## Identidade
- id: `fase08-08-01`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Padronizar como escrever um novo cenário `pipoca.grafo-autoral.v1` (objetos, regras, ordem, desfechos, 4 níveis) e validá-lo.

## Pré-requisitos / Depende de
- `[[fase00-00-13]]` — o schema do grafo (+ `ordem_canonica`).
- `[[fase04-04-04]]` — a validação na biblioteca de conteúdo (SA_CONTENT).

## Arquivos afetados
- `docs/plans/fase08_conteudo/GUIA-AUTORIA.md` (criar) — guia (não é doc de sub-passo).
- `src/dados/cenarios/` (criar) — pasta dos grafos por cenário.

## Nomes & variáveis
- estrutura de um `Cenario`: `abertura` (Fragmento4), `objetos[]` (gatilho + regras `tem:`/`nao_tem:`), `ordem_canonica`, `desfechos.{convergente,aberto[]}`.
- os 4 níveis `n1..n4` para cada fragmento.

## Interfaces / contratos
- `GrafoAutoral`, `Cenario`, `Objeto`, `Fragmento4`, `Regra`, `DesfechoAberto` ([[_contratos/tipos-core]]); schema `pipoca.grafo-autoral.v1` ([[_contratos/schemas-json]]).

## Regras de negócio
1. **Tom e níveis** coerentes com o quintal (referência): frases curtas crescendo até parágrafos.
2. **Dependências via regras** `tem:` definem a `ordem_canonica` (ou derivam por topo-sort).
3. **Convergente + ramos abertos** por objeto-chave.
4. **Validar** sempre contra schema + Motor A + `ValidadorOrdem` antes de publicar ([[fase04-04-04]]).
5. **Conteúdo seguro e acolhedor** (princípios do brief).

## Passos de implementação
1. Escrever o guia com checklist e exemplo (quintal como modelo).
2. Definir a pasta `src/dados/cenarios/`.
3. Cada cenário passa pela validação de [[fase04-04-04]] e pelas fixtures de [[fase00-00-21]].

## Estados / edge-cases
- ciclo nas dependências → rejeitado na validação.
- ramo aberto faltando → degrada para convergente.

## Critérios de aceitação / verificação
- [ ] Um cenário novo segue o guia e passa na validação.
- [ ] `ordem_canonica` consistente com as regras.

## Relações com outros docs
- Depende de: `[[fase00-00-13]]`, `[[fase04-04-04]]`
- É consumido por: `[[fase08-08-02]]`, `[[fase08-08-03]]`, `[[fase08-08-04]]`, `[[fase08-08-05]]`
- Reconcilia / conserta: —
