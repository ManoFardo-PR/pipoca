# Frente 4 — Confronto frontend ↔ backend ↔ banco (integridade de dados)

Objetivo: garantir que **nenhuma informação se perde** no caminho da tela ao banco.
Verificação com o esquema real do Supabase (`bamlljvllcxdnsheatqv`, ACTIVE) em 2026-08-28.

## Conclusão de cabeçalho

O caminho até o **banco é fiel**: cada envelope viaja **inteiro** na coluna `dados`/`evento`
(jsonb) e é **revalidado na leitura** pelos validadores canônicos. Não há recorte de campo
para colunas que descartaria o resto — a perda de tipo do codec era problema do **Firestore**
(abandonado). Os riscos reais de perda estavam na **persistência local**, antes do backend;
foram corrigidos nesta frente.

## Mapa envelope × coluna (por entidade)

| Entidade | Envelope local (`pipoca.*.v1`) | Escrita remota (`repo_supabase.ts`) | Colunas reais (Postgres) | Perda? |
|---|---|---|---|---|
| Perfil | `{esquema, perfil:{...}}` na chave `pipoca.perfil.v1` (array) | `dados = {esquema:"pipoca.perfil.v1", perfil:{...p}}` | `perfis(id, dono[auth.uid()], tenant_id, dados jsonb, atualizado_em)` | **Não** — perfil inteiro em `dados` |
| Save | `{esquema, perfilId, estado}` em `pipoca.save.v1:<id>` | `dados = {esquema, perfilId, estado}` | `saves(perfil_id[PK], dono, dados jsonb, atualizado_em)` | **Não** — estado inteiro em `dados` |
| História | `{esquema, historia:{...}}` em `pipoca.historias.v1:<id>` | `dados = {esquema, historia:{...}}` + `favorita`/`criada_em` (colunas p/ filtro) | `historias(id, perfil_id, dono, favorita, criada_em, dados jsonb, atualizado_em)` | **Não** — história inteira em `dados`; colunas são espelho p/ retenção |
| Telemetria | `{esquema, evento:{...}}` em `pipoca.telemetria.v1:<id>` (array) | `evento` jsonb | `telemetria(id, perfil_id, dono, evento jsonb, criado_em)` | **Não** — evento inteiro em `evento` |

`dono` NUNCA é enviada pelo cliente (default `auth.uid()` + RLS `dono=auth.uid()`); `tenant_id`
vem de `escopoTenant`, mas o trigger `fixar_tenant_perfis` sobrescreve no servidor (defesa).

## Correções aplicadas nesta frente

- **D-09 (versão desconhecida destruída):** as escritas locais liam via `lerArrayEnvelopes`
  (que **filtra** por esquema) e regravavam a lista filtrada — um futuro `pipoca.perfil.v2`
  sumiria na primeira escrita v1. Agora `salvarPerfil`/`apagarPerfil`/`salvarHistoria`/
  `apagarHistoria`/`podarHistorias` usam `lerArrayBruto` + `particionarPorEsquema` e **preservam
  o `resto`** (versões desconhecidas). Regressão coberta em `persistencia.test.ts`.
- **D-10 (perda silenciosa do save na quota):** `salvarSave` ignorava o `false` de `gravarItem`.
  Agora, se a quota estoura, ele **poda a telemetria do próprio perfil** (o dado mais volumoso e
  descartável) e tenta de novo — o progresso da criança não some em silêncio; só então degrada
  (regra da casa: nunca interromper a sessão).

## Itens remanescentes (maior esforço / risco — não nesta frente)

- **D-07 (sem desempate de conflito):** o `sync.ts` só puxa ids AUSENTES e faz "último push vence".
  A coluna `atualizado_em` (servidor) já existe — o desempate por timestamp/versão exige carimbar
  o envelope e comparar no merge (mudança de sync com risco de regressão; fazer com teste dedicado).
- **D-06 (catch vazio no espelho remoto):** `repo_sincronizado.ts` engole falhas de escrita remota
  (8 pontos). Dar telemetria/fila de retry — mudança no adaptador sincronizado.
- **D-21 (chave legada `pipoca.perfis.v1`):** caminho de fallback em `estado.js` (bundle antigo).
  Consolidar quando aposentar o fallback; risco no boot, baixo valor agora que o bundle é atual.
