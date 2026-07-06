# Diagnóstico de integridade — planos faseados do Pipoca

Gerado por `node docs/plans/check_plans.mjs`.

- Docs de sub-passo encontrados: **78**
- Nós no mermaid: **43**
- Checagens: **7/10 PASS**
- Resultado: ❌ **HÁ FALHAS**

| # | Checagem | Status | Falhas |
|---|----------|--------|--------|
| 1 | Cobertura de nós | ✅ PASS | 0 |
| 2 | Cobertura de telas do brief | ✅ PASS | 0 |
| 3 | Linha verde completa | ✅ PASS | 0 |
| 4 | Resolução de referências | ❌ FAIL | 8 |
| 5 | Resolução de nomes | ❌ FAIL | 5 |
| 6 | Ordem de dependências | ❌ FAIL | 1 |
| 7 | Auditoria do seam | ✅ PASS | 0 |
| 8 | Auditoria da reconciliação | ✅ PASS | 0 |
| 9 | Conformidade de template | ✅ PASS | 0 |
| 10 | Consistência dos 2 eixos | ✅ PASS | 0 |

## 1. Cobertura de nós — PASS _(43 nós no mermaid)_
Sem problemas.

## 2. Cobertura de telas do brief — PASS _(telas cobertas: 1,2,3,4,5,6,7,8)_
Sem problemas.

## 3. Linha verde completa — PASS
Sem problemas.

## 4. Resolução de referências — FAIL
- LINK QUEBRADO: fase08-08-00 → [[faseFF-FF-NN]]
- LINK QUEBRADO: fase08-08-00 → [[_contratos/nome]]
- LINK QUEBRADO: fase08-08-00 → [[_contratos/grafo-autoral-v3]]
- LINK QUEBRADO: fase08-08-00 → [[_contratos/grafo-autoral-v3]]
- LINK QUEBRADO: fase08-08-00 → [[../fase08_conteudo/08-00_motor-a-plus-grafo-v3]]
- LINK QUEBRADO: fase08-08-00 → [[grafo-autoral-v3]]
- LINK QUEBRADO: fase08-08-00 → [[_contratos/grafo-autoral-v3]]
- LINK QUEBRADO: fase08-08-00 → [[_contratos/grafo-autoral-v3]]

## 5. Resolução de nomes — FAIL
- SCHEMA DESCONHECIDO: fase08-08-00 → pipoca.grafo-autoral.v3
- SCHEMA DESCONHECIDO: fase08-08-00 → pipoca.grafo-autoral.v3
- SCHEMA DESCONHECIDO: fase08-08-00 → pipoca.grafo-autoral.v3
- SCHEMA DESCONHECIDO: fase08-08-00 → pipoca.grafo-autoral.v3
- SCHEMA DESCONHECIDO: fase08-08-00 → pipoca.grafo-autoral.v3

## 6. Ordem de dependências — FAIL _(142 arestas)_
- DEP NÃO RESOLVE: fase08-08-00 → [[_contratos/grafo-autoral-v3]]

## 7. Auditoria do seam — PASS
Sem problemas.

## 8. Auditoria da reconciliação — PASS
Sem problemas.

## 9. Conformidade de template — PASS
Sem problemas.

## 10. Consistência dos 2 eixos — PASS
Sem problemas.
