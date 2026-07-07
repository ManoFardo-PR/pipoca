# old/ — arquivos obsoletos (podem ser descartados)

Nenhum é referenciado por código vivo, testes, checker ou build — verificado por grep no
repositório inteiro antes de cada mudança. Podem ser apagados a qualquer momento; o
histórico completo permanece no git.

## Leva 1 · 2026-07-01/02 (aposentadoria do protótipo)

| Arquivo | O que era | Por que é obsoleto |
|---------|-----------|--------------------|
| `Pipoca.dc.html` | Protótipo original monolítico (ponto de partida do projeto) | Substituído pelo app canônico (`index.html` fino + `src/telas/` via `<dc-import>`); só era citado em comentários/docs como história |
| `index.v2.scaffold.html` | Scaffold de estudo do entry v2 | Serviu de rascunho; o entry real é `index.html` |
| `pipoca-trilha.mmd` | Diagrama antigo de trilha | Superado por `docs/pipoca-fluxo-v2.mermaid` |
| `quintal_grafo.json` | Cópia do grafo v1 em `docs/` | Duplicata byte a byte do grafo v1 (o original vivo da época está agora em `old/dados/quintal_grafo.json`) |
| `attached_assets/` | Colagens de prompt/imagens do agente do Replit | Artefatos de sessão; nunca referenciados |
| `app.html` | Entry alternativo que duplicava `_initMotor`/`_initComposicao` inline | Aposentado em 2026-07-02: o e2e canônico passou a apontar para `/` (index.html + `estado.js` + bundle) |
| `jogar.ts` | Helper `jogar(motor, objetos, modo, nivel)` das fixtures | Único consumidor era `motor.test.ts`, que o inlinou em 2026-07-02 |

## Leva 2 · 2026-07-06 (implantação do Motor A+ v3 — expurgo do v1 e aposentadoria do v2)

Contexto: o grafo ATIVO da linha verde passou a ser `docs/quintal.v3.json`
(esquema `pipoca.grafo-autoral.v3`, leitor em `src/core/composicao.ts`). A auditoria
provou que o motor narrativo v1 (e o Motor B/IA montado sobre ele) era instanciado
mas tinha a saída lida por NENHUMA tela — a "dívida conhecida" da TRILHA. A fiação
morta foi removida de `src/app/estado.js`/`bridge.ts`, a validação do admin migrou
para o v3, e os órfãos confirmados vieram para cá. Commit de origem: o vigente em
main na data (pós `542b166`).

| Arquivo | O que era | Por que foi arquivado |
|---------|-----------|------------------------|
| `motores/motor_a.ts` | `MotorGrafoAutoral` — motor narrativo v1 (fase00-00-17) | Saída não lida por nenhuma tela desde a composição v2/v3; órfão após a remoção da fiação |
| `motores/motor_ia.ts` | `MotorIA` — Motor B (fase05) sobre o grafo v1 | Idem; a IA em runtime volta como realizador atrás do `montar()` v3 (jardim) |
| `motores/contrato.ts` | Re-export do contrato `MotorNarrativa` | Só a fábrica/motores o importavam; os tipos seguem vivos em `src/core/grafo/tipos.ts` |
| `motores/validador_ordem.ts` | `ValidadorOrdem` da tira (fase00-00-18, já SUPERSEDED) | Órfão; `src/core/historia.ts` mantém o shape estrutural inline |
| `motores/fabrica.ts` | `criarMotor` — fábrica A/B (fase00-00-19) | Únicos chamadores (estado.js, admin validar_grafo, parciais.test) migrados/limpos |
| `motores/motor.test.ts` | Testes do motor v1 (44 asserts, fixtures fase00-00-21) | Saiu da cadeia `test` junto com o motor |
| `core/grafo/validarGrafo.ts` | Validador do schema v1 | Admin migrou para lint v3 + fumaça de montagem; const `ESQUEMA_GRAFO` inlinada aqui |
| `dados/quintal_grafo.json` | O grafo v1 do Quintal (schema `pipoca.grafo-autoral.v1`) | Nada mais o fetcha/importa; linhagem preservada em `_contratos/schemas-json` |
| `dados/quintal.v2.json` | O grafo v2 do Quintal (composição autoral v2) | Substituído pelo v3 como grafo ativo; conteúdo integral preservado (v2 nunca é mutado) e embutido na fixture de compat `src/core/fixtures/composicao_golden_v2.json` |
| `tests-e2e/run-linha-verde.mjs` | Runner e2e legado (100% seam v1) | `test:e2e` aponta para o canônico; já era "candidato a old/" na TRILHA |
| `tests-e2e/linha-verde.spec.ts` | Gêmeo do legado para @playwright/test | Mesmos asserts v1; sem CI que o consumisse |

**Não** estão aqui (parecem antigos, mas estão vivos): `src/core/grafo/tipos.ts`
(vocabulário `Nivel`/`Trecho`/`MotorNarrativa` usado por core/ia/backend),
`src/core/historia.ts`/`src/core/estado.ts` (ops da tira como registro vivo — ver selo
SUPERSEDED de fase00-00-20), `src/ia/*` (guardrails/orquestrador/simulado/adaptadores —
fase05/06, prontos para o realizador v3), `roteador.js`/`.ts`, e os arquivos de deploy
(`.replit`, `server.js`, `scripts/post-merge.sh`).
