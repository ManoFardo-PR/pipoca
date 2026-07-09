# fase11 · 11-03 · Testes de determinismo do Pacote

## Identidade
- id: `fase11-11-03`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Planejar a suíte de testes do compositor: determinismo byte a byte do Pacote, ordem sagrada dos beats, teto/precedência de relações, papéis, falhas explícitas e golden.

## Pré-requisitos / Depende de
- `[[fase11-11-00]]` — o contrato testado (e o exemplo que vira golden).
- `[[fase11-11-01]]` — o `compor` sob teste.
- `[[fase11-11-02]]` — a gramática (teto, especificidade, ecos) coberta pelos blocos 3 e 6.

## Arquivos afetados
PLANEJADOS (implementação posterior):
- `src/core/compositor/compositor.test.ts` — a suíte (proposta de caminho).
- `src/core/fixtures/pacote_golden_v1.json` — o Pacote-exemplo de [[fase11-11-00]] congelado.
- `package.json` — encadear a suíte no script `test` (padrão da casa, ver abaixo).

## Nomes & variáveis
- `compor`, `PacoteComposicao`, `beats`, `papel` — reaproveitados de [[fase11-11-00]] e [[fase11-11-01]].
- `assert` / `assertEqual` — os helpers manuais do padrão da casa (linhagem: `src/core/composicao.test.ts:33-41`), com contadores `passou`/`falhou` e linha `Total:` final (`src/core/composicao.test.ts:548`).
- Fixtures de fichas de teste: catálogo mínimo em memória (não os arquivos reais de `docs/fichas/`), para os blocos de falha e precedência.

## Interfaces / contratos
O padrão da casa, VERIFICADO no repo:
- Suítes unitárias = arquivos `.test.ts` executados com `bun run`, encadeados no script `test` do `package.json:11` (hoje: 6 suítes + a fumaça `tests/fumaca-presenca-v3.ts`).
- Asserts manuais (sem framework): `assert(condicao, mensagem)` e `assertEqual(real, esperado, mensagem)` imprimindo ✓/✗, com `throw` final se `falhou > 0`.
- Golden = fixture JSON em `src/core/fixtures/` comparada byte a byte (precedente: `composicao_golden_v3.json`, 32 casos, consumido em `src/core/composicao.test.ts:378-398`). O total de asserts da cadeia é um número de RUNTIME (asserts em loop) — não fixar totais como invariante nos docs.

## Regras de negócio
Os 6 blocos da suíte (todos obrigatórios):
1. **Determinismo:** mesmo `estado + fichas + perfil` ⇒ Pacote byte-idêntico em **100 execuções** (`JSON.stringify` comparado; precedente de repetição em loop existe na suíte v3).
2. **Ordem sagrada:** ordem dos `beats` ≡ ordem da linha, SEMPRE — inclusive após inserções de rodadas 2+ (miolo).
3. **Teto e precedência (D5):** casos com 0, 1, 2 e 3+ relações candidatas — com 3+, vencem as 2 de maior especificidade (nº de condições no `se`); empate de especificidade → ordem do array. Cobrir também a guarda `tem:` (nunca casa com o próprio objeto) e o teto por Pacote (não por beat).
4. **`papel` correto:** por posição e rodada — `linha[0]` = abertura, última = fecho, resto = miolo; linhas de 1 e 2 objetos cobertas ([[fase11-11-01]]).
5. **Falha explícita:** objeto sem ficha e nível ausente → erro nomeado (nunca Pacote parcial, nunca silêncio).
6. **Golden:** o Pacote-exemplo de [[fase11-11-00]] congelado em `src/core/fixtures/pacote_golden_v1.json` e comparado byte a byte — qualquer mudança de contrato quebra o teste de propósito.

## Passos de implementação
1. Escrever a suíte com os 6 blocos, no padrão de asserts manuais da casa.
2. Congelar o golden a partir do exemplo de [[fase11-11-00]] (gerado pelo `compor` real, conferido à mão contra o doc).
3. Encadear no script `test` do `package.json` (junto das suítes existentes).
4. Rodar `bun x tsc --noEmit` + `bun run test` — a cadeia inteira precisa seguir verde (as suítes da geração 1 são intocadas).

## Estados / edge-cases
- Golden desatualizado após mudança LEGÍTIMA de contrato → regenerar SÓ com decisão registrada (novo esquema `.v2` ou correção documentada) — nunca regenerar para "fazer passar".
- Fichas de teste divergindo do contrato real → os blocos 1–5 usam catálogo mínimo em memória; o bloco 6 usa células canônicas/ilustrativas do exemplo — se [[fase10-10-00]] evoluir, o golden muda junto (e o doc 11-00 também).
- Suíte rodando sem `docs/fichas/` no disco → por design: nenhum bloco depende dos arquivos reais (eles nascem na migração 10-04).
- Determinismo quebrado por iteração de objeto JS (ordem de chaves) → serializar com ordem estável; registrar na implementação.

## Critérios de aceitação / verificação
- [ ] Os 6 blocos especificados com seus casos (0/1/2/3+ candidatas; linhas de 1, 2 e N objetos; 100 execuções).
- [ ] Padrão da casa citado com os fatos verificados (asserts manuais, `bun run`, cadeia do `package.json`, fixtures em `src/core/fixtures/`).
- [ ] Política de golden (nunca regenerar para passar) registrada.
- [ ] Nenhuma suíte da geração 1 alterada.

## Relações com outros docs
- Depende de: `[[fase11-11-00]]`, `[[fase11-11-01]]`, `[[fase11-11-02]]`
- É consumido por: — (fecha a fase 11; a fase 12 consumirá o Pacote validado)
- Reconcilia / conserta: —
