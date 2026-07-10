# fase13 · 13-02 · Persistência (salvar história, sem cache de replay)

## Identidade
- id: `fase13-13-02`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Planejar a persistência das histórias geradas — reusar a base existente, salvar também as intermediárias por rodada e o Pacote de origem — deixando explícito que salvar ≠ cachear: não há cache de replay nesta fase.

## Pré-requisitos / Depende de
- `[[fase13-13-00]]` — a fronteira Realizador→App por onde chega o que se salva.
- `[[fase11-11-00]]` — o Pacote de origem que passa a ser salvo junto do texto.

## Arquivos afetados
Nesta fase, nenhum. Na implementação: `src/core/historias.ts` (novo esquema/campos), `src/core/persistencia/` (métodos já previstos) e o ponto de captura em `src/app/estado.js`. Base existente VERIFICADA (não tocar agora):
- `RepositorioPersistencia` (`src/core/persistencia/index.ts:18-42`) — os métodos de histórias JÁ são opcionais/aditivos no contrato: `carregarHistorias?` (:36), `salvarHistoria?` (:38), `apagarHistoria?` (:39), `podarHistorias?` (:41). Fábrica `criarRepositorio()` (:47-49) → `RepositorioLocalStorage` (localStorage com envelopes versionados; payload corrompido é descartado — `RepositorioLocalStorage.ts:1-34,46-59`).
- `chaveHistorias(perfilId)` → `pipoca.historias.v1:${perfilId}` (`src/core/persistencia/chaves.ts:23-25`).
- Shape atual `HistoriaSalva` (`src/core/historias.ts:28-39`, esquema `pipoca.historias.v1` :16): id, cenarioId, **texto** (capturado na convergência), **linha** (ids em ordem), nivel, desfecho, titulo, emoji, criadaEm, favorita. Retenção: 20 dias, favorita para sempre, cap de 30 não-favoritas (:18-22).
- Captura atual: SÓ a história CONCLUÍDA — `_capturarHistoriaSalva` (`src/app/estado.js:894-923`, `repo.salvarHistoria` :919), disparada na convergência (:805-820).

## Nomes & variáveis
- `HistoriaSalva` — o shape atual (acima); evolui para carregar a origem.
- `RepositorioPersistencia`, `criarRepositorio`, `chaveHistorias` — reaproveitados do código (caminhos acima).
- `pacoteOrigem` — campo novo planejado: o `PacoteComposicao` que gerou o texto (nome a confirmar na implementação).
- Reaproveitados com grafia idêntica: `PacoteComposicao` ([[fase11-11-00]]); `realizar` ([[fase12-12-00]]).

## Interfaces / contratos

### O que passa a ser salvo (mudanças planejadas)
1. **A história concluída** — como hoje, MAIS: o texto realizado (LLM ou fallback), a **origem** (qual caminho gerou — metadado de [[fase12-12-04]]) e o **Pacote de origem** (`pacoteOrigem`) — o Pacote é pequeno, estruturado e permite auditoria/releitura fiel do que foi decidido.
2. **As intermediárias por rodada** — hoje NÃO são salvas (verificado: captura só na convergência). Passam a ser: cada portão lido gera um registro (a criança relê "como a história cresceu"). Contagem: até 4 por partida — a retenção/cap atual (20 dias/30) precisa ser recalibrada para não expulsar histórias completas com intermediárias; regra-semente: intermediárias contam separado e são podadas primeiro.

### Evolução do esquema
O esquema atual é `pipoca.historias.v1` (campo `esquema`, `src/core/historias.ts:16`). Os campos novos (texto de origem LLM, `pacoteOrigem`, marcador de intermediária/rodada) exigem evolução.
**Decisão fixada (2026-07-09):** campos OPCIONAIS ADITIVOS no `pipoca.historias.v1` — `origem`, `pacoteOrigem` e o marcador de rodada/intermediária, todos opcionais; registros antigos seguem válidos sem migração. Mesma distinção de regra da extensão do perfil ([[fase13-13-01]]): "nunca mutar `.vN`" protege schemas AUTORAIS publicados; o envelope de storage local evolui aditivamente, e `.v2` fica reservado para mudança que quebre o shape.

### Salvar ≠ cachear (explícito)
- **Salvar** = histórico/releitura: a criança e a família reveem o que foi criado. É o que esta fase faz.
- **Cachear (replay)** = reusar texto gerado quando o MESMO arranjo se repetir. **NÃO existe nesta fase** — decisão de produto já tomada: o mesmo arranjo gera história NOVA a cada vez (o realizador é não-determinístico por natureza e isso é característica, não defeito).
- **Plantado no jardim, com condição de colheita:** cache de replay entra em pauta QUANDO o replay exato virar requisito observado numa sessão real (criança pedindo "a mesma história de novo" e a nova versão frustrando). Sem essa observação, não se constrói.

## Regras de negócio
1. **Salvar ≠ cachear** — nenhuma chave-de-replay, nenhuma consulta "já gerei este arranjo?"; toda geração é nova.
2. **Contrato aditivo:** os métodos opcionais de histórias do `RepositorioPersistencia` são o encaixe natural — o contrato NÃO muda; muda o shape salvo.
3. **Pacote junto do texto:** sem o `pacoteOrigem` não há auditoria de fidelidade a posteriori; o par (Pacote, texto) é a unidade de evidência da geração 2.
4. **Intermediárias são segunda classe na poda:** cap/retenção protegem primeiro as histórias completas e as favoritas (regra atual: 20 dias/30/favorita para sempre — recalibrar contando intermediárias à parte).
5. **Privacidade herdada:** tudo continua local (localStorage) até o backend da geração 1 dizer o contrário; nada desta fase cria tráfego novo de dados da criança.

## Passos de implementação
1. Evoluir `HistoriaSalva` com os campos opcionais aditivos (`origem`, `pacoteOrigem`, marcador de rodada/intermediária — decisão fixada).
2. Estender a captura: além da convergência (:805-820), capturar a cada portão lido (intermediárias).
3. Recalibrar poda/retenção contando intermediárias separado.
4. Testes no padrão da casa: salvar/carregar/poda com o shape novo; compat com registros v1 existentes.

## Estados / edge-cases
- Registro v1 antigo (sem os campos novos) → carrega e exibe normalmente (compat para trás garantida por design: os campos novos são opcionais).
- História de fallback (A+ v3) → salva igual, origem sinalizada; `pacoteOrigem` pode ser nulo (não houve Pacote) — o shape precisa permitir.
- localStorage cheio → comportamento atual do repositório (gravação falha silenciosa?) — VERIFICAR na implementação e tratar explícito; poda preventiva das intermediárias primeiro.
- Partida abandonada no meio → intermediárias já salvas ficam (são histórias lidas de verdade); a poda cuida do volume.

## Critérios de aceitação / verificação
- [ ] Base existente descrita como É (contrato aditivo, chave, shape, retenção, captura só-na-convergência) com caminho:linha.
- [ ] Mudanças planejadas: intermediárias por rodada + origem + `pacoteOrigem`.
- [ ] "Salvar ≠ cachear" explícito; sem chave-de-replay; jardim com condição de colheita registrada.
- [ ] Decisão fixada do esquema (campos opcionais aditivos no `pipoca.historias.v1`) registrada com a distinção storage-vs-autoral.

## Relações com outros docs
- Depende de: `[[fase13-13-00]]`, `[[fase11-11-00]]`
- É consumido por: — (a fase 14 auditará o que ainda referencia frases; texto simples)
- Reconcilia / conserta: —
