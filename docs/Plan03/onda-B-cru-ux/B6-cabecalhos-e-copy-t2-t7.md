# B6 — Uma gramática de cabeçalho para T2–T7, alvos ≥48px, copy da faixa etária, T2 rola no celular

> Status: pendente

**Unidade de deploy:** CRU (`src/telas/Tela2..7*.dc.html`, `Shell.dc.html`).
**Depende de:** B5 (define quais botões existem no cabeçalho). **Desbloqueia:** —.

## Objetivo
As seis telas da criança compartilham uma única barra superior (mesma altura, mesmos alvos,
mesma ordem), todos os alvos de navegação/ajuste têm ≥48px, a copy do cabeçalho fala a língua
da criança e concorda com o gênero, e a T2 não bloqueia no celular.

## Por quê (evidência)
- **Quatro gramáticas de cabeçalho em seis telas** (UI-C10): `Tela3:13` e `Tela7:20` = 62px com
  avatar+nome à esquerda e sem "voltar"; `Tela4:23` e `Tela5:22` = 58px com "←" e sem avatar;
  T6 sem barra; ⚙ varia 42→40px.
- Alvos medidos (sonda): ← e ⚙ em T4/T5 = 40×40 (UI-C16); ⚙ em T3/T7 = 42×42 (UI-C17);
  "⚙ Sou o cuidador" na T2 = 157×42 (UI-C18). Referência: mínimo criança ≥48px, ideal 5–8 anos ≥75px.
- Copy: "Leitor em ascensão ✨" hard-coded em `Tela3SelecaoCenario.dc.html:18` — vocabulário de
  ensino médio e sem concordância com `perfil.genero` (a Joana vê "Leitor") (UI-C41). Três
  linguagens diferentes de "carregando": `Tela2:23` ("Carregando…" 26px opacidade .6),
  `Tela4:37` ("Preparando o quintal…"), `Tela5:35-36` (bolinha + texto) (UI-C11).
- T2 no celular (390×844): título "Quem vai ler hoje?" cortado ao meio, marca "Pipoca" sobreposta,
  "⚙ Sou o cuidador" fora da tela — `Tela2:15` (`position:absolute;inset:0;overflow:hidden`) +
  `:20` (`justify-content:center`) com 3 avatares de 140px + `gap:34px`; `Shell.dc.html:16`
  (`position:fixed;overflow:hidden`) e `:21` (marca em `top:18px;left:24px` sem reservar espaço).
  Com 3+ perfis, o adulto não alcança os ajustes (UI-C53 — bloqueio duro).

## Escopo (arquivos)
- `src/telas/Tela2EntradaCrianca.dc.html:15-23,49`, `Tela3SelecaoCenario.dc.html:13-35`,
  `Tela4Heroi.dc.html:23-31`, `Tela5Portao.dc.html:22-28`, `Tela6Recompensa.dc.html:22-30`,
  `Tela7PoteCardapio.dc.html:20-30`; `src/telas/Shell.dc.html:16-21`.
- Opcional: novo componente `src/componentes/BarraCrianca.dc.html` (padrão `dc-import` como
  `Botao`/`ChipObjeto`) — reduz 6 cabeçalhos a 1.

## Passos
1. Definir a barra: altura 64px; esquerda = avatar+nome (T3/T7) **ou** ← (T4/T5/T6→T3 quando
   fizer sentido); direita = saldo 🟡 (B5) + ⚙; todos com `min-width/min-height:48px`.
   Se criar `BarraCrianca.dc.html`, props: `voltar`, `mostrarAvatar`, `mostrarSaldo`.
2. Copy do cabeçalho da T3: trocar "Leitor em ascensão" por algo da faixa ("Que bom te ver!" /
   "Pronta para ler?" com concordância) — usar `perfil.genero` (`m|f`, `GENERO_CONCORDANCIA_PADRAO`
   em `bridge.ts:195`) e um par de strings.
3. Unificar "carregando": um único marcador (bolinha + frase acolhedora) reusado em T2/T4/T5.
4. T2 no celular: permitir rolagem (`overflow:auto` no container da T2, não no Shell); reservar
   espaço para a marca; avatares em grade `auto-fit, minmax(120px,1fr)`; garantir que
   "⚙ Sou o cuidador" fique visível sem rolar (fixo no rodapé ou no topo).
5. Manter os MARCADORES dos e2e (`run-linha-verde-canonico.mjs:77-84`: "ler hoje|Oi!|Carregando",
   "história acontece hoje|Favorito de hoje|Quintal", "história até agora|Ateliê|Quintal",
   "luzinha|Uma|palavra|confirmar", "Você leu", "agrado|dividir o que você") — se a copy mudar,
   atualizar o runner no mesmo PR.

## Critérios de aceite
- Sonda de alvos em T2–T7: nenhum alvo de navegação/ajuste < 48px.
- Screenshot 390×844 da T2 com 3 perfis: título inteiro, marca sem sobreposição, "Sou o cuidador"
  visível.
- "Leitor em ascensão" não existe mais; saudação concorda com o gênero.
- Uma única implementação de "carregando".

## Verificação
```
node tests/e2e/run-linha-verde-canonico.mjs
node tests/e2e/run-reordenar-miolo.mjs
```
Screenshots 1280×800 + 390×844 de T2–T7 (harness em `00-onda-B.md`).

## Riscos e cuidados
- Componentizar a barra muda a estrutura DOM que os e2e percorrem por texto — baixo risco, mas
  rodar os 4 runners.
- Não mexer na altura do palco da T4/T5 além do que a barra exige (B7/B8 cuidam do miolo).

## Decisões do dono (default)
- Criar `BarraCrianca.dc.html` (default: **sim**, elimina 6 cópias) ou só alinhar as 6 barras.
- Texto da saudação (default: "Oi, {nome}! Vamos ler?").
