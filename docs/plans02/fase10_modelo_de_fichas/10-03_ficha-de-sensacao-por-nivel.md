# fase10 · 10-03 · Ficha de sensação (corpo, por nível de leitura)

> ✅ **STATUS · 2026-07-10 · IMPLEMENTADA** — bloco `sensacao` (`dominante`/`registro`/`corpo` por nível) nas fichas de `docs/fichas/objetos.v1.json`; `sensacao_no_personagem` no cenário (`docs/fichas/cenarios.v1.json`). Roteiro: ../TRILHA-plans02.md

## Identidade
- id: `fase10-10-03`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Especificar o bloco `sensacao` da ficha de identidade — `dominante`, `registro` e `corpo` por nível — o campo que a prova de conceito mostrou ser OBRIGATÓRIO para o realizador não cair no clichê contemplativo.

## Pré-requisitos / Depende de
- `[[fase10-10-00]]` — o contrato `pipoca.fichas.v1`.
- `[[fase10-10-01]]` — a ficha de identidade que hospeda o bloco `sensacao`.

## Arquivos afetados
- `docs/fichas/objetos.v1.json` — PLANEJADO; o bloco `sensacao` vive dentro de cada ficha de identidade.

## Nomes & variáveis
- `sensacao` — reaproveitado de [[fase10-10-01]]: o bloco inteiro.
- `dominante` — sentido dominante do objeto (ex.: "visão").
- `registro` — tom emocional (ex.: "encanto silencioso").
- `corpo` — objeto com os 4 níveis: o que o corpo da criança faz/sente diante do objeto.

## Interfaces / contratos

### O achado da prova de conceito (a evidência)
- **Sem `corpo`:** o LLM cai no clichê contemplativo — "sorri" genérico em **5/5** gerações da 1ª rodada.
- **Com `corpo`:** gesto específico — **0** ocorrências de "sorri" na 2ª rodada; o corpo da criança faz o que a ficha dá ("os olhos seguem a pisca", "chegar perto na ponta dos pés").

Conclusão fixada: **a ficha de sensação corporal é obrigatória** — sem ela não há Lei 1 na prosa do realizador.

### A lição do n1 (por que `corpo` é por nível)
Na prova de conceito `corpo` era string única. No n1 (sílabas e palavras soltas), três fragmentos de corpo na mesma string reintroduziram **texto picado** — o defeito que a geração 2 nasceu para eliminar. Regra fixada: **no n1 a sensação é UMA por objeto**; a riqueza escala com o nível, como a descrição. Daí `corpo{n1..n4}`:

```jsonc
"sensacao": {
  "dominante": "visão",
  "registro": "encanto silencioso",
  "corpo": {
    "n1": "os olhos seguem a pisca",
    "n2": "os olhos seguem a pisca; chegar perto na ponta dos pés",
    "n3": "os olhos que seguem a pisca; a vontade de chegar perto na ponta dos pés",
    "n4": "os olhos que seguem a pisca; a vontade de chegar perto na ponta dos pés, prendendo a respiração"
  }
}
```

Campos:

| campo | tipo | obrigatório | nota |
|---|---|---|---|
| `dominante` | string | sim | sentido dominante (mapa abaixo) |
| `registro` | string | sim | tom emocional; herda o espírito do `registro` da geração 1 |
| `corpo` | objeto com os 4 níveis (string cada) | sim (os 4 níveis) | n1 = UMA sensação (heurística de lint: sem `;`) |

### Mapa sensorial dos 7 objetos
Reaproveitado da régua da geração 1 (`docs/revisao-quintal-v3-A2.md` — "Mapa sensorial usado", dominante por objeto):

| objeto | dominante |
|---|---|
| `vagalume` | visão-pequena |
| `frasco` | tato+visão |
| `lua` | visão-grande (queixo erguido / prata no rosto) |
| `gato` | quietude / olhar trocado |
| `vento` | pele |
| `folha` | movimento acompanhado |
| `orvalho` | frio no pé / toque miúdo |

Variantes da mesma célula variam o sentido secundário (disciplina herdada da revisão A2).

## Regras de negócio
1. **A Lei 1 vive AQUI agora:** "o corpo da criança é o centro" deixa de ser frase autoral no banco e vira DADO da ficha — o realizador recebe o gesto, não o inventa.
2. **n1 = UMA sensação por objeto** (sem `;` — regra de lint em [[fase10-10-05]]); n2..n4 podem compor 2+ fragmentos.
3. **Gesto, não emoção nomeada:** `corpo` descreve o que o corpo FAZ ("estica a mão", "prende a respiração"), nunca o que a criança "sente" em abstrato ("fica feliz") — é isso que mata o "sorri" genérico.
4. **Coerência com o dominante:** o gesto de cada nível deriva do sentido dominante do objeto (mapa acima); o secundário entra dos níveis altos.
5. Os 4 níveis são obrigatórios em `corpo` (invariante de [[fase10-10-00]]).

## Passos de implementação
1. Preencher `dominante`/`registro` dos 7 objetos a partir do mapa sensorial e do `registro` da geração 1.
2. Autorar `corpo{n1..n4}` de cada objeto: minerar os gestos que já existem nas variantes do `docs/quintal.v3.json` (ex.: "o dedo dela acompanha no ar", "estica o pescoço", "prende a respiração") conforme [[fase10-10-04]].
3. Validação humana célula a célula (o gesto soa como a criança? é UM no n1?).
4. Lint por lote ([[fase10-10-05]]).

## Estados / edge-cases
- Objeto sem gesto óbvio no dominante → buscar no secundário do mapa; nunca deixar `corpo` vazio (lint ERRO).
- Gesto repetido entre objetos da mesma linha (dois objetos com "os olhos seguem...") → risco de eco não intencional; candidato a aviso de lint futuro; a rotação de sensação é decisão do compositor (fase 11).
- n1 com dois fragmentos separados por vírgula (burla o `;`) → a heurística do lint é inicial; a validação humana é a parada dura.

## Critérios de aceitação / verificação
- [ ] Evidência da prova de conceito resumida no doc (5/5 "sorri" sem corpo → 0 com corpo).
- [ ] A lição do n1 registrada com o porquê (string única → `corpo` por nível).
- [ ] Campos `dominante`, `registro`, `corpo{n1..n4}` especificados com tipo e obrigatoriedade.
- [ ] Mapa sensorial dos 7 objetos embutido.
- [ ] Regra "Lei 1 vive aqui" enunciada.

## Relações com outros docs
- Depende de: `[[fase10-10-00]]`, `[[fase10-10-01]]`
- É consumido por: `[[fase10-10-04]]`, `[[fase10-10-05]]`
- Reconcilia / conserta: —
