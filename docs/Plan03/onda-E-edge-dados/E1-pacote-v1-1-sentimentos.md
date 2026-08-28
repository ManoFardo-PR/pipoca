# E1 — Pacote v1.1: o sentimento e o sentido das fichas viajam para a IA (ML-5)

> Status: pendente

**Unidade de deploy:** BUNDLE app (`src/core/compositor`, `src/core/realizador`).
**Depende de:** Onda A (gate de consentimento). **Desbloqueia:** E3.

## Objetivo
O material autoral já escrito nas fichas — `sensacao.registro` (o sentimento: "encanto
silencioso") e `sensacao.dominante` (o sentido: "visão") — entra no pacote e no prompt, de
forma aditiva, sem quebrar o contrato PASS-only nem o validador.

## Por quê (evidência)
- Fichas: `docs/fichas/objetos.v1.json` (7 objetos) com `sensacao: { dominante, registro, corpo{n1..n4} }`
  (tipos `src/core/fichas/tipos.ts:37-50` `FichaIdentidade`).
- Compositor usa só `descricao` e `sensacao.corpo`: `src/core/compositor/compor.ts:153`
  (`corpo: celula(ficha.sensacao ? ficha.sensacao.corpo : undefined, nivel, …)`), `:141`
  (`selecionarRelacoes`); `grep registro src/core/compositor/` → só em testes.
- Contrato do pacote: `src/core/compositor/pacote.ts:62-88` (`PacoteComposicao`: `cenario{id,
  descricao, voz_do_contador, sensacao_no_personagem}`, `personagem{nome, genero}`, `nivel`,
  `beats[{objeto, papel, descricao, corpo, relacoes[]}]`, `eco`, `restricoes`) — sem campo de
  sentimento/sentido. Cenário já leva `sensacao_no_personagem` (`compor.ts:168-172`).
- Prompt: `src/core/realizador/prompt_template.ts:190-203` (MATERIAL: LUGAR / VOZ DO LUGAR /
  O QUE O LUGAR FAZ SENTIR / PERSONAGEM / ELEMENTOS com O QUE É / CORPO / INTERAÇÃO) e
  `:205-259` (MÉTODO: 3 leis, proibições, ritmo, few-shot por nível, eco, comprimento).
- Validador (`src/core/realizador/validador.ts` e espelho `functions/realizador/index.ts:179-189`
  `pacoteValido`): checa `esquema`, `personagem`, `nivel`, `beats` — campos extras nos beats
  **não** são rejeitados (aditivo é seguro), mas o `esquema` `"pipoca.pacote-composicao.v1"` é
  exigido literalmente — manter o esquema ou atualizar os dois lados juntos (E3).
- Goldens: `src/core/fixtures/{pacote_golden_v1,prompt_golden_v1}.json`; fumaça:
  `tests/fumaca-presenca-v3.ts`; smoke real: `scripts/smoke-realizador.mjs`.

## Escopo (arquivos)
- `src/core/compositor/pacote.ts` (tipo `Beat` + doc), `compor.ts:141-160`.
- `src/core/realizador/prompt_template.ts:190-203` (+ eventualmente uma "Lei" curta sobre usar o
  sentimento sem nomeá-lo).
- `src/core/fixtures/pacote_golden_v1.json`, `prompt_golden_v1.json` (regenerar);
  `src/core/compositor/compositor.test.ts`, `src/core/realizador/realizador.test.ts`.

## Passos
1. `Beat` ganha `sentimento?: string` (= `ficha.sensacao.registro`) e `sentido?: string`
   (= `ficha.sensacao.dominante`); `compor.ts` preenche quando a ficha tem.
2. `prompt_template.ts`: por beat, linha `SENTIMENTO: <registro>` e `SENTIDO: <dominante>`; no
   MÉTODO, uma instrução curta ("use o sentimento como clima, sem escrever a palavra") para não
   induzir o modelo a copiar o rótulo.
3. Manter `esquema` v1 (campos opcionais) — ou subir para `v1.1` **junto** com o espelho da edge
   em E3; default: manter v1 aqui.
4. Regenerar goldens; rodar fumaça e `smoke-realizador` (exige config real — opcional).
5. Medir impacto no comprimento do prompt (tokens) — anotar no PR.

## Critérios de aceite
- `compositor.test`/`realizador.test`/`geracao.test` verdes com os goldens novos.
- Prompt de exemplo contém SENTIMENTO/SENTIDO para os beats do quintal.
- Validador (cliente e edge) aceita o pacote sem mudança (campos extras).

## Verificação
```
bun x tsc --noEmit && npm test
node tests/e2e/run-geracao2-canonico.mjs
node scripts/smoke-realizador.mjs     # opcional, com secrets
```

## Riscos e cuidados
- Enriquecer o envio só faz sentido com o gate da Onda A ativo (dado da criança).
- Mais tokens de prompt = mais custo por chamada; a cota é por chamadas (`uso_ia.chamadas`).

## Decisões do dono (default)
- Subir o esquema para v1.1 agora (default: **não**; aditivo em v1).
