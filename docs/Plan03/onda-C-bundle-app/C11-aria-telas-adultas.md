# C11 — ARIA nas telas adultas: hub e painel legíveis, seleção com semântica, foco ao trocar de tela

> Status: pendente

**Unidade de deploy:** CRU (`PainelCuidador`, `PainelEvolucao`, chips/opções das telas adultas,
`Shell.dc.html`). **Depende de:** nada (B3 dá o foco visível). **Desbloqueia:** —.

## Objetivo
Leitor de tela navega o hub e o painel do cuidador com sentido; quem usa teclado/daltonismo
sabe qual criança/período/opção está ativa; ao trocar de tela, o contexto novo é anunciado.

## Por quê (evidência)
- `aria-` = **0** em `PainelCuidador.dc.html` e `PainelEvolucao.dc.html` (UI-A38). Cada item do
  menu é `<button>` começando com emoji sem `aria-hidden` (`PainelCuidador:46`) — anunciado como
  "menina Perfis quem lê nesta casa maior-que" (👧 + texto + `›` de `:51`). Em T8, 5 cartões de
  métrica são `<div>` sem role; SVGs com `role="img"` **sem `aria-label`** (`PainelEvolucao:145,164`).
- Seleção só por cor: chips e opções (`PainelEvolucao:204`, `Regras:176`, `Perfis:258-260`,
  `Onboarding`, `Limites`) são `<button>` com `background:#3f6f9e;color:#fff` — sem `aria-pressed`,
  `role="radio"`/`radiogroup` ou `aria-current` (UI-A39).
- Ordem de Tab = DOM (correto; `tabindex` 0 ocorrências), mas ao trocar de tela
  (`App.setState({tela:n})` via Shell) o foco não vai para o novo `<h1>`; ao abrir o formulário
  inline de T12 (`Perfis:59`) o foco fica no botão que sumiu (UI-A41).
- `role="status" aria-live="polite"` bem usado para erros (`LoginFamilia:54,59`, `ContaCuidador:41,55,69`,
  `Perfis:95`, `Onboarding:74`, `Privacidade:72`, `Limites:63`, `SaLogin:35`) — erros de submissão
  deveriam ser `role="alert"` (UI-A42).
- Padrão-ouro interno: `PortaoParental.dc.html:25,35,43,50` (dialog, aria-hidden, aria-live, labels).

## Escopo (arquivos)
- `src/telas/PainelCuidador.dc.html:40-106`; `PainelEvolucao.dc.html:51-63,145,164,203-205`.
- Chips/opções: `Regras:176,210-212`, `Perfis:258-260`, `Onboarding`, `Limites`, `Privacidade:163-165`
  (ou o `ChipsPerfil` de C8).
- `src/telas/Shell.dc.html:103-119` (foco ao trocar de tela).

## Passos
1. Hub: emojis e `›` com `aria-hidden="true"`; cada item com texto acessível limpo
   ("Perfis — quem lê nesta casa").
2. T8: cartões de métrica como `<section aria-labelledby>` ou `<dl>`; SVGs com `aria-label`
   descritivo ("Minutos por dia nos últimos 7 dias: …") + tabela textual oculta (`sr-only`) com
   os valores de `Canon.agregados` (já calculados).
3. Seleção: chips de perfil/período em `role="radiogroup"` + `role="radio" aria-checked`; opções
   de verificação/desfecho idem; botões de alternância com `aria-pressed`.
4. Shell: no `onTelaChange`, após render, focar o `<h1>` da tela (`tabindex="-1"` + `focus()`), sem
   scroll brusco; em T12, ao abrir o formulário, focar o primeiro campo (C9 cobre o autofocus).
5. Erros de submissão: `role="alert"`; avisos informativos continuam `status`.

## Critérios de aceite
- Leitor de tela no hub: "Perfis, quem lê nesta casa, botão" (sem emoji lido).
- Chips anunciam "Joana, botão de opção, selecionado".
- Trocar de tela anuncia o título novo.
- e2e verdes (os runners não dependem de aria dos hubs).

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs
node tests/e2e/run-admin.mjs
```
Teste manual com NVDA/VoiceOver em T11, T8, T14.

## Riscos e cuidados
- `Shell.dc.html:116` re-renderiza a cada `setState({})` — focar só na troca de tela real
  (comparar `tela` anterior/atual), senão rouba o foco durante a digitação.

## Decisões do dono (default)
- Tabela textual oculta dos gráficos (default: **sim**).
