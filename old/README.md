# old/ — arquivos obsoletos (podem ser descartados)

Movidos para cá em 2026-07-01. Nenhum é referenciado por código vivo, testes, checker ou build —
verificado por grep no repositório inteiro antes da mudança. Podem ser apagados a qualquer momento;
o histórico completo permanece no git.

| Arquivo | O que era | Por que é obsoleto |
|---------|-----------|--------------------|
| `Pipoca.dc.html` | Protótipo original monolítico (ponto de partida do projeto) | Substituído pelo app canônico (`index.html` fino + `src/telas/` via `<dc-import>`); só era citado em comentários/docs como história |
| `index.v2.scaffold.html` | Scaffold de estudo do entry v2 | Serviu de rascunho; o entry real é `index.html`/`app.html` |
| `pipoca-trilha.mmd` | Diagrama antigo de trilha | Superado por `docs/pipoca-fluxo-v2.mermaid` |
| `quintal_grafo.json` | Cópia do grafo v1 em `docs/` | Duplicata byte a byte de `src/dados/quintal_grafo.json` (que segue vivo — o `_initMotor()` e o checker leem de lá) |
| `attached_assets/` | Colagens de prompt/imagens do agente do Replit | Artefatos de sessão; nunca referenciados |

**Não** estão aqui (parecem antigos, mas estão vivos): `app.html` (o e2e canônico navega para `/app.html`),
`src/motores/jogar.ts` (importado por `motor.test.ts`), o legado v1 (`motor_a.ts`, `validador_ordem.ts`,
`historia.ts`, `src/dados/quintal_grafo.json` — coexistência v1/v2 registrada na TRILHA), `roteador.js`/`.ts`,
e os arquivos de deploy do Replit (`.replit`, `server.js`, `scripts/post-merge.sh`).
