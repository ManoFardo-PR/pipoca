# fase00 · 00-10 · Economia de vaga-lumes (ECON)

## Identidade
- id: `fase00-00-10`
- nó(s) da arquitetura: ECON
- tela(s) do brief: —
- classe: mvp

## Objetivo
Modelar os vaga-lumes como registro visível do esforço de leitura (token colecionável-narrativo), com a divisão gastar~2/3 · poupar~1/3.

## Pré-requisitos / Depende de
- `[[fase00-00-06]]` — `EstadoApp.economia`.

## Arquivos afetados
- `src/core/economia.ts` (criar) — `Economia` + transações.

## Nomes & variáveis
- `Economia` — `{ vagalumes, poupado }`.
- `creditarVagalumes(n)` (idempotente por objeto commitado), `gastarVagalumes(n)`.
- derivados: `spendSuggest = round(total*2/3)`, `saveSuggest = total - spendSuggest`, `spendPct`.
- mapeia `fireflies`/`saved`/`spendPct`/`dreamSaved` do protótipo.

## Interfaces / contratos
- `Economia` ([[_contratos/tipos-core]]); ações em [[_contratos/eventos-acoes]].

## Regras de negócio
1. **2/3 gastar · 1/3 poupar** — sugestão calma, não obrigação.
2. **Idempotência:** um objeto commitado credita uma única vez (flag `awarded`, ver [[fase01-01-10]]).
3. **Não-cassino:** sem variabilidade manipulativa, sem dark patterns.
4. **Token narrativo:** o vaga-lume conta história, não é ficha de obediência.

## Passos de implementação
1. Definir `Economia` e `economiaInicial`.
2. `creditarVagalumes(n, objetoId)` com guarda de idempotência.
3. `gastarVagalumes(n)` com piso 0; calcular `spendSuggest`/`saveSuggest`.
4. Persistir via SAVE ([[fase00-00-12]]).

## Estados / edge-cases
- saldo insuficiente → recompensa mostra "faltam N" (sem punir) — [[fase01-01-11]].
- crédito duplicado → ignorado (idempotência).

## Critérios de aceitação / verificação
- [ ] `spendSuggest`+`saveSuggest` = total; proporção ~2/3·1/3.
- [ ] Reler o mesmo objeto não credita de novo.

## Relações com outros docs
- Depende de: `[[fase00-00-06]]`
- É consumido por: `[[fase01-01-10]]`, `[[fase01-01-11]]`, `[[fase02-02-07]]`
- Reconcilia / conserta: —
