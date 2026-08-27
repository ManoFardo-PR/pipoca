# B11 — Admin: controles que se explicam, navegação mínima, vocabulário e estados de erro

**Unidade de deploy:** CRU (`src/admin/**/*.dc.html`). **Depende de:** B10. **Desbloqueia:** —.

## Objetivo
O operador entende qual controle usar, navega entre áreas sem voltar ao hub a cada passo,
lê textos de produto (não de repositório) e vê o fracasso desenhado onde ele acontece.

## Por quê (evidência)
- **Dois controles por flag:** em `Seguranca.dc.html:35` (`role="switch"`) e `:38` (botão
  "Kill-switch"); para flag já desligada os dois fazem o mesmo (`definirFlag(flags,nome,!ligada)`
  vs `killSwitch(flags,nome)`, `:95-96`); o botão vermelho não pede confirmação (UI-A14).
- **Navegação:** nenhuma tela admin tem lateral/breadcrumb/tabs — só `↩ Painel` (`SaTenant:24`
  etc.); "criar tenant → configurar IA dele → conferir flags" custa 6 navegações (UI-A15);
  `ConfigIA`/`SaTenant` entregam ~85% de vazio, `Seguranca`/`IaGlobal` empilham 4–6 blocos densos.
- **Vocabulário cru:** "tenant" (adm2/3/5, inclusive no placeholder "Nome (escola/família)"),
  "grafos autorais: validar, versionar, publicar", "kill-switches e defaults seguros", "default
  seguro", "Freemium", "write-only", "fallback global", "schema" (UI-A16); nota de roadmap no login:
  "MVP local — autenticação real com servidor chega na **fase 06**" (`SaLogin.dc.html:41`) (UI-A17);
  "Operador: `adm_3ccce430`" em monospace sem nome/e-mail (`SaHome:25`) (UI-A18).
- **Zero estado de erro** em `Conteudo`, `ConfigIA`, `IaGlobal` (só vazio + aviso): não há padrão
  para "validação do grafo falhou com 3 erros" nem "teste de conexão recusado" — e o botão
  "Testar conexão" já existe atenuado (UI-A19).
- Forças a manter: separação visual/verbal da Plataforma, faixa "área do operador — não é a
  tela da criança" (`AdminShell:25`), estados vazios acionáveis ("crie um em 'Contas, tenants e
  planos'"), fail-closed atenuado do `CartaoArea` (`:36-45`), honestidade de `IaGlobal`
  ("nada aqui finge salvar").

## Escopo (arquivos)
- `src/admin/Seguranca.dc.html:30-40,90-100`; `src/admin/telas/{SaLogin:41, SaHome:25, SaTenant}.dc.html`;
  `src/admin/{Conteudo,ConfigIA,IaGlobal}.dc.html`; `src/admin/telas/AdminShell.dc.html` (nav).

## Passos
1. Segurança: um controle por flag — switch para ligar/desligar; "Kill-switch" vira ação
   destacada **com confirmação em 2 toques in-place** (padrão de `Perfis:249`/`Privacidade:184`)
   e explicação de 1 linha do que difere (derruba mesmo com o cuidador autorizando).
2. AdminShell: barra de áreas (os 7 itens de `ROTAS_ADMIN`, `src/admin/rotasAdmin.ts:29-45`) como
   tabs/chips no topo, com a atual marcada por `aria-current="page"`; `↩ Painel` continua.
3. Glossário de UI: "tenant" → "conta (escola/família)"; "kill-switch" → "desligar para todos";
   "default seguro" → "fica sem IA até configurar"; "write-only" → "só gravar (não mostra)";
   "schema" → "formato". Remover "fase 06" do login (`SaLogin:41`) — descrever só o comportamento.
4. Operador identificado por e-mail/nome quando houver (`state.sessao`), hash só como detalhe.
5. Estado de erro padrão (cartão terracota com título, lista de erros e ação) em Conteudo
   (validação do grafo — os lints já devolvem mensagens: `src/admin/validar_grafo.ts`), ConfigIA e
   IaGlobal ("Testar conexão" com resultado ok/erro).
6. Densidade: ConfigIA e SaTenant ganham um resumo no topo (o que está configurado) para não
   nascerem vazias.

## Critérios de aceite
- Cada flag tem 1 switch + 1 ação "desligar para todos" com confirmação.
- De qualquer área, 1 toque para qualquer outra área.
- `grep -in "tenant\b\|fase 06\|write-only\|kill-switch" src/admin/**/*.dc.html` só em código, não
  em texto visível (ou reduzido a um glossário).
- Validação de grafo com JSON inválido mostra o cartão de erro com a mensagem do lint.

## Verificação
```
node tests/e2e/run-admin.mjs     # "kill-switch derruba a IA…" — ajustar clique para a confirmação
```
Screenshots adm1–adm7.

## Riscos e cuidados
- O e2e do admin clica o kill-switch — a confirmação em 2 toques exige atualizar o runner.
- Não mudar `ROTAS_ADMIN`/guarda (`rotasAdmin.ts:64-66`) — só apresentação.

## Decisões do dono (default)
- Glossário final (default: o do passo 3); tabs no topo vs lateral (default: **tabs no topo**).
