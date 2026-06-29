# fase01 · 01-13 · Aplicação transversal da acessibilidade

## Identidade
- id: `fase01-01-13`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: mvp

## Objetivo
Definir como as `A11yPrefs` propagam em todas as telas (a acessibilidade "decide tudo" no brief).

## Pré-requisitos / Depende de
- `[[fase01-01-12]]` — a origem das preferências.

## Arquivos afetados
- `src/core/a11y.ts` (criar) — helpers de estilo derivados de `A11yPrefs`.

## Nomes & variáveis
- `estiloLeitura(a11y)` → fonte (Atkinson se `dyslexia`), `letter-spacing`, tamanho (`textScale`).
- `silabar(texto)` → insere `·` entre sílabas quando `syllable`.
- `paletaContraste(a11y)` → tinta/realce quando `contrast`.
- `semMovimento(a11y)` → desliga parallax/respiração/animação quando `reduceMotion`.

## Interfaces / contratos
- `A11yPrefs` ([[_contratos/tipos-core]]); tokens de [[fase00-00-03]].

## Regras de negócio
1. **Texto de leitura** (Tela 5) aplica fonte/espaçamento/silábico/contraste.
2. **Cenas** (T3/T4) respeitam `reduceMotion`.
3. **Tamanho** escala título/leitura sem quebrar layout.
4. **Sem regressão sensorial:** ajustes nunca aumentam estímulo competindo.

## Passos de implementação
1. Implementar os helpers puros em `src/core/a11y.ts`.
2. Telas chamam os helpers ao montar `renderVals()`.
3. Cobrir reduceMotion nas animações do shell ([[fase00-00-05]]).

## Estados / edge-cases
- `syllable` em palavra de 1 sílaba → sem `·`.
- `contrast`+`dyslexia` → ambos aplicam.

## Critérios de aceitação / verificação
- [ ] Ligar dislexia troca a fonte da leitura em todas as telas.
- [ ] `reduceMotion` elimina parallax/respiração.

## Relações com outros docs
- Depende de: `[[fase01-01-12]]`
- É consumido por: `[[fase01-01-06]]`, `[[fase01-01-03]]`
- Reconcilia / conserta: —
