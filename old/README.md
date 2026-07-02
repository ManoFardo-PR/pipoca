# old/ — arquivos obsoletos (podem ser descartados)

Movidos para cá em 2026-07-01. Nenhum é referenciado por código vivo, testes, checker ou build —
verificado por grep no repositório inteiro antes da mudança. Podem ser apagados a qualquer momento;
o histórico completo permanece no git.

| Arquivo | O que era | Por que é obsoleto |
|---------|-----------|--------------------|
| `Pipoca.dc.html` | Protótipo original monolítico (ponto de partida do projeto) | Substituído pelo app canônico (`index.html` fino + `src/telas/` via `<dc-import>`); só era citado em comentários/docs como história |
| `index.v2.scaffold.html` | Scaffold de estudo do entry v2 | Serviu de rascunho; o entry real é `index.html` |
| `pipoca-trilha.mmd` | Diagrama antigo de trilha | Superado por `docs/pipoca-fluxo-v2.mermaid` |
| `quintal_grafo.json` | Cópia do grafo v1 em `docs/` | Duplicata byte a byte de `src/dados/quintal_grafo.json` (que segue vivo — o `_initMotor()` e o checker leem de lá) |
| `attached_assets/` | Colagens de prompt/imagens do agente do Replit | Artefatos de sessão; nunca referenciados |
| `app.html` | Entry alternativo que duplicava `_initMotor`/`_initComposicao` inline | Aposentado em 2026-07-02: o e2e canônico passou a apontar para `/` (index.html + `estado.js` + bundle); contra `/app.html` o runner já quebrava (shell esvaziava após o loop T2–T7) |
| `jogar.ts` | Helper `jogar(motor, objetos, modo, nivel)` das fixtures | Único consumidor era `src/motores/motor.test.ts`, que o inlinou em 2026-07-02 |

**Não** estão aqui (parecem antigos, mas estão vivos): o legado v1 (`motor_a.ts`, `validador_ordem.ts`,
`historia.ts`, `src/dados/quintal_grafo.json` — coexistência v1/v2 registrada na TRILHA; fábrica, save
e checker dependem deles), `roteador.js`/`.ts`, e os arquivos de deploy do Replit (`.replit`,
`server.js`, `scripts/post-merge.sh`).
