# C6 — Fluxo do cuidador: pós-PIN cai no hub, "Usar este" responde, menu sem duplicatas

> Status: concluída (2026-09-01 · 32a7e3c)
**Unidade de deploy:** CRU (`src/app/estado.js`, `Perfis.dc.html`, `PainelCuidador.dc.html`).
**Depende de:** nada. **Desbloqueia:** —.

## Objetivo
O gesto mais deliberado do produto (digitar o PIN) desemboca numa ferramenta, não num
relatório vazio; escolher a criança em uso dá retorno imediato; o menu não repete destinos.

## Por quê (evidência)
- `src/app/estado.js:183-187` `_irParaPosPin()`: sem perfis → T10; com perfis → **T8**
  (PainelEvolucao). O comentário assume o trade-off ("o hub fica a um toque"). Resultado real
  (screenshot t08): tela de zeros que se autocontradiz — "Nesta semana ainda não teve leitura",
  MINUTOS 0 ao lado de "1 dia ativo" e "POTE ✨ 3" (UI-A20, UI-A01).
- T8 aparece 2× na navegação (chegada + item "Evolução da leitura" em `PainelCuidador.dc.html:102`)
  e o hub T11 nunca é nomeado — só alcançável por `↩ Painel` (UI-A21).
- "Usar este" (`Perfis.dc.html:239-246`) chama `App.selecionarPerfil(p)` **sem `telaDestino`** e
  não navega; `Perfis` não assina o App (`:154 componentDidMount(){ this._recarregar(); }`), então
  o badge "Em uso ✓" só troca por re-render vindo do Shell (`Shell:116`) — a ~300px do polegar.
  Sem toast, sem scroll, sem confirmação (UI-A23). É o gesto central de uma casa com 3 crianças.
- "➕ Novo perfil" em dois lugares com destinos diferentes: `PainelCuidador:105` → T10 Onboarding
  (fluxo "Tudo pronto ✓"); `Perfis:106` → formulário inline (`_abrirForm(null)`, "Salvar/Cancelar")
  (UI-A22).
- `selecionarPerfil(p, telaDestino)` já aceita destino (`estado.js:452-455`); `aoVoltarParaCrianca`
  (`:538-550`) retoma a tela capturada só se a MESMA criança segue ativa (`:548`), senão T2.

## Escopo (arquivos)
- `src/app/estado.js:183-187`.
- `src/telas/Perfis.dc.html:106,154,239-246`.
- `src/telas/PainelCuidador.dc.html:98-106`.

## Passos
1. `_irParaPosPin`: com perfis → `_irPara(11)` (hub). T8 continua no menu como destino escolhido.
2. Hub: o item "Evolução da leitura" fica; adicionar cabeçalho com o nome da criança em uso e os
   saldos (já renderiza saldos por criança) — sem duplicar T8.
3. "Usar este": `App.selecionarPerfil(p)` + status `role="status"` "Agora é a vez de {nome}" +
   destaque do cartão; `Perfis` passa a assinar o App (`App.subscribe`, padrão de `Regras:116`)
   para o badge trocar na hora. Opcional: botão "Ir para a criança" no mesmo cartão →
   `App.aoVoltarParaCrianca()`.
4. "Novo perfil": um único fluxo (default: o inline de `Perfis`, porque mostra a lista); o botão do
   hub passa a levar a `Perfis` com o formulário aberto (`setState({tela:12, abrirForm:true})`) —
   T10 (Onboarding) fica só para o 1º uso.
5. Manter `SUPERFICIES_ADULTAS` e a guarda intocadas.

## Critérios de aceite
- PIN correto → T11; T8 só por escolha.
- "Usar este" produz status imediato e badge correto sem depender do Shell.
- Só um comportamento para "Novo perfil".
- e2e linha-verde ("PINGATE (1º uso) + KIDMODE + Onboarding cria perfil") e admin verdes —
  ajustar asserts que esperam T8 após o PIN.

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs
node tests/e2e/run-admin.mjs
```
Screenshots T11/T12 após o PIN.

## Riscos e cuidados
- `run-linha-verde-canonico.mjs` (seção M-B) verifica o destino pós-PIN — provável ajuste de
  assert `tela === 8` → `11`.
- Não confundir "Usar este" (perfil ativo do app) com o chip de filtro das telas T8/T13-T15 — C8
  trata os chips.

## Decisões do dono (default)
- Destino pós-PIN: hub (default).
- Fluxo único de "Novo perfil": inline em Perfis (default) vs Onboarding.
