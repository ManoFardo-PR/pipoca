# fase08 · 08-02 · Cenário "Quarto aconchegante"

## Identidade
- id: `fase08-08-02`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Autorar o grafo + nota de arte do cenário "Quarto aconchegante" (hora de dormir).

## Pré-requisitos / Depende de
- `[[fase08-08-01]]` — o guia de autoria e o processo de validação.

## Arquivos afetados
- `src/dados/cenarios/quarto.json` (criar) — grafo `pipoca.grafo-autoral.v1`.
- nota de arte: reaproveitar a cena SVG `quarto` do protótipo como base.

## Nomes & variáveis
- `cenario.id = "quarto_dormir"`; personagem/paleta próprios.
- objetos (ex.): luminária, livro, ursinho, janela/estrelas, cobertor — com `gatilho`/`regras`/`ordem_canonica`.
- 4 níveis `n1..n4` por fragmento.

## Interfaces / contratos
- `GrafoAutoral`, `Cenario`, `Objeto`, `Fragmento4` ([[_contratos/tipos-core]]); schema `pipoca.grafo-autoral.v1` ([[_contratos/schemas-json]]).

## Regras de negócio
1. Tom calmo de "hora de dormir"; níveis crescendo n1→n4.
2. Regras `tem:`/`nao_tem:` definem dependências e `ordem_canonica`.
3. Desfecho convergente + ramos abertos por objeto-chave.
4. Validar contra schema + Motor A + `ValidadorOrdem` ([[fase04-04-04]]).

## Passos de implementação
1. Escrever os objetos e fragmentos (4 níveis).
2. Definir `ordem_canonica` e os desfechos.
3. Validar e adicionar à galeria de cenários (T3).

## Estados / edge-cases
- objeto sem ramo → usa `gatilho`.
- desfecho aberto faltando → convergente.

## Critérios de aceitação / verificação
- [ ] Passa na validação de [[fase04-04-04]].
- [ ] Jogável via fixtures de [[fase00-00-21]].

## Relações com outros docs
- Depende de: `[[fase08-08-01]]`
- É consumido por: `[[fase01-01-02]]` (galeria de cenários)
- Reconcilia / conserta: —
