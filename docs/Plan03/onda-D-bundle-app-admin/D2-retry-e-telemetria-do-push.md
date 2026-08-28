# D2 — Retry e sinal de falha no push remoto (D-06)

> Status: pendente

**Unidade de deploy:** BUNDLE app + admin (`src/backend/adaptadores/repo_sincronizado.ts`).
**Depende de:** D1. **Desbloqueia:** —.

## Objetivo
Uma escrita remota que falha é tentada de novo e deixa rastro — nunca mais "catch vazio".

## Por quê (evidência)
- D-06 (`docs/auditorias/frente4-mapa-envelope-coluna.md:43-44`): `repo_sincronizado.ts` engole
  falhas de escrita remota em **8 pontos** (`:130-141` para histórias; os demais para perfis,
  saves, telemetria). Uma história pode não chegar ao espelho e ninguém sabe.
- Produção tem 5 histórias e `telemetria` 131 linhas — o espelho é usado; a perda seria
  invisível.
- `src/core/persistencia/chaves.ts:100-107` `gravarItem` devolve `false` na quota (não lança) —
  padrão do repo para "falha sem derrubar".
- Observabilidade já existente no app: `estado.js:932-937` (`_contarOrigem`), log da sessão
  (`:1210-1211`); `Canon.telemetria.criarEvento` (`bridge.ts:281`).

## Escopo (arquivos)
- `src/backend/adaptadores/repo_sincronizado.ts` (os 8 catches).
- Opcional: `src/backend/adaptadores/fila_remota.ts` (nova, pequena) + chave
  `pipoca.fila-remota.v1` em `chaves.ts`.

## Passos
1. Envolver as escritas remotas numa função `tentarRemoto(op, payload)` com retry curto
   (ex.: 2 tentativas com backoff 1s/4s) só para erros transitórios (rede, 5xx, 429); 4xx não
   repete.
2. Se ainda falhar: enfileirar em `localStorage` (`pipoca.fila-remota.v1`: `{op, perfilId, id,
   envelope, tentativas, ultimoErro}`), com teto (ex.: 50 itens) e drenagem no próximo boot /
   `sincronizarInicial` ou ao voltar `online`.
3. Sinal: `console.warn` estruturado + evento de telemetria local (`criarEvento("espelho_falhou", …)`)
   — não bloquear a UI; opcional: badge discreto no painel do cuidador ("2 itens aguardando
   internet").
4. Testes: transporte que falha 1× e sucede; falha permanente → item na fila; drenagem grava e
   limpa.

## Critérios de aceite
- Nenhum `catch {}` vazio em `repo_sincronizado.ts`.
- Teste de retry/fila verde; e2e verdes (backend local não tem remoto — nada muda).

## Verificação
```
bun x tsc --noEmit && npm test
node tests/e2e/run-linha-verde-canonico.mjs
```

## Riscos e cuidados
- Fila em localStorage disputa quota com saves/histórias — respeitar `gravarItem` e o teto.
- Não reenviar itens já mesclados por D1 (dedupe por `id`+`op`).

## Decisões do dono (default)
- Fila persistente (default: **sim**, com teto) vs só retry em memória.
- Badge no painel do cuidador (default: **não** nesta onda).
