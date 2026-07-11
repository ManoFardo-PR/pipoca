# Forense · "Por que Joana e não Pietro?" — identidade do personagem na geração 2

> 📋 **LEVANTAMENTO FORENSE · 2026-07-11** — incidente da primeira sessão real em
> produção. Este documento é a base factual da correção (PR
> `fix/identidade-personagem`); a regra nova decidida pelo autor vive no código e
> na nota de linhagem do `fase13_integracao_modularizacao/13-01_orquestracao-no-app.md`.

## O incidente

Sessão real na UI final (2026-07-11), perfil da criança **Pietro**, primeira
rodada (vento → vagalume → folha). A história chegou **REALIZADA** — a corrente
compor → edge → realizar → validador → exibição funcionou de ponta a ponta.
**Este é o primeiro 200 do caminho feliz em produção**, e fica registrado como
tal. MAS o texto abriu com **"A Joana pisa na grama fria, sozinha"** — nome E
gênero canônicos no lugar de Pietro.

## Timeline do dado de identidade (elo a elo, com o valor real)

| elo | onde | o que carrega no incidente |
|---|---|---|
| perfil ativo | `state.perfil` (`src/app/estado.js`) | `{nome: "Pietro", genero: undefined, nivel, ...}` |
| disparo da realização | `_dispararRealizacao`, `src/app/estado.js:717` (campo perfil em :730) | `perfil: {nome: "Pietro", genero: undefined, nivel}` — **o nome CHEGA** |
| módulo de geração | `src/core/geracao/geracao.ts:151-155` | `generoValido(undefined) === false` ⇒ `personagem = PERSONAGEM_CANONICO` ⇒ `{nome: "Joana", genero: "f"}` — **o nome é DESCARTADO aqui** |
| compositor | `compor(...)`, chamado em `geracao.ts:159-163` | Pacote com `personagem: {nome: "Joana", genero: "f"}` |
| edge (cliente) | `src/backend/proxy_realizador.ts:53` | Pacote enviado VERBATIM (`body: JSON.stringify({pacote, prompt, ...})`) |
| edge (servidor) | `functions/realizador/index.ts` (`pacoteValido` :143) | valida o shape; **não reescreve** `personagem` |
| validador (edge) | espelho do canônico, parametrizado pelo Pacote | validou "Joana"/f FIELMENTE — porque recebeu "Joana"/f |
| exibição/persistência | app | história da Joana |

## As 5 respostas

### 1. Origem: o nome do perfil chega ao módulo de geração?

**SIM.** O perfil ativo é lido em `_dispararRealizacao`
(`src/app/estado.js:717`), que monta `perfil: { nome: state.perfil.nome,
genero: state.perfil.genero, nivel }` (`estado.js:730`) e chama `G.gerar`. O
`personagem` do Pacote é montado em **`src/core/geracao/geracao.ts:151-155`** —
é ali, e só ali, que "Pietro" vira "Joana".

### 2. A regra como implementada — e de quem é o defeito

Trecho exato (`geracao.ts:150-155`, antes da correção):

```ts
// Perfil completo antes de compor (13-01, regra 5); legado sem gênero ⇒ canônico.
const nome = typeof entrada.perfil.nome === "string" ? entrada.perfil.nome.trim() : "";
const personagem =
  nome !== "" && generoValido(entrada.perfil.genero)
    ? { nome, genero: entrada.perfil.genero }
    : PERSONAGEM_CANONICO;
```

É **"sem gênero ⇒ substitui NOME+GÊNERO pelo canônico"** (`PERSONAGEM_CANONICO
= {nome: "Joana", genero: "f"}`, `geracao.ts:52` antes da correção). Redação
registrada no 13-01 (Estados / edge-cases + decisão fixada aplicada no PR #25):
"Perfil sem gênero (legado) → personagem canônico ('Joana', f) — nunca inferir
do nome".

**A implementação seguiu o doc à risca. O defeito é da REGRA REGISTRADA, não do
código** — com todas as letras: a regra mandava trocar o personagem INTEIRO
quando só o gênero faltava, descartando o nome real que o perfil tem. O código
foi fiel a uma regra ruim.

### 3. O seletor do cadastro persiste gênero de verdade?

**SIM — mas era OPCIONAL, e é por isso que o perfil do incidente não tinha
gênero.** Evidências:

- Onboarding: seletor em `src/telas/Onboarding.dc.html:44-51`; gravação em
  `:126` — `if (this.state.genero) dados.genero = this.state.genero;` (só grava
  quando ESCOLHIDO; o toggle permitia até desmarcar).
- Perfis (edição): carrega em `_abrirForm` (`src/telas/Perfis.dc.html:158`,
  `genero: p.genero || ''`) e grava em `_salvar` (`:193-196`,
  `criarPerfil` → `App.repo.salvarPerfil`). **Um perfil criado ANTES do PR #25
  tem como ganhar gênero pela UI de edição hoje** — Perfis → Editar → seletor →
  Salvar.
- Round-trip do envelope testado: `src/core/persistencia/persistencia.test.ts`
  ("round-trip preserva o genero (aditivo)"; "perfil LEGADO (sem genero) segue
  válido").

A hipótese concorrente ("o seletor não persiste" / "o nome não chega ao
Pacote") está **DESCARTADA**: o seletor persiste quando usado, e o nome chega
(resposta 1). O que houve: perfil com `genero` ausente (criado sem escolher, ou
antes do PR #25) caiu na regra de substituição total.

### 4. O perfil do incidente, pelo código

Com `{nome: "Pietro", genero: undefined}`: `generoValido(undefined)` é `false`
⇒ o operador ternário de `geracao.ts:152-155` escolhe `PERSONAGEM_CANONICO` ⇒
o Pacote sai com `personagem: {nome: "Joana", genero: "f"}` ⇒ prompt, validação
e texto seguem coerentes com "Joana". **Teste que reproduz o incidente**:
`src/core/geracao/geracao.test.ts`, BLOCO 5 ("perfil sem gênero ⇒ Pacote com
personagem canônico") — atualizado neste commit com o assert nomeado do
incidente (Pietro sem gênero ⇒ hoje "Joana"), documentando o bug ANTES do
conserto; o commit da correção flipa o assert (Pietro sem gênero ⇒ história do
PIETRO).

### 5. A edge é inocente?

**SIM.** O cliente keyless envia o Pacote verbatim
(`src/backend/proxy_realizador.ts:53` — `JSON.stringify({pacote, prompt,
...})`); a função edge valida o shape (`pacoteValido`,
`functions/realizador/index.ts:143` — exige `personagem.nome` string e
`genero` "m"/"f") e **não reescreve** o personagem; o validador do servidor usa
o nome/gênero DO PACOTE (`norm(pacote.personagem.nome)` etc.). A edge validou
"Joana" fielmente porque RECEBEU "Joana". Nenhuma reescrita no servidor.

## Veredito de causa-raiz

**Causa-raiz: a regra de default registrada em D-13.3/13-01 ("perfil sem gênero
⇒ personagem canônico") substituía a IDENTIDADE INTEIRA — nome incluído — quando
só a concordância de gênero faltava.** O código implementou a regra fielmente
(PR #25); o seletor de cadastro funcionava mas era opcional, deixando o campo
ausente no perfil real. Correção decidida pelo autor (2026-07-11): nome SEMPRE
do perfil; gênero pedido UMA vez na ativação (persiste); sem resposta,
concordância feminina COM o nome real; gênero obrigatório no Onboarding.
"Joana" permanece apenas como protagonista de conteúdo legado/demonstração.
