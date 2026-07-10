# plans02 · Arquitetura de fichas (fases 10–14)

A geração 2 do plano: o Motor A+ deixa de escrever frases e vira **compositor** (decide e
emite um Pacote de Composição), um **realizador** LLM escreve a prosa (com validador
determinístico), e o conteúdo vira **fichas** reaproveitáveis em três camadas. A geração 1
(`docs/plans/`) permanece intocada e é o fallback em produção.

| Fase | Pasta | Escopo |
|------|-------|--------|
| 10 | `fase10_modelo_de_fichas/` | Contrato `pipoca.fichas.v1`, as 3 camadas de ficha, migração do quintal, lint |
| 11 | `fase11_a_mais_compositor/` | A+ compositor: Pacote de Composição, gramática de decisão reaproveitada, determinismo |
| 12 | `fase12_b1_5_realizador/` | Realizador LLM: prompt, provedor plugável, validador de fidelidade, cascata, calibração do n1 |
| 13 | `fase13_integracao_modularizacao/` | Fronteiras e contratos, orquestração no app, persistência, deploy e segredos |
| 14 | `fase14_aposentar_banco_de_frases/` | Auditoria de dependências, arquivamento em old/, selos e linhagem |

- Roteiro e status: `TRILHA-plans02.md` · Gabarito dos docs: `_TEMPLATE.md`
- Checker: `node docs/plans02/check_plans02.mjs` — valida os docs detalhados (template, links,
  dependências, nomes canônicos, ids); docs só-H1 são listados como esqueleto, fora do gate.
  Relatório gerado: `_diagnostico02.md` (nunca editar à mão).
- Estado: fases 10–12 detalhadas; fases 13–14 ainda esqueleto (detalhamento vem em prompts posteriores).
