# fase10 · 10-04 · Migração do quintal (frases → fichas)

> 🟢 **STATUS · 2026-07-10 · IMPLEMENTADA COM PENDÊNCIAS HERDADAS** — mineração ✅ (168 células, `docs/fichas/revisao-fichas-v1.md`) · validação em escala executada ✅ (291 casos, fidelidade 93% em regime fidelidade-pura — PR #21) · calibração de comprimento + few-shot + veredito de voz ⏳ → fase 12 ([[fase12-12-01]], [[fase12-12-05]]). Detalhe das 3 pendências: TRILHA-plans02, "Fechamento da fase 10". Roteiro: ../TRILHA-plans02.md

## Identidade
- id: `fase10-10-04`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Planejar a destilação das ~203 variantes de texto do `docs/quintal.v3.json` em fichas das três camadas — nada se joga fora, tudo vira matéria-prima — com validação humana célula a célula e validação em escala como portão da fase 11.

## Pré-requisitos / Depende de
- `[[fase10-10-00]]` — o contrato `pipoca.fichas.v1`.
- `[[fase10-10-01]]` — destino das descrições (camada 1).
- `[[fase10-10-02]]` — destino das temperas (camada 2).
- `[[fase10-10-03]]` — destino dos gestos (bloco `sensacao`).

## Arquivos afetados
- `docs/fichas/objetos.v1.json`, `docs/fichas/relacoes.quintal.v1.json`, `docs/fichas/cenarios.v1.json` — PLANEJADOS; recebem o material destilado.
- `docs/quintal.v3.json` — **NÃO é tocado nesta fase.** Permanece ativo no runtime (Motor A+ v3, fallback em produção); a aposentadoria do banco de frases é assunto da fase 14, fora deste doc.
- `experimentos/beats-para-paragrafos/` — adaptado (na implementação) para consumir fichas na validação em escala.

## Nomes & variáveis
- `pipoca.grafo-autoral.v3` — esquema do banco de origem (geração 1).
- `conta` — campo de origem das descrições (variantes-base por nível, no v3).
- `tempera` — campo de origem das relações (condições `se`/`entao`, no v3).
- `HistoriaBase` — tipo de entrada do experimento (`experimentos/beats-para-paragrafos/tipos.ts`), hoje alimentado pelos beats do Motor A+; a adaptação o alimenta a partir de fichas.

## Interfaces / contratos
O mapa da mineração — de onde vem cada campo da ficha:

| origem (geração 1) | destino (ficha) |
|---|---|
| `conta{n1..n4}` de cada objeto (variantes-base) | `descricao{n1..n4}` da camada 1 — destilar a imagem autoral, tirar personagem e verbo de cena |
| `tempera[]` (`se`/`entao`) de cada objeto | `interacao{n1..n4}` da camada 2 — destilar a frase em interação, preservar condição e significado |
| `registro` de cada objeto + mapa sensorial da revisão A2 | `sensacao.dominante` / `sensacao.registro` |
| gestos embutidos nas variantes ("o dedo dela acompanha no ar", "estica o pescoço", "prende a respiração") | `sensacao.corpo{n1..n4}` |
| `moldura` (abertura, conectivos, desfecho) e ecos | fica na geração 1 por ora — abertura/desfecho/ecos são decisão de arranjo do compositor (fase 11); registrar no inventário o que NÃO migrou |

As **imagens autorais são o ouro** da mineração — exemplos confirmados no v3: "quieto feito sombra" (gato, n3/n4), "mil luas aos pés" (lua, tempera com orvalho). Cada imagem dessas deve sobreviver em alguma ficha; a contagem-base é a da revisão A2 (`docs/revisao-quintal-v3-A2.md`): 203 variantes, das quais 65 mantidas + 135 ajustadas + 3 reescritas na última revisão editorial.

## Regras de negócio
1. **Nada se joga fora:** toda variante é lida e classificada no inventário — vira descrição, vira interação, vira gesto, ou é registrada como "não migra" com motivo (ex.: moldura).
2. **Destilar ≠ copiar:** frase pronta não entra em ficha; entra a imagem/interação/gesto destilado (regra de [[fase10-10-01]] e [[fase10-10-02]]).
3. **Validação humana célula a célula** (parada dura, como sempre): nenhum lote entra no arquivo de fichas sem o veto/aceite do Manoel, célula a célula.
4. **`docs/quintal.v3.json` intocado:** a migração LÊ o v3; qualquer mudança nele está fora de escopo (aposentadoria = fase 14).
5. **Portão da fase 11:** a fase 10 só é aceita com a validação em escala aprovada (critérios abaixo) — registrado também na `TRILHA-plans02.md`.

## Passos de implementação
1. **Inventário:** planilha/JSON de trabalho com as ~203 variantes classificadas (objeto, nível, campo de origem, destino proposto, imagem autoral presente).
2. **Destilação camada 1:** `conta` → `descricao{n1..n4}` dos 7 objetos ([[fase10-10-01]]).
3. **Destilação sensação:** gestos minerados → `corpo{n1..n4}` + `dominante`/`registro` ([[fase10-10-03]]).
4. **Destilação camada 2:** `tempera` → relações ([[fase10-10-02]]).
5. **Validação humana** célula a célula por lote + lint ([[fase10-10-05]]) a cada lote.
6. **Validação em escala** (portão — ver critérios): adaptar `experimentos/beats-para-paragrafos/` para montar `HistoriaBase` (ou sucessor) a partir de fichas e rodar a matriz completa.

## Estados / edge-cases
- Variante sem destino claro (nem descrição, nem interação, nem gesto) → inventário marca "não migra" com motivo; decisão final do Manoel.
- Imagem autoral que só funciona como frase inteira → candidata a ficar na geração 1 e ser recriada (não copiada) na ficha; registrar a perda no inventário.
- Duas variantes da mesma célula com imagens concorrentes → escolher a mais forte na validação humana; a perdedora fica registrada no inventário (pode servir a outro cenário).
- Experimento falha na validação em escala → a fase 10 NÃO fecha; voltar às fichas (ou ao contrato) antes de qualquer trabalho da fase 11.

## Critérios de aceitação / verificação
- [ ] Inventário das ~203 variantes completo (com destino ou motivo de não-migração).
- [ ] Fichas dos 7 objetos autoradas, validadas célula a célula e passando o lint.
- [ ] **Validação em escala (critério principal, portão da fase 11):** o experimento `experimentos/beats-para-paragrafos/` adaptado para consumir fichas, rodando a matriz (rodadas × níveis) com: Camada 1 determinística (fidelidade/gênero/nível) verde nos mesmos patamares da prova de conceito; juiz LLM (Camada 2) sem regressão; e **leitura em voz alta do Manoel** nas amostras — ANTES do aceite da fase 10.
- [ ] `docs/quintal.v3.json` byte a byte intocado ao fim da migração.

## Relações com outros docs
- Depende de: `[[fase10-10-00]]`, `[[fase10-10-01]]`, `[[fase10-10-02]]`, `[[fase10-10-03]]`
- É consumido por: — (o portão que abre a fase 11; a fase 14 fará a auditoria/aposentadoria do banco de frases)
- Reconcilia / conserta: —
