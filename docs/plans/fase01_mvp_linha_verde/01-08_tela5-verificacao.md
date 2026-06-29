# fase01 · 01-08 · Tela 5 · Verificação

## Identidade
- id: `fase01-01-08`
- nó(s) da arquitetura: —
- tela(s) do brief: 5
- classe: mvp

## Objetivo
Confirmar a leitura no portão segundo o modo de verificação, e — no sucesso — commitar o objeto e creditar vaga-lumes.

## Pré-requisitos / Depende de
- `[[fase01-01-06]]` — o portão de leitura.
- `[[fase00-00-11]]` — `Modos.verificacao`.
- `[[fase00-00-10]]` — crédito de vaga-lumes.

## Arquivos afetados
- `src/telas/Tela5Portao.dc.html` (editar) — bloco de sucesso/confirmação.

## Nomes & variáveis
- `verifyIsCuidador`/`verifyIsAuto` (derivados de `Modos.verificacao`).
- `confirmarLeitura(resultado)` — `"sozinho"|"juntos"` (cuidador) ou toque "Eu li!" (auto).
- ao sucesso: `HistoriaState.objetos.push(objetoId)` + `creditarVagalumes(n, objetoId)`.

## Interfaces / contratos
- `Modos`, `Verificacao`, `HistoriaState`, `Economia` ([[_contratos/tipos-core]]); ações em [[_contratos/eventos-acoes]]. Sem motor concreto.

## Regras de negócio
1. **cuidador:** "Leu sozinho 🌱" / "Tentamos juntos 🤝" — os dois contam; tentar já é leitura.
2. **auto:** "Eu li! ✓" (autonomia).
3. **fala:** "Em breve" no MVP → ASR na Fase 2 ([[fase05-05-09]]).
4. **Commit + crédito** só no sucesso (regra de ouro); crédito idempotente por objeto.
5. **Sem prova/punição:** verificação é acolhimento, não exame.

## Passos de implementação
1. Renderizar o bloco conforme `Modos.verificacao`.
2. `confirmarLeitura` → commit em `HistoriaState` + `creditarVagalumes` → `irParaTela(6)`.
3. Para `fala`, exibir placeholder "Em breve".

## Estados / edge-cases
- `fala` sem ASR → desabilitado, sem culpar a criança.
- confirmação repetida → idempotente (não credita 2x).

## Critérios de aceitação / verificação
- [ ] Cada modo mostra o fluxo certo.
- [ ] Sucesso commita o objeto e credita uma vez.
- [ ] Nenhum import de motor concreto.

## Relações com outros docs
- Depende de: `[[fase01-01-06]]`, `[[fase00-00-11]]`, `[[fase00-00-10]]`
- É consumido por: `[[fase01-01-10]]`, `[[fase05-05-09]]`
- Reconcilia / conserta: `[[fase00-00-20]]`
