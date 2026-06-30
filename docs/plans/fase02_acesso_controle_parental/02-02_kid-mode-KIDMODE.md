# fase02 · 02-02 · Modo criança

> 🟡 **STATUS · 2026-06-29 · PARCIAL** — Núcleo `src/core/modoApp.ts` (`ModoApp`, guarda `aplicarGuarda`/`podeNavegar`, transições `aoPassarPortao`→cuidador / `aoVoltarParaCrianca`→criança), exposto no bridge (`PipocaCanonico.modoApp`) e testado (`parciais.test.ts`). Falta o wiring no roteador/T2 (telas — a cargo do app). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase02-02-02`
- nó(s) da arquitetura: KIDMODE
- tela(s) do brief: —
- classe: mvp

## Objetivo
Estabelecer o Modo criança como o estado padrão do app ao abrir: esconde toda superfície adulta, entra direto na T2 e só pode ser deixado atravessando o Portão parental (PINGATE).

## Pré-requisitos / Depende de
- `[[fase02-02-01]]` (Login da família / HH_LOGIN)

## Arquivos afetados
- `src/core/modoApp.ts` (criar — flag global de modo: criança vs. cuidador)
- `src/core/roteador.ts` (editar — KIDMODE é o destino padrão pós-login; guarda as rotas adultas)
- `src/telas/Tela2Entrada.dc.html` (editar — é a tela onde o Modo criança "aterrissa"; expõe a porta de saída "Sou o cuidador"). A tela em si é OWNada por [[fase01-01-01]]; aqui só conectamos a fronteira.

## Nomes & variáveis
- `ModoApp` — tipo local desta fase (não em [[_contratos/tipos-core]]): `type ModoApp = "crianca" | "cuidador"`. Default ao abrir: `"crianca"`.
- `modoAtual: ModoApp` — estado global lido pelo roteador para decidir quais rotas estão acessíveis.
- `superficiesAdultas: number[]` — lista de rotas/telas adultas que o Modo criança bloqueia (Onboarding/PC_*; o Painel do Super Admin é outra trilha — SA_*).
- Ação canônica para sair do Modo criança: `abrirPortaoParental()` ([[_contratos/eventos-acoes]]), que dispara o PINGATE. Reaproveitada do protótipo: o botão "⚙ Sou o cuidador" da Tela 2 (no protótipo era `backToOnboarding`, um atalho direto; agora passa pelo PIN).
- Navegação interna: `irParaTela(2)` ([[_contratos/eventos-acoes]]) para garantir T2 como aterrissagem.

## Interfaces / contratos
- `EstadoApp` ([[_contratos/tipos-core]]) — o Modo criança opera sobre o estado raiz; `ModoApp` é um envelope de visibilidade, não substitui `EstadoApp.tela`.
- `Modos` ([[_contratos/tipos-core]]) — NÃO confundir: `Modos` (Palco/Ateliê, desfecho, verificação, iaLigada) é configuração de narrativa governada pelo Controle Parental; `ModoApp` é a fronteira criança/cuidador.
- NÃO toca `MotorNarrativa`/`MotorGrafoAutoral`/`MotorIA`/`ValidadorOrdem`.

## Regras de negócio
1. Modo criança é o padrão ao abrir o app (após HH_LOGIN ou com sessão de conta válida). Nunca abrir direto numa superfície adulta.
2. No Modo criança, toda superfície adulta (Onboarding e telas PC_*) está escondida e inacessível por navegação direta.
3. Fronteira única de saída: só se sai do Modo criança via PINGATE ([[fase02-02-03]]). Não há outra rota (sem URL secreta, sem gesto escondido que pule o PIN).
4. O Modo criança entra direto na T2 (a entrada da criança). A aterrissagem é sempre a T2.
5. A porta de saída ("Sou o cuidador", na T2) é discreta mas alcançável pelo adulto — não escondida da criança a ponto de o cuidador não achar, mas sem ser um chamariz.
6. Conteúdo seguro para crianças: nada de telas adultas vazando no Modo criança nem em transições.

## Passos de implementação
1. Criar `modoApp.ts` com `ModoApp` e o estado `modoAtual` (default `"crianca"`).
2. No `roteador.ts`: ao montar, se autenticado, `modoAtual = "crianca"` e `irParaTela(2)`.
3. Implementar o guarda de rotas: se `modoAtual === "crianca"` e a rota pedida ∈ `superficiesAdultas` → bloquear (redirecionar à T2). A única forma de `modoAtual` virar `"cuidador"` é o sucesso do PINGATE.
4. Conectar a ação `abrirPortaoParental()` ao botão "Sou o cuidador" da T2 (ver [[fase01-01-01]]); ela NÃO troca o modo sozinha — apenas abre o PINGATE.
5. Garantir, no PINGATE ([[fase02-02-03]]), que só após senha correta `modoAtual` passe a `"cuidador"` e a navegação a PC_HOME seja liberada.

## Estados / edge-cases
- Abertura limpa: vai a T2 em Modo criança.
- Tentativa de acesso a rota adulta em Modo criança: redirecionar à T2 sem mensagem assustadora.
- "Reduzir movimento" ativo: a transição para T2 respeita `A11yPrefs.reduceMotion` ([[_contratos/tipos-core]]) — sem animação brusca.
- Voltar do Controle Parental: ao "concluir/entrar no Pipoca", `modoAtual` volta a `"crianca"` e o app retorna à T2.
- Recarregar a página no meio de uso adulto: por segurança, reabrir em Modo criança (o PIN protege a reentrada).

## Critérios de aceitação / verificação
- [ ] Ao abrir o app autenticado, o estado é Modo criança e a tela é T2 (KIDMODE → T2).
- [ ] Nenhuma rota PC_* nem Onboarding é alcançável sem passar pelo PINGATE.
- [ ] `abrirPortaoParental()` dispara PINGATE e não muda `modoAtual` por si só.
- [ ] Recarregar a página reabre em Modo criança.
- [ ] Transições respeitam `reduceMotion`.
- [ ] Nenhuma referência a motor (lei do seam, [[_contratos/lei-do-contrato]]).

## Relações com outros docs
- Depende de: `[[fase02-02-01]]`
- É consumido por: `[[fase02-02-03]]` (PINGATE é a única saída), `[[fase01-01-01]]` (T2 é a aterrissagem e expõe "Sou o cuidador")
- Reconcilia / conserta: —
