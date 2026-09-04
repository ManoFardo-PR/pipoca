# B10 — Admin: barra que cobre as telas (1 linha), rota `/admin`, allowlist de assets

> Status: concluída (2026-09-01 · 1876668)
**Unidade de deploy:** CRU (`src/admin/telas/AdminShell.dc.html`, `server.js`).
**Depende de:** nada. **Desbloqueia:** B11.

## Objetivo
O operador vê o rótulo de contexto e o "Sair" em todas as telas; chega pela rota `/admin`;
o servidor só expõe os assets que a landing usa.

## Por quê (evidência)
- **Overlap:** `src/admin/telas/AdminShell.dc.html:29` usa `padding-top:52px` num container
  `position:absolute`, mas as telas-filhas são `position:absolute;inset:0` (`SaHome:15`,
  `SaTenant:18`, `Conteudo:18`, `ConfigIA:19`, `Seguranca:16`, `IaGlobal:20`) — `inset:0` resolve
  contra o padding box, o padding não empurra nada. Nos screenshots adm2–adm7 o eyebrow
  ("PAINEL DA PLATAFORMA", "TENANTS E PLANOS", …) sai cortado atrás da barra escura e, no hub,
  o botão "Sair" também. Só `SaLogin:18` escapa (centraliza verticalmente) (UI-A13).
- **Rota:** `server.js:79-85` mapeia `/`→`landing.html` e `/app`→`index.html`; `/admin` não existe —
  o admin é `/admin.html` cru (PS-15).
- **Assets:** `server.js:62` libera `attached_assets/` para qualquer imagem; os PNGs órfãos
  `image_1783432997224.png` e `image_1783433051494.png` (81 KB, zero referências) ficam
  servíveis; só `og-pipoca.png` é usado (`landing.html:20,21,29`) (PS-13).

## Escopo (arquivos)
- `src/admin/telas/AdminShell.dc.html:25-36`.
- `server.js:45-62` (allowlist), `:68-88` (roteamento).

## Passos
1. AdminShell: trocar `padding-top` por `top:52px` nas filhas **ou** envolver o slot das telas
   num `<div style="position:absolute;top:52px;left:0;right:0;bottom:0">` — uma linha no Shell,
   sem tocar as 6 telas.
2. `server.js`: `else if (urlPath === "/admin") urlPath = "/admin.html";` (mesmo padrão do `/app`,
   inclusive o redirect de `/admin/`).
3. `server.js:62`: restringir `attached_assets/` a uma lista (`og-pipoca.png`) ou mover o og para
   `public/`; os PNGs órfãos são removidos em D4 (faxina) — aqui só fechar a porta.
4. Conferir que o e2e do admin (`tests/e2e/run-admin.mjs`) abre `/admin.html` — manter o alias.

## Critérios de aceite
- Screenshots adm2–adm7: eyebrow e "Sair" inteiros.
- `curl -I localhost:PORT/admin` → 200 com `admin.html`; `/admin/` → 301 `/admin`.
- `curl -I localhost:PORT/attached_assets/image_1783432997224.png` → 404; `og-pipoca.png` → 200.

## Verificação
```
node tests/e2e/run-admin.mjs
node tests/e2e/run-linha-verde-canonico.mjs   # docroot allowlist segue fechado
```

## Riscos e cuidados
- A allowlist é default-deny desde a auditoria S-01 — alterar só a linha dos assets, sem abrir nada.
- `.replit:33-38` roda `node server.js`; a rota nova vale no deploy no próximo restart.

## Decisões do dono (default)
- Manter `/admin.html` como alias (default: **sim**).
