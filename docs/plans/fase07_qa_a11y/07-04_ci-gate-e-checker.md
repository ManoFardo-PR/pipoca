# fase07 · 07-04 · Gate de CI e checker

## Identidade
- id: `fase07-07-04`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Amarrar o checker de planos + os testes (e2e e a11y) num gate de CI que bloqueia merge quando algo quebra.

## Pré-requisitos / Depende de
- `[[fase00-00-21]]` — testes do motor.
- `[[fase07-07-01]]` — e2e da linha verde.

## Arquivos afetados
- `.github/workflows/ci.yml` (criar) — pipeline de CI.

## Nomes & variáveis
- jobs: `planos` (`node docs/plans/check_plans.mjs`), `motor` (fixtures), `e2e`, `a11y`.
- `gate` — falha o build se qualquer job falhar (exit ≠ 0).

## Interfaces / contratos
- Executa `check_plans.mjs` (saída exit 0/1) e as suítes de teste.

## Regras de negócio
1. **`check_plans.mjs` é gate:** exit ≠ 0 reprova o PR.
2. **Sem segredos no cliente:** o build verifica que nenhuma chave de IA/backend vaza no bundle ([[fase06-06-05]]).
3. **a11y é bloqueante** nos itens críticos do brief ([[fase07-07-02]]).

## Passos de implementação
1. Job que roda o checker e publica `_diagnostico.md` como artefato.
2. Jobs de motor/e2e/a11y.
3. Regra de proteção de branch exigindo todos verdes.

## Estados / edge-cases
- checker vermelho → PR bloqueado com o relatório anexado.
- flaky e2e → retry limitado, sem mascarar falha real.

## Critérios de aceitação / verificação
- [ ] PR com link/nome quebrado nos planos é reprovado pelo checker.
- [ ] Bundle sem segredos.

## Relações com outros docs
- Depende de: `[[fase00-00-21]]`, `[[fase07-07-01]]`
- É consumido por: —
- Reconcilia / conserta: —
