# fase08 · 08-03 · Cenário "Floresta sussurrante"

## Identidade
- id: `fase08-08-03`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Autorar o grafo + nota de arte do cenário "Floresta sussurrante" (sombra e segredos).

## Pré-requisitos / Depende de
- `[[fase08-08-01]]` — o guia de autoria e o processo de validação.

## Arquivos afetados
- `src/dados/cenarios/floresta.json` (criar) — grafo `pipoca.grafo-autoral.v1`.
- nota de arte: base na cena SVG `floresta` do protótipo.

## Nomes & variáveis
- `cenario.id = "floresta_sussurrante"`; personagem/paleta próprios.
- objetos (ex.): trilha, cogumelo que brilha, riacho, pássaro, lanterna — com `gatilho`/`regras`/`ordem_canonica`.

## Interfaces / contratos
- `GrafoAutoral`, `Cenario`, `Objeto`, `Fragmento4` ([[_contratos/tipos-core]]); schema `pipoca.grafo-autoral.v1` ([[_contratos/schemas-json]]).

## Regras de negócio
1. Tom curioso/calmo; níveis n1→n4.
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
