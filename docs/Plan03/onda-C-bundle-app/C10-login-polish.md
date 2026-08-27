# C10 — Login (T9): botão Google reconhecível, erro perto do gesto, "Criar conta" visível

**Unidade de deploy:** CRU (`src/telas/LoginFamilia.dc.html`). **Depende de:** C9.
**Desbloqueia:** —.

## Objetivo
O social login parece emprestado do Google (é a razão de existir); a falha do Google aparece
onde o dedo está; o caminho do usuário novo é o mais visível da tela, não o menor.

## Por quê (evidência)
- "Entrar com Google" é um `<span>` circular branco com a letra **G** em Baloo 2 800 `color:#4285F4`
  (`LoginFamilia.dc.html:71-73`), botão `#fffdf7` com borda `#e3d4ba` — paleta do produto, não do
  provedor: parece um botão do Pipoca que menciona o Google (UI-A29).
- Falha do Google: "Login com Google indisponível agora. Entre com e-mail e senha." (`:148-149`)
  cai no `role="status"` acima do botão "Entrar", ~180px acima do botão Google tocado (UI-A30).
- "Criar conta da família" e "Esqueci a senha": texto sublinhado 13,5px, `padding:6px 4px`
  (`:20`), ≈30px de alvo, lado a lado — o caminho do usuário novo é o menor elemento (UI-A31).
- Forças: modos bem nomeados ("Uma conta por casa. Primeira vez? Crie a conta aqui embaixo."),
  recuperação neutra (`:188-190`), erros com cuidado ("Confira o e-mail e a senha, por favor.",
  `:135,163`) em `role="status"` (`:54`), `autocomplete` dinâmico (`:252`), deep-link
  `/app?modo=criar` (`:113-118`).
- O fluxo Google é o nativo do Supabase (`entrarComGoogle`/`capturarRetornoOAuth` em
  `src/backend/adaptadores/auth_supabase.ts`) — não tocar no backend.

## Escopo (arquivos)
- `src/telas/LoginFamilia.dc.html:20,54-59,62-75,113-118,148-149`.

## Passos
1. Botão Google conforme guideline de marca: fundo branco, borda `#747775`, o "G" multicolor em
   SVG inline (~24 linhas; sem fetch externo), texto "Entrar com o Google" em fonte do sistema
   ou Nunito; alvo ≥48px.
2. Segundo `role="status"` logo abaixo do botão Google para a mensagem de indisponibilidade;
   o status do formulário fica para erros de e-mail/senha.
3. "Criar conta da família" vira botão secundário (pílula, ≥48px) abaixo do primário; "Esqueci a
   senha" continua link, mas com alvo ≥44px.
4. Manter todo o resto (copy, neutralidade, autocomplete).

## Critérios de aceite
- Screenshot T9: botão Google reconhecível; "Criar conta" visível como ação; falha do Google
  aparece sob o botão.
- e2e linha-verde ("T9 mostra 'Criar conta da família' e 'Esqueci a senha'", "modo criar conta
  monta") verde.

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs
```

## Riscos e cuidados
- O e2e localiza "Criar conta da família" por texto — manter o texto.
- SVG do G inline: garantir `aria-hidden` e texto do botão acessível.

## Decisões do dono (default)
- Texto do botão (default: "Entrar com o Google").
