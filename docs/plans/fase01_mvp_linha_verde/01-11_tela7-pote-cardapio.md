# fase01 · 01-11 · Tela 7 · Pote e cardápio

## Identidade
- id: `fase01-01-11`
- nó(s) da arquitetura: T7
- tela(s) do brief: 7
- classe: mvp

## Objetivo
Mostrar o pote de vaga-lumes, a divisão gastar~2/3 · poupar~1/3 e o cardápio de recompensas com o "sonho maior".

## Pré-requisitos / Depende de
- `[[fase00-00-10]]` — `Economia` e a regra 2/3·1/3.

## Arquivos afetados
- `src/telas/Tela7Pote.dc.html` (criar) — pote + cardápio.

## Nomes & variáveis
- `spendSuggest`/`saveSuggest`/`spendPct` (derivados de `Economia`).
- `rewardMenu` — itens (`label`,`icon`,`cost`,`aff`) com `redeem` → `gastarVagalumes(cost)`.
- `dreamSaved`/`dreamCost`/`dreamPct` — o "sonho maior".

## Interfaces / contratos
- `Economia` ([[_contratos/tipos-core]]); ações em [[_contratos/eventos-acoes]]. O cardápio vem de PC_RULES ([[fase02-02-07]]).

## Regras de negócio
1. **2/3 gastar · 1/3 poupar** — sugestão calma, não obrigação.
2. **Gastar é da criança** — sem pressa/cobrança.
3. **Afford:** item caro mostra "Faltam N" (sem punir).
4. **Sonho maior** incentiva poupar um pouco.

## Passos de implementação
1. Renderizar o pote com o saldo e a barra gastar/poupar.
2. Renderizar `rewardMenu` (do cardápio do cuidador) com custos.
3. `redeem` afford → `gastarVagalumes`; senão exibe "Faltam N".
4. Mostrar progresso do sonho maior.

## Estados / edge-cases
- saldo 0 → pote vazio acolhedor.
- item inacessível → "Faltam N", botão calmo.

## Critérios de aceitação / verificação
- [ ] `spendSuggest`+`saveSuggest` = saldo.
- [ ] Resgatar debita corretamente; sem saldo negativo.

## Relações com outros docs
- Depende de: `[[fase00-00-10]]`
- É consumido por: `[[fase02-02-07]]`
- Reconcilia / conserta: —
