# fase00 · 00-21 · Demo e testes do motor

## Identidade
- id: `fase00-00-21`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Promover o `jogar()` do motor a um harness de teste com fixtures reutilizáveis pelos critérios de aceitação de outros docs.

## Pré-requisitos / Depende de
- `[[fase00-00-17]]` — Motor A.
- `[[fase00-00-19]]` — a fábrica que monta `{ motor, ordem }`.

## Arquivos afetados
- `src/motores/motor.test.ts` (criar) — fixtures e asserts.
- `src/motores/jogar.ts` (criar) — `jogar(motor, objetos, modo, nivel)` (do `motor_a.ts`).

## Nomes & variáveis
- Fixture A (convergente): `["vagalume","frasco","vento"]`, `convergente`, `n3`.
- Fixture B (aberto): `["vagalume","gato","coruja"]`, `aberto`, `n3`.
- `jogar(...)` — simula abertura → objetos → desfecho.

## Interfaces / contratos
- `MotorNarrativa`, `Trecho`, `ModoDesfecho`, `Nivel` ([[_contratos/tipos-core]]).

## Regras de negócio
1. As duas trajetórias divergem em texto e desfecho (mesma cena).
2. Avaliador de regras (`tem:`/`nao_tem:`) coberto.
3. Degradação `aberto`→`convergente` coberta.

## Passos de implementação
1. Portar `jogar()` de `motor_a.ts` para `src/motores/jogar.ts`.
2. Escrever fixtures A e B e comparar o texto produzido.
3. Exportar as fixtures para reuso ("fixtures de [[fase00-00-21]]").

## Estados / edge-cases
- objeto sem ramo aberto → cai no convergente (assert).
- objeto inexistente → `Trecho` vazio (assert).

## Critérios de aceitação / verificação
- [ ] Fixture A produz o desfecho convergente esperado.
- [ ] Fixture B produz o ramo aberto de `coruja`.
- [ ] Testes rodam sem IA/ASR.

## Relações com outros docs
- Depende de: `[[fase00-00-17]]`, `[[fase00-00-19]]`
- É consumido por: `[[fase00-00-16]]`, `[[fase01-01-06]]`, `[[fase04-04-04]]`
- Reconcilia / conserta: —
