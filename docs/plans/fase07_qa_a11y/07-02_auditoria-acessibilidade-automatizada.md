# fase07 · 07-02 · Auditoria de acessibilidade automatizada

## Identidade
- id: `fase07-07-02`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Checar automaticamente os requisitos de acessibilidade do brief em todas as telas.

## Pré-requisitos / Depende de
- `[[fase01-01-12]]` — o painel de `A11yPrefs`.
- `[[fase01-01-13]]` — a aplicação transversal das preferências.

## Arquivos afetados
- `tests/a11y/auditoria.spec.ts` (criar) — checagens automatizadas.

## Nomes & variáveis
- `auditarTela(tela)` — contraste, tamanho de alvo de toque, foco, reduzir-movimento, fonte dislexia, silábico.
- usa `A11yPrefs` em combinações (dislexia+contraste+silábico).

## Interfaces / contratos
- `A11yPrefs` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Contraste ajustável** e suficiente em `contrast` ligado.
2. **Alvos de toque grandes/espaçados** (mãos pequenas).
3. **Reduzir movimento** corta animações/parallax.
4. **Sem vermelho de erro/X** em nenhum estado.

## Passos de implementação
1. Rodar auditor (ex.: axe) por tela e por combinação de `A11yPrefs`.
2. Medir tamanho/espacamento de alvos de toque.
3. Verificar que `reduceMotion` zera animações.

## Estados / edge-cases
- combinação extrema (A++ + dislexia + contraste) → layout não quebra.
- silábico em palavra de 1 sílaba → sem `·`.

## Critérios de aceitação / verificação
- [ ] 0 violações de contraste com `contrast` ligado.
- [ ] Alvos de toque ≥ limite definido.
- [ ] `reduceMotion` elimina animações.

## Relações com outros docs
- Depende de: `[[fase01-01-12]]`, `[[fase01-01-13]]`
- É consumido por: `[[fase07-07-04]]`
- Reconcilia / conserta: —
