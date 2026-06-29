# fase00 · 00-15 · Modelo de níveis de leitura (LEVELS)

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/dados/niveis.ts` (`ROTULOS_NIVEL`, `fragmentoDoNivel`); tipo `Nivel` canônico compartilhado. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase00-00-15`
- nó(s) da arquitetura: LEVELS
- tela(s) do brief: —
- classe: mvp

## Objetivo
Definir os quatro níveis de leitura e como o nível do perfil seleciona a variação de texto em toda a narrativa.

## Pré-requisitos / Depende de
- `[[fase00-00-13]]` — os `niveis` declarados no grafo.

## Arquivos afetados
- `src/dados/niveis.ts` (criar) — rótulos e helpers de `Nivel`.

## Nomes & variáveis
- `Nivel` = `"n1"|"n2"|"n3"|"n4"`.
- rótulos: n1 Primeiras palavras · n2 Frases curtas · n3 Pequenos textos · n4 Parágrafos.
- `fragmentoDoNivel(f: Fragmento4, nivel)` → `f[nivel]`.

## Interfaces / contratos
- `Nivel`, `Fragmento4` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Nível do perfil** ([[fase00-00-07]]) escolhe `Fragmento4[nivel]` em abertura/objetos/desfechos.
2. **Compartilhado** por Motor A e Motor B (mesmos níveis).
3. Rótulos exibidos no onboarding ([[fase02-02-04]]).

## Passos de implementação
1. Exportar `Nivel` e o mapa de rótulos (do grafo `niveis`).
2. Helper `fragmentoDoNivel`.
3. (Futuro) gancho de progressão de nível.

## Estados / edge-cases
- nível ausente → impossível (tipo fechado); default n1 na criação de perfil.

## Critérios de aceitação / verificação
- [ ] Mudar `Nivel` muda o texto em todas as telas, mesma estrutura.
- [ ] Rótulos batem com o grafo (`niveis`).

## Relações com outros docs
- Depende de: `[[fase00-00-13]]`
- É consumido por: `[[fase00-00-16]]`, `[[fase02-02-04]]`, `[[fase05-05-02]]`
- Reconcilia / conserta: —
