# Onda C — Bundle do app: histórias, avatars e superfície do cuidador (grupos G3, G7, G8)

**Fim:** a criança acha e relê suas histórias (G3 / ML-1 onda-UI); avatars amigáveis
definidos uma única vez (G7 / ML-4); o cuidador chega a uma ferramenta, entende o que edita e
submete sem susto (G8).

**Por quê juntas:** G3 e G7 tocam `src/core` + `src/app/bridge.ts` (um único `bun run build:app`
ao final); G8 é CRU mas é pesado e mora nas mesmas telas adultas que C6–C8 abrem — entra na
mesma onda para não reabrir `Perfis`/`Regras`/`PainelEvolucao` duas vezes.

**Unidade de deploy:** BUNDLE app (`pipoca.bundle.js`) + CRU. Sem edge, sem SQL.
**Depende de:** Onda B (tokens de B2 e foco de B3 são reusados; não é bloqueante).

## Subtarefas e ordem

| # | Arquivo | Grupo | O que entrega | Depende de |
|---|---|---|---|---|
| C1 | `C1-core-historias-filtro-e-agrupamento.md` | G3 | helpers puros em `historias.ts` (só completas; agrupar por dia) expostos no bridge | — |
| C2 | `C2-estante-de-historias.md` | G3 | estante digna (tela ou seção), coração ≥48, carrossel no celular, `LeitorHistoria` como dialog | C1 |
| C3 | `C3-cartao-historia-e-exports.md` | G3 | remover `CartaoHistoria.dc.html` órfão e exports mortos de `historias.ts` | C2 |
| C4 | `C4-canon-avatares.md` | G7 | tabela única `{id,nome,cor,emoji}` no core + `Canon.avatares`; poda de `perfil.ts` | — |
| C5 | `C5-render-emoji-e-cenas.md` | G7 | emoji sobre disco nas 5 telas; remover `avatares.ts` + 3 cópias SVG; `cenas` no mesmo padrão | C4 |
| C6 | `C6-fluxo-cuidador-hub-e-usar-este.md` | G8a | pós-PIN → hub; "Usar este" navega/confirma; menu sem duplicatas | — |
| C7 | `C7-cenarios-liberados-ui.md` | G8a | UI de cenários liberados na tela Regras (campo já lido na T3) | — |
| C8 | `C8-t8-coerente-e-chips-com-escopo.md` | G8a | T8 vazio coerente + grade; chips com rótulo de escopo; T15 com escopo visível | — |
| C9 | `C9-formularios-honestos.md` | G8b | `disabled` real; `<form>`/Enter; labels visíveis em T16; validação por campo; autofocus | — |
| C10 | `C10-login-polish.md` | G8b | botão Google reconhecível; erro perto do gesto; "Criar conta" visível | C9 |
| C11 | `C11-aria-telas-adultas.md` | G8b | aria no hub/T8; `aria-pressed` nos chips; foco no título ao trocar de tela; `role=alert` | — |
| C12 | `C12-fechamento-onda-C.md` | — | `build:app`, e2e, screenshots, catálogo atualizado | C1–C11 |

## Definição de pronto da onda
- T3 (ou tela nova) lista só histórias completas, com título inteiro e agrupamento por dia;
  reler abre o `LeitorHistoria` como dialog acessível.
- Avatars definidos em 1 lugar (`src/core/perfil.ts` + `Canon.avatares`), render por emoji nas
  5 superfícies; perfis existentes continuam válidos.
- Pós-PIN cai no hub; "Usar este" navega; cenários liberados editáveis pelo cuidador; nenhum
  botão "desabilitado" clicável; `<form>` em todas as telas com campos.
- `pipoca.bundle.js` no mesmo commit que a última fonte; 175 e2e + 143 unit verdes.
