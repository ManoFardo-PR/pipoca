---
name: Roteamento raiz (landing) vs app
description: Depois da landing page, a raiz deixou de ser o app; recuperação de senha depende de encaminhamento.
---

# Raiz = landing, app = /app

`server.js` serve `landing.html` em `/` e mapeia `/app` (e `/app/`) para
`index.html` (o entry do app da criança). `admin.html` continua em `/admin.html`.

**Why:** a landing precisa ser a primeira coisa que um visitante vê, mas o app
(login/telas) já morava na raiz. Mover o app para `/app` mantém tudo funcionando
sem tocar no backend nem na config do Supabase.

**How to apply:**
- CTAs/links para o app usam `/app` (e `/app?modo=criar` abre o cadastro direto;
  `LoginFamilia.dc.html` lê `?modo=criar|recuperar` no `componentDidMount`).
- Recuperação de senha: o Supabase manda o link para a **Site URL** (a raiz).
  Como a raiz agora é a landing, `landing.html` tem um script no `<head>` que,
  ao ver `#type=recovery`, faz `location.replace('/app' + hash)` para a tela
  "Escolher nova senha" abrir. NÃO é preciso mexer no backend nem na allowlist
  de Redirect URLs enquanto a Site URL for a raiz.
- Assets do app são relativos (`./support.js`, `./src/...`) e resolvem a partir
  da raiz mesmo servidos em `/app` (sem barra final). Não sirva o app com barra
  final adicional que quebre esse resolve.
