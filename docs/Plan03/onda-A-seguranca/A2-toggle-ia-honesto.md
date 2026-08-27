# A2 — Toggle de IA honesto (provedorPronto real + aviso antes do gesto)

**Unidade de deploy:** CRU (`.dc.html`) + BUNDLE app se expuser algo novo no bridge.
**Depende de:** A1 (mesmo conceito de "IA efetiva"). **Desbloqueia:** —.

## Objetivo
O cuidador deve ver, **antes** de ligar a IA, se ela está disponível para a casa dele; o
toggle só deve existir como decisão real; e o texto deve falar a língua do cuidador.

## Por quê (evidência)
- `src/telas/Regras.dc.html:239`: `provedorPronto: !!(C && C.ia && C.flags && !C.flags.killSwitchAtivo(...))`.
  `PipocaCanonico` (`src/app/bridge.ts:174-300`) **não tem chave `ia`** (era da Geração 1).
  Logo `provedorPronto` é sempre `false`.
- `src/telas/IaToggle.dc.html:79`: `avisoSemProvedor = ligada && !provedorPronto` — o aviso
  "Sem provedor de IA configurado — na prática a criança continua no Motor A" (`:42`) só
  aparece DEPOIS de ligar (UI-A24). Estado inicial: "Desligado", sem aviso.
- O padrão certo já existe na mesma tela: "Pela voz · Indisponível" (`Regras.dc.html:188`,
  opção atenuada com motivo antes do gesto).
- Jargão: "Motor A"/"Motor B" (`IaToggle.dc.html:29,42`) — UI-A07.
- Visual: `IaToggle` é o único bloco tokenizado (0 hex, 22 `var(--pip-*)`) e por isso destoa
  dos cartões da Regras (raio 22px/padding 24px/sombra; `IaToggle:26` max-width 520 vs 560) — UI-A12.

## Escopo (arquivos)
- `src/telas/Regras.dc.html:236-240` (cálculo de `provedorPronto`, `iaLigada`).
- `src/telas/IaToggle.dc.html` (props :3-10, markup :18-44, `avisoSemProvedor` :79).
- `src/app/bridge.ts:192-204` (`geracao.realizadorRemoto`) — já existe; é a fonte de "pronto".

## Passos
1. `provedorPronto` passa a ser: `!!(C && C.geracao && C.geracao.realizadorRemoto && C.geracao.realizadorRemoto())`
   `&& !killSwitch`. Em backend `local` isso é `false` (honesto: sem edge não há IA).
2. IaToggle com 3 estados visuais: **Indisponível** (atenuado, não interativo, motivo:
   "A IA ainda não está disponível nesta casa" / "…desligada pela plataforma"),
   **Desligada** (toggle ativo) e **Ligada**. Remover o aviso pós-gesto.
3. Copy sem jargão: trocar "Motor A/B" por "histórias do livro da casa" vs "histórias
   escritas na hora"; explicar em 1 linha o que a IA recebe (nome e o que a criança montou) —
   base para consentimento informado (LGPD).
4. Alinhar o cartão ao padrão da Regras: usar os mesmos valores dos irmãos (UI-A12). Como o
   `IaToggle` é o único arquivo tokenizado, a correção certa é ajustar `tokens.css` para
   os valores praticados (isso é B2) — aqui, só garantir que o cartão não pareça "colado".
5. Se o cuidador já tem `iaLigada:true` gravado de antes (toggle antigo), manter — A1 passa a
   respeitá-lo; opcionalmente exibir "ligada por você em …" se houver timestamp (não há hoje;
   não inventar).

## Critérios de aceite
- Em backend local: toggle indisponível com motivo, sem opção de ligar.
- Em backend supabase com edge: toggle funcional; ligar ⇒ A1 permite a chamada.
- Kill-switch ativo ⇒ indisponível com motivo "desligada pela plataforma".
- Nenhuma ocorrência de "Motor A"/"Motor B" no texto visível.

## Verificação
```
node tests/e2e/run-admin.mjs        # flags/kill-switch (ajustar assert de texto se mudou)
node tests/e2e/run-linha-verde-canonico.mjs
```
Screenshot de `Regras` (T14) rolada até o fim nos 3 estados.

## Riscos e cuidados
- Os e2e podem assertar o texto antigo do IaToggle — procurar por "Motor A" nos runners.
- Não mover o bloco de IA para o topo da Regras nesta subtarefa (é UX; fica para C8/8a se o
  dono quiser) — aqui só honestidade.

## Decisões do dono (default)
- Texto final do consentimento (default: a copy proposta no passo 3).
- Manter `iaLigada:true` pré-existente (default: manter).
