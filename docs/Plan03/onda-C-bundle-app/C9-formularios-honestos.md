# C9 — Formulários honestos: `disabled` real, `<form>`/Enter, labels visíveis, validação por campo, autofocus

> Status: concluída (2026-09-01 · 0904744)
**Unidade de deploy:** CRU (`LoginFamilia`, `Onboarding`, `Perfis`, `Limites`, `Privacidade`,
`ContaCuidador`, `SaLogin`.dc.html). **Depende de:** nada. **Desbloqueia:** C10.

## Objetivo
Um botão apagado não responde; Enter submete em todo formulário; todo campo tem rótulo visível;
o erro aparece no campo culpado; o cursor já está no primeiro campo.

## Por quê (evidência)
- "Entrar" apagado (`background:#cbb692;opacity:.7;cursor:not-allowed`, `LoginFamilia.dc.html:260-263`)
  **sem `disabled`** e com `onClick="{{ acaoPrimaria }}"` (`:62`) — clicar dispara `_entrar()` com
  campos vazios; idem `Onboarding:207-208` ("Tudo pronto ✓") e `SaLogin:79-82`. `disabled` real:
  **0 ocorrências** em 19 telas adultas/admin (só `CartaoArea` usa `aria-disabled`) (UI-A26).
- `<form>`: **nenhuma** em `src/telas/` nem `src/admin/` — tudo é `<div>` + `<input>` + `<button onClick>`;
  Enter só funciona onde há `onKeyDown` (Senha/Confirme em `LoginFamilia:44,49`; senha em
  `SaLogin:32`); no modo "recuperar" (`mostrarSenha=false`, `:230`) **nenhum campo submete**
  (UI-A27, UI-A28). Gerenciadores de senha e teclado móvel "Ir" perdidos.
- T16 (`ContaCuidador.dc.html:37-38,51-52,65`): "PIN atual", "PIN novo", "Nova senha (6+)",
  "Confirme", e-mail — **só placeholder**; ao digitar o rótulo some; "PIN atual" e "PIN novo" viram
  dois campos de bolinhas iguais (UI-A08). T9/T10/T12 usam `<label>` (`LoginFamilia:38,43`,
  `Onboarding:37,41`, `Perfis:63,66`) — o padrão certo já existe.
- T16 mostra "Trocar a senha" habilitado logo abaixo de "a troca fica sem efeito" (`:57`, `:139`) (UI-A09).
- Validação só pós-clique num `role="status"` único (`Perfis:94-96`, `ContaCuidador:40-70`,
  `LoginFamilia:53-55`); `min="3" max="12"` da idade não é checado — `parseInt(...) || 7`
  (`Perfis:193`) grava 40 (UI-A10).
- `autofocus`: 0 ocorrências (UI-A32).

## Escopo (arquivos)
- `src/telas/LoginFamilia.dc.html:20,38-62,230-263`; `Onboarding.dc.html:37-65,207-208`;
  `Perfis.dc.html:59-96,193`; `Limites.dc.html`; `Privacidade.dc.html`; `ContaCuidador.dc.html:37-70,139`;
  `src/admin/telas/SaLogin.dc.html:32,79-82`.

## Passos
1. Envolver cada bloco de campos em `<form onSubmit="{{ handler }}">` com `event.preventDefault()`
   no handler (conferir como o dc-runtime liga `onSubmit` — se não suportar, `onKeyDown` no
   form-container capturando Enter); botão primário `type="submit"`.
2. `disabled="{{ !valido }}"` real nos botões primários (o dc já usa `disabled="{{ lerDisabled }}"`
   em `Tela4:102` — mesmo mecanismo); manter o visual apagado.
3. T16: `<label>` visível para os 5 campos (padrão de `Onboarding:37-65`); no modo local, o
   cartão de senha inteiro atenuado com o aviso, sem botão primário ativo.
4. Validação por campo: mensagem curta sob o campo culpado (`aria-describedby`), mantendo o
   `role="status"` geral para erros de servidor; idade com `Canon.perfil`/`clampIdade` (ver C4 —
   não remover `IDADE_MIN/MAX` se usados aqui).
5. `autofocus` no primeiro campo de T9/T10/T16/SaLogin (ou foco programático no mount —
   `autofocus` não re-dispara em SPA; usar `ref` + `focus()` no `componentDidMount`).
6. Manter forças: `autocomplete` dinâmico (`LoginFamilia:252`), recuperação neutra (`:188-190`),
   erros em `role="status"`.

## Critérios de aceite
- Botão apagado não dispara handler (clicar no "Entrar" vazio não chama o seam).
- Enter submete em T9 (3 modos), T10, T12, T13, T15, T16, SaLogin.
- Todo `<input>` tem `<label for>` visível; idade fora de 3–12 é recusada com mensagem no campo.
- Primeiro campo focado ao abrir a tela.

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs   # conta/criar/recuperar/T16 (ajustar cliques → submit)
node tests/e2e/run-admin.mjs                  # SaLogin (fill + click "Entrar")
```

## Riscos e cuidados
- Os e2e clicam botões por texto e preenchem por `aria-label` — `<form>` não muda isso, mas
  `disabled` real pode bloquear um clique que o teste fazia com campos vazios de propósito.
- dc-runtime sem fonte (PS-04): confirmar suporte a `onSubmit` num teste rápido antes de
  refatorar as 7 telas; fallback = `onKeyDown` Enter no container.

## Decisões do dono (default)
- Mensagens de validação (default: curtas, no tom da casa).
