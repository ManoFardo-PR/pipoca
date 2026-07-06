# fase08 · 08-04 · Cenário "Lá no espaço"

## Identidade
- id: `fase08-08-04`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Autorar o grafo + nota de arte do cenário "Lá no espaço" (entre as estrelas).

## Pré-requisitos / Depende de
- `[[fase08-08-00]]` — Motor A+ e schema `pipoca.grafo-autoral.v3`.
- `[[fase08-08-01]]` — o guia de autoria e o processo de validação.

## Arquivos afetados
- `src/dados/cenarios/espaco.json` (criar) — grafo `pipoca.grafo-autoral.v3`.
- nota de arte: base na cena SVG `espaco` do protótipo.

## Nomes & variáveis
- `cenario.id = "la_no_espaco"`; personagem/paleta próprios.
- objetos (ex.): foguete, planeta com anel, estrela, cometa, lua — com `gatilho`/`regras`/`ordem_canonica`.

## Interfaces / contratos
- `GrafoAutoral`, `Cenario`, `Objeto`, `Fragmento4` ([[_contratos/tipos-core]]); schema `pipoca.grafo-autoral.v3` ([[_contratos/grafo-autoral-v3]]).

## Regras de negócio
1. Tom de descoberta; níveis n1→n4.
2. Dependências por regras → `ordem_canonica`.
3. Convergente + ramos abertos.
4. Validar ([[fase04-04-04]]).

## Passos de implementação
1. Escrever objetos e fragmentos.
2. Definir ordem e desfechos.
3. Validar e publicar na galeria (T3).

## Estados / edge-cases
- objeto sem ramo → `gatilho`.
- ramo aberto faltando → convergente.

## Critérios de aceitação / verificação
- [ ] Passa na validação de [[fase04-04-04]].
- [ ] Jogável via fixtures de [[fase00-00-21]].

## Relações com outros docs
- Depende de: `[[fase08-08-01]]`
- É consumido por: `[[fase01-01-02]]`
- Reconcilia / conserta: —
