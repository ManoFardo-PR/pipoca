# C8 — T8 coerente no vazio; chips que dizem se filtram ou editam; T15 com escopo visível

> Status: em andamento (2026-09-01)
**Unidade de deploy:** CRU (`PainelEvolucao`, `Limites`, `Regras`, `Privacidade`.dc.html).
**Depende de:** nada. **Desbloqueia:** —.

## Objetivo
O painel de evolução não se contradiz; o mesmo chip azul deixa de significar 4-5 coisas; o
controle de privacidade diz de qual criança é antes de ser tocado.

## Por quê (evidência)
- T8 (`PainelEvolucao.dc.html`): `temDados` só olha minutos/palavras/histórias (`:195`) enquanto
  `diasAtivos` (`:229`) e o pote (`:232`, "sempre atual, não por período") renderizam ao lado —
  "Nesta semana ainda não teve leitura" + "1 dia ativo" + "POTE ✨ 3"; rodapé "A jornada aparece
  aqui assim que a **primeira** história for lida" (`:63`) com pote 3 (UI-A01). Grade `1fr 1fr`
  (`:51`) com 5 cartões (`:224-234`) — o pote fica órfão (UI-A02); "no seu ritmo" no slot numérico
  26px/Baloo 800 (`:55`) (UI-A03). T8 não referencia `coletaTelemetria` — com a coleta desligada
  em T15 a promessa do rodapé nunca se cumpre (UI-A06).
- Chips idênticos (`chipBase`+`chipSel`, string duplicada em `PainelEvolucao:203-205`, `Limites`,
  `Regras:210-212`, `Privacidade:163-165`) significam: T8 = de quem vejo dados; T13 = de quem
  edito limites; T14 = de quem edito regras; T15 = de quem edito a coleta; T12 "Em uso ✓" = 5º
  sentido (UI-A04).
- T15: chips no topo, e o cartão "Guardar o progresso de leitura" sem nome de criança, parecendo
  global; `Privacidade.dc.html:150-157` grava `coletaTelemetria` só do `chipId` — dá para
  desligar a coleta da criança errada (UI-A05).
- Forças: gramática de cabeçalho estável (eyebrow + título 26px + `↩ Painel`); engajamento como
  rótulo (`_rotuloEngajamento`, `:171-176`), nunca %; tom ("tudo bem, o ritmo varia. 🌙").

## Escopo (arquivos)
- `src/telas/PainelEvolucao.dc.html:51-63,195-234`.
- `src/telas/{Limites,Regras,Privacidade}.dc.html` (bloco dos chips + título dos cartões).
- `src/telas/Privacidade.dc.html:150-157`.

## Passos
1. T8: `temDados` considera também `diasAtivos > 0`; no vazio real, um único estado ("Ainda não
   teve leitura nesta semana — o pote continua aqui: ✨ 3"); com coleta desligada, texto próprio
   ("Você desligou o registro para {nome}; o pote segue contando"). Grade: pote em linha própria
   full-width ou 3 colunas; engajamento como rótulo fora do slot numérico.
2. Chips: rótulo de escopo acima do grupo — "Vendo os dados de:" (T8) / "Editando para:" (T13,
   T14, T15) — e `aria-pressed`/`role="radiogroup"` (UI-A39). Uma única implementação: extrair
   para `src/componentes/ChipsPerfil.dc.html` (padrão `dc-import`) com prop `rotulo`.
3. T15: o cartão de coleta ganha o nome no título ("Guardar o progresso de leitura de {nome}") e o
   botão "Exportar JSON" vira "Baixar meus dados" (UI-A07); a lista de 3 perfis abaixo passa a
   ter ação clara ou sai.
4. Manter o rótulo de engajamento e o comentário que documenta a decisão.

## Critérios de aceite
- T8 nunca mostra "ainda não teve leitura" ao lado de "1 dia ativo".
- Todo grupo de chips tem rótulo de escopo e semântica de seleção.
- T15: o nome da criança aparece no controle de coleta.
- e2e linha-verde/admin verdes.

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs
node tests/e2e/run-admin.mjs
```
Screenshots T8 (vazio e com dados), T13, T14, T15.

## Riscos e cuidados
- `agregados` (`Canon.agregados`, `bridge.ts:291`) alimenta T8 — não mudar o cálculo, só a exibição.
- `ChipsPerfil` componentizado muda o DOM que os e2e percorrem por texto — rodar os runners.

## Decisões do dono (default)
- Componentizar os chips (default: **sim**).
