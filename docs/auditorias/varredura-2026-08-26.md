# Varredura geral — pontas soltas, código morto, UI e melhorias (2026-08-26)

**Escopo:** branch `28_08_26` @ `e0bdcd2`, findings-only (nada foi corrigido).
**Método:** evidência sempre (`arquivo:linha` ou saída de comando); typecheck/testes/e2e
rodados de verdade; Supabase consultado **somente leitura** (projeto `bamlljvllcxdnsheatqv`);
código morto confirmado por grep de importadores excluindo `*.test.ts` e os 3 bundles
(`support.js`, `pipoca.bundle.js`, `pipoca.admin.bundle.js`); screenshots reais capturados
com o harness playwright dos e2e (backend local, nada tocou produção).
**Eixos:** `PS` pontas soltas · `DM` código morto · `UI-C/UI-A` interface (criança/adulto)
· `ML` dossiês das melhorias do dono. Severidade: 🔴 alta · 🟡 média · 🟢 baixa.

---

## FASE 0 — Chão factual (resultados crus)

| Verificação | Resultado |
|---|---|
| `bun x tsc --noEmit` | **limpo** (exit 0) |
| `npm test` (11 suítes bun + fumaça) | **143/143 ✓** · fumaça de presença: 240 histórias, pior presença 100%, 0 falhas |
| `node tests/e2e/run-reordenar-miolo.mjs` | **28 ✓ / 0 ✗** |
| `node tests/e2e/run-linha-verde-canonico.mjs` | **80 ✓ / 0 ✗** (inclui a seção inteira de histórias salvas: captura → cartão na T3 → releitura → 💛 → retenção) |
| `node tests/e2e/run-admin.mjs` | **25 ✓ / 0 ✗** |
| `node tests/e2e/run-geracao2-canonico.mjs` | **42 ✓ / 0 ✗** |
| `git status --porcelain` | limpo; HEAD `28_08_26` = `e0bdcd2` |
| Migrations aplicadas (MCP) | 4: `20260702211948`, `20260703122528`, `20260712113500`, `20260826155239_otimizacao_rls_cascade_cota` |
| Edges deployadas (MCP) | `proxy-ia` v4 · `realizador` v4 · `admin-chaves-ia` v2 — todas ACTIVE, `verify_jwt: true` |
| Contagens REAIS (SELECT, não estimativa) | `perfis` 4 · `saves` 3 · **`historias` 5** (3 completas, 2 intermediárias, 1 favorita, 2 perfis; primeira 2026-07-07, **última 2026-08-26 19:07 — hoje**) · `telemetria` 131 · `uso_ia` 2 · `tenants` 7 · `config_ia` 3 · `chaves_ia` 2 · `operadores` 1 · `contas_tenant` 0 · `conteudo` 0 · `flags_admin` 0 |
| Advisors security (MCP) | ⚠ `registrar_uso_ia` executável por `anon` e `authenticated` via `/rest/v1/rpc` (SECURITY DEFINER) — ver **PS-03**; ⚠ leaked-password protection desligada; INFO: `chaves_ia`/`uso_ia` com RLS sem policy (deny-all **intencional**, `rls_supabase.sql:95-113`) |
| Advisors performance (MCP) | FKs sem índice cobridor em `historias.perfil_id` e `telemetria.perfil_id` (criadas pela migração de 26/08); índice `historias_dono_perfil_idx` nunca usado; políticas permissivas múltiplas (SELECT/authenticated) em `contas_tenant`, `flags_admin`, `tenants` — ver **PS-16** |
| ACL real da RPC (SELECT em `pg_proc`) | `registrar_uso_ia`: `{postgres, anon=X, authenticated=X, service_role=X}` — o `revoke ... from public` da migração **não** removeu os grants default do Supabase a `anon`/`authenticated` |
| Fonte deployado do `realizador` (MCP) | Compatível com `functions/realizador/index.ts` nos marcadores-chave (modelos default, âncoras, teto 4, contrato de resposta); **usa read-then-write via PostgREST — não chama a RPC** (o wire pendente vale para o deploy) |

Leitura honesta: **o motor está saudável** — typecheck limpo, 318 checks verdes no total,
histórias chegando ao espelho remoto (a última é de hoje). Os problemas encontrados são de
outra natureza: consentimento/segurança em pontos específicos, atrito de UX e dívida
estrutural conhecida.

---

## PS — Pontas soltas

### 🔴 PS-01 · A autorização de IA do cuidador (e o kill-switch) NÃO gateiam a Geração 2 viva
> ✅ **Resolvido em 2026-08-28 (Plan03 · A1, commit `5ecc07d`; ao ar no fechamento A5):** gate único em
> `_dispararRealizacao` via `iaEfetivamenteLigada` (cuidador ∧ sem kill-switch, lido na borda a cada disparo);
> IA desligada ⇒ rota `ap_cru` no `gerar` (zero LLM), `origem.motivo = "ia-desligada"`. Teste e2e
> "IA desligada ⇒ realizador NÃO é chamado" (geracao2 +5) e `page.on(request)` sem `/functions/v1/realizador`.
O caminho vivo de geração dispara o realizador remoto **sem consultar consentimento**:
`Tela4Heroi.dc.html:226` → `prepararLeituraPortao` (`src/app/estado.js:899-923`) →
`_dispararRealizacao` (`estado.js:806-842` — única condição: `G.realizadorRemoto` existir)
→ `bridge.ts:197-203` (`obterBackend().realizador ?? null`, sem checagem) →
`proxy_realizador.ts:67-85` (exige só sessão) → edge. **Nenhum elo lê `modos.iaLigada`**
(grep em `estado.js`, `geracao.ts`, `proxy_realizador.ts`, `bridge.ts`: zero consumidores
no fluxo de geração). Consequência: com família logada no backend Supabase, **cada entrada
no portão envia nome + gênero + nível da criança ao provedor de LLM mesmo com a IA
"desligada" pelo cuidador** — e o kill-switch global, que também só escreve em
`modos.iaLigada` (`flags.ts`/`aplicarFlagsAosModos`), tampouco interrompe a chamada.
Os e2e de flags passam porque testam a propagação flags→modos, não o gate da chamada.
Agrava: a própria UI de consentimento está quebrada (ver PS-02). Dado pessoal de criança
+ LGPD ⇒ severidade máxima. *Correção conceitual: um único gate em `_dispararRealizacao`
(ou em `realizadorRemoto`) lendo o modos efetivo.*

### 🟡 PS-02 · `PipocaCanonico.ia` não existe → o toggle de IA do cuidador está inerte
> ✅ **Resolvido em 2026-08-28 (Plan03 · A2, commit `f9aca22`):** `provedorPronto` passa a ser
> `realizadorRemoto()` presente ∧ sem kill-switch, com `motivoIndisponivel` antes do gesto; o IaToggle
> tem 3 estados (Indisponível/Desligada/Ligada). Prova: `tests/e2e/capturar-regras-ia.mjs` (10 asserts + 4 PNGs).
`src/telas/Regras.dc.html:239` calcula `provedorPronto: !!(C && C.ia && ...)`, mas
`bridge.ts:174-300` nunca exporta a chave `ia` (era da Geração 1). Resultado: o
`IaToggle` (`Regras.dc.html:91` + `src/telas/IaToggle.dc.html`) renderiza permanentemente
como "provedor não pronto" — o cuidador não consegue nem expressar o consentimento que o
PS-01 já não aplica. A cadeia de consentimento está cortada em dois pontos.

### 🔴 PS-03 · `registrar_uso_ia` exposta a `anon` via REST — e nenhuma edge a usa
> ✅ **Resolvido em 2026-08-28 (Plan03 · A3/A4/A5):** migração `20260828190919_pos_varredura_rpc_indices_politicas`
> aplicada (`revoke ... from public, anon, authenticated` + `alter default privileges` do schema; RPC agora recebe
> deltas `p_chamadas`/`p_custo`) — `proacl` = {postgres, service_role}; advisor `anon_security_definer` sumiu.
> Edges `realizador` e `proxy-ia` chamam `POST /rest/v1/rpc/registrar_uso_ia` (commit `8e3be20`; redeploy no A5).
Advisors + ACL real confirmam: a função é SECURITY DEFINER executável por `anon` e
`authenticated` em `/rest/v1/rpc/registrar_uso_ia`. A migração
`src/backend/migrations/2026-08-28_otimizacao-rls-cascade-cota.sql:44-47` fez
`revoke ... from public` + `grant service_role`, mas no Postgres isso **não remove** os
grants default que o Supabase dá a `anon`/`authenticated` na criação (`proacl` verificado:
`anon=X`). Qualquer portador da anon key pode inflar `uso_ia` de qualquer tenant → nega a
cota do mês da família (DoS de cota barato). Ironia dupla: a RPC criada para as edges
segue **sem uso** — `grep registrar_uso_ia functions/` = 0 hits; o deploy v4 do
`realizador` confirma read-then-write via PostgREST (`functions/realizador/index.ts:123-143`
espelha o deployado). *Fix conceitual: `revoke execute ... from anon, authenticated` +
migrar as edges para a RPC (o wire que já era o plano).*

### 🔴 PS-04 · dc-runtime sem código-fonte (o maior débito estrutural)
`support.js` (56 KB, `index.html:11`/`admin.html:11`) declara-se gerado
(`support.js:1`: "GENERATED from dc-runtime/src/*.ts — do not edit"), mas
`dc-runtime/src/` **não existe**; `dc-runtime/build.js:8-13` é um stub que só valida a
presença do arquivo e instrui "Restore the full dc-runtime/src/ tree" — não há como
reconstruí-lo. Todo `.dc.html` é interpretado em runtime por esse bundle órfão
(`support.js:1360-1422`). Qualquer bug/limitação do runtime é **inemendável** hoje.
Risco, não urgência: o arquivo é estável. Opções (decisão do dono): recuperar a fonte de
onde o dc-runtime nasceu; tratar `support.js` como vendored-freeze documentado; ou plano
de êxodo gradual.

### 🟡 PS-05 · `pipoca.admin.bundle.js` está 12 dias atrás do código compartilhado
Bundle do admin buildado em `85595f9` (2026-08-14); desde então **3 commits tocaram
`src/core`/`src/backend`** (que entram no bundle do admin via `bridge_admin.ts`):
`e0bdcd2` (integridade de persistência D-09/D-10), `e2cbe4d` (auth Google), `b3a98b3`
(SQL). Confirmado por `git log 85595f9..28_08_26 -- src/admin src/core src/backend`.
O admin roda hoje **sem** as proteções D-09/D-10 no seu lado do espelho.
*Sintoma da causa-raiz: build manual sem CI (PS-08).*

### 🟡 PS-06 · Follow-ups conhecidos D-06 e D-07 seguem abertos (e agora têm consequência de UX)
Confirmados em `docs/auditorias/frente4-mapa-envelope-coluna.md:38-46` e no código:
- **D-06**: `repo_sincronizado.ts:130-141` — escrita remota fire-and-forget com catch
  vazio (8 pontos); uma história pode não chegar ao espelho e ninguém sabe.
- **D-07**: sync só puxa ids ausentes, "último push vence" — sem desempate por
  `atualizado_em` (a coluna já existe).
- Elo novo (desta varredura): a **leitura** é sempre local (`repo_sincronizado.ts:128-129`;
  remoto só em `sincronizarInicial` para perfil ausente, `sync.ts:71-84`) — é o mecanismo
  por trás do "minhas histórias sumiram" em troca de aparelho (ver ML-1).

### 🟡 PS-07 · D-21 — chave legada `pipoca.perfis.v1`: o perímetro é MAIOR que o documentado
Não é só o fallback de leitura/migração (`src/app/estado.js:63,193-195,219-230`):
(a) `estado.js:242` ainda **GRAVA** na chave legada sempre que o repo canônico falha
(`_fallbackRepo`, ativado em 11 pontos via `_repoBase() || _fallbackRepo`); (b)
`Tela2EntradaCrianca.dc.html:102` lê `localStorage.getItem('pipoca.perfis.v1')`
**direto**, sem passar pelo repo — uma tela conhecendo o formato de storage é vazamento
de camada. Aposentar a chave exige tocar os 3 lugares, não só a migração.

### 🟡 PS-08 · Sem CI, lint, formatter ou hooks; `.gitignore` de 3 linhas; bundles commitados à mão
`package.json:5-18` tem os scripts, mas nada os executa automaticamente; `scripts/post-merge.sh`
existe e não é instalado como hook. O PS-05 é a consequência visível. Um workflow mínimo
(typecheck + testes + confronto bundle×fonte) elimina a classe inteira de drift.

### 🟡 PS-09 · e2e com caminhos absolutos da máquina do autor
7 ocorrências `C:/Users/mfard/...` (`run-linha-verde-canonico.mjs:22,48,92`,
`run-admin.mjs:44,78`, `run-geracao2-canonico.mjs:53,87`), sobrescrevíveis por
`PW_CORE`/`PW_CHROME`. Nesta máquina funcionam (os 4 e2e passaram); em qualquer outra,
quebram silencioso. `playwright.config.ts` na raiz sugere um segundo harness (ver DM).

### 🟢 PS-10 · Drift de documentação
`docs/guia-do-codigo/` (doc vivo): 18 refs a `experimentos/` (não existe mais), 2 a `old/`
(existe **vazia**), adaptadores firebase listados como plugáveis
(`40-backend-e-edge.md:53-54`) sem nota de aposentadoria. Outros 46 hits de
`experimentos/|firestore` espalham-se por `docs/plans*` — esses são **arquivo histórico**,
não corrigir. Detalhe: o arquivo da migração chama-se `2026-08-28_...` mas foi aplicado
como `20260826155239` (2026-08-26) — cosmético, mas confunde arqueologia.

### 🟢 PS-11 · Higiene de branches
21 locais / 30 remotas; **18 locais já mergeadas** em `28_08_26` (lista completa via
`git branch --merged 28_08_26`). Não mergeadas: `26_08_2026` e
`feat/fase15-migracao-firebase` (abandonada por decisão). `fix/geracao2-em-producao` está
checked-out em outro worktree (não deletável agora). `docs/plans02/fase15_migracao_firebase/`
e `old/` são diretórios vazios.

### 🟡 PS-14 · Advisors de performance (novos, pós-migração de 26/08)
> ✅ **(a) e (c) resolvidos em 2026-08-28 (Plan03 · A3/A5, migração `20260828190919`):** índices
> `historias_perfil_id_idx`/`telemetria_perfil_id_idx`; políticas de `contas_tenant`/`flags_admin`/`tenants`
> fundidas em 1 SELECT (OR) + insert/update/delete — advisors sem `unindexed_foreign_keys` nem
> `multiple_permissive_policies`. **(b)** mantido por decisão (reavaliar após D1). **(d) ainda aberto:** exige
> o painel (Authentication → Password) e plano Pro — sem ferramenta no MCP.
(a) A migração adicionou FKs `historias.perfil_id`/`telemetria.perfil_id` (cascade LGPD)
**sem índice cobridor** — o `ON DELETE CASCADE` de um perfil varre `historias`/`telemetria`
por seq scan; (b) `historias_dono_perfil_idx` nunca usado (leitura real filtra por
`perfil_id`, índice começa por `dono`); (c) políticas permissivas múltiplas (SELECT,
`authenticated`) em `contas_tenant`/`flags_admin`/`tenants`. Volume atual é minúsculo
(5 histórias) — severidade baixa hoje, estrutural amanhã. (d) Leaked-password protection
desligada no Auth (toggle no painel).

### 🟡 PS-12 · `MODELO_PADRAO` divergiu entre cliente e edges (bug de configuração ativo)
> ✅ **Resolvido em 2026-08-28 (Plan03 · A4, commit `8e3be20`; redeploy no A5):** `MODELO_PADRAO` removido das
> duas edges; modelo = tenant → padrão global (`config_ia` `plataforma:global`, que o `realizador` passa a ler) →
> sem modelo = não configurado (503). Admin (`ia_global.ts`) sem modelo pré-preenchido. Produção: padrão global
> ganhou `deepseek-chat` e `gemini-2.5-flash` (decisão do dono); `plataforma.modelo` saiu de `gemini-flash-latest`.
> `.env.example` documenta `ANTHROPIC_API_KEY`/`DEEPSEEK_API_KEY`.
As edges hardcodam default para os 4 provedores
(`functions/proxy-ia/index.ts:193-198` ≡ `functions/realizador/index.ts:331-336`:
`claude-haiku-4-5`, `gpt-5.4-mini`, `gemini-2.5-flash`, `deepseek-chat`), enquanto o
admin nasce fail-closed (`src/admin/ia_global.ts:45-48`: só gemini tem default; claude/
openai/deepseek = `null`). Resultado: o operador vê "sem modelo padrão" e a edge usa
`claude-haiku-4-5` silenciosamente. O catálogo de modelos validado no cliente
(`src/admin/ia_config.ts:41-49`) não tem contraparte na edge. É a face mais perigosa da
duplicação src↔edge (ver DM-D). Relacionado: `.env.example:9,14` só documenta
`GEMINI_API_KEY` e `OPENAI_API_KEY` — `ANTHROPIC_API_KEY` e `DEEPSEEK_API_KEY` existem
nas 3 edges e não estão documentadas.

### 🟢 PS-13 · Assets órfãos publicamente servíveis
A allowlist do `server.js:62` libera `attached_assets/` para qualquer imagem; os 2 PNGs
órfãos (`image_1783432997224.png` + `image_1783433051494.png`, 81 KB, zero referências)
ficam servíveis em produção. Inofensivo, mas é superfície desnecessária.
(`og-pipoca.png` é VIVO — `landing.html:20-29`.)

### 🟢 PS-15 · Miudezas confirmadas
Admin sem rota amigável (`/admin.html` cru; `server.js:82-85` só mapeia `/`→landing e
`/app`→index). `contas_tenant`=0 e `conteudo`=0 em produção (vínculo conta-tenant e
publicação de conteúdo existem no código, nunca usados — coerente com fase MVP).
Marcadores TODO/FIXME/HACK/XXX reais no código: **zero** (os 6 hits de "TODO" são o
pt-BR "todo cadastro/todo usuário/todo o miolo"). `scripts/post-merge.sh` é hook do
Replit (`.replit:41-43`), mas o conteúdo (`npm install --legacy-peer-deps`) é vestigial
— a única devDependency é `typescript` (`package.json:22-24`).

---

## ML — Dossiês das melhorias do dono

### ML-1 · "Histórias de hoje num rodapé; não sei se salvam, não consigo ler"

**Intenção (reformulada):** dar às histórias terminadas um lugar visível e confiável —
salvar de verdade, achar fácil, reler com prazer.

**Diagnóstico verificado (a boa notícia primeiro):** a gravação FUNCIONA. O e2e cobre o
ciclo inteiro (80/80: captura → cartão → releitura → 💛 → retenção) e produção tem 5
histórias no espelho, **a última de hoje 19:07**. O problema real é composto de 4 partes:

1. **Descoberta:** a única listagem do app é uma faixa no pé da T3
   (`Tela3SelecaoCenario.dc.html:75-98`). Medido no screenshot 1280×800: o título começa
   em **y=668 de 800** — a estante vive nos últimos ~130px, cartões de ~200×55px com
   título truncado ("A luzinha do …"). É literalmente um rodapé.
2. **Ruído de intermediárias:** `normalizarHistorias` devolve completas E intermediárias
   misturadas (`historias.ts:197-222`), e o app grava uma intermediária **a cada rodada
   lida** (`estado.js:1078-1082`). Uma sessão de 4 rodadas gera ~3 cartões quase idênticos
   ao lado da história completa — parece duplicado/quebrado.
3. **Espelho write-only no dia a dia:** a leitura NUNCA consulta o remoto
   (`repo_sincronizado.ts:128-129`); o remoto só entra no boot e **só para perfil ausente
   localmente** (`sync.ts:71-84`). Trocou de aparelho/limpou o navegador com o perfil já
   presente → as histórias que EXISTEM no banco não aparecem. É a explicação mais provável
   do "ou se são [salvas], eu não consigo ler".
4. **Perda silenciosa possível:** push fire-and-forget com catch vazio (D-06,
   `repo_sincronizado.ts:130-133`) + poda de 20 dias/teto 30 (`historias.ts:41-51`).

**Onde mexe:** `Tela3SelecaoCenario.dc.html:75-98,105-132,262-271` (estante) ·
`src/core/historias.ts` (filtro de exibição p/ intermediárias — o campo `intermediaria`
já existe) · `src/telas/LeitorHistoria.dc.html` (reusar como está) ·
`src/backend/adaptadores/repo_sincronizado.ts:128-142` + `src/backend/sync.ts:71-84`
(leitura híbrida) · tabela `historias` (nada muda no schema; `atualizado_em` já existe).

**Abordagem sugerida (2 ondas):**
1. *UI (barata, alto impacto):* estante digna — ou uma tela "Minhas histórias" própria
   (registrar no Shell; a criança chega por um botão na T3), ou a seção da T3 promovida
   (cartões maiores, título inteiro, agrupamento "hoje/ontem/há N dias" reusando
   `dataRelativa`, `historias.ts:235-240`); **filtrar `intermediaria === true` da
   exibição** (ou colapsar em "rascunhos da história"); reusa `LeitorHistoria` e
   `favoritarHistoria` sem mudança.
2. *Sync (médio risco):* leitura híbrida no repo sincronizado (merge por id com desempate
   `atualizado_em` — resolve D-07 junto) + retry/telemetria no push (D-06). Fazer com
   teste dedicado, como o doc frente4 já recomendava.

**Só o dono decide:** tela dedicada vs seção maior; intermediárias somem ou viram rascunho.
**Risco/esforço:** onda 1 baixo/baixo · onda 2 médio/médio. **Verificação:** o e2e
linha-verde já cobre captura/releitura; adicionar caso de merge de dois aparelhos.

### ML-2 · "Organizar as tabelas de frases/sentimentos/relacionamentos para ampliar cenários"

**Intenção:** transformar os dados autorais do Quintal num formato replicável para os 4
cenários "Em breve" (Quarto, Floresta, Espaço, Fundo do Mar).

**Como os dados estão HOJE (3 camadas):**
| Camada | Arquivo | O que contém |
|---|---|---|
| Grafo v3 (motor A+ determinístico) | `docs/quintal.v3.json` (33 KB) | moldura (aberturas/conectivos/desfechos ×4 níveis), 4 rodadas, 7 objetos com `conta` (frase por nível ×3 variantes), `tempera` (frases condicionais "se tem:frasco"), `registro` (≈sentimento: "assombro / segredo") |
| Fichas v1 (matéria do LLM) | `docs/fichas/objetos.v1.json` (global), `relacoes.quintal.v1.json` (por cenário: 11 objeto×objeto + 7 objeto×cenário), `cenarios.v1.json` | identidade (descricao ×4 níveis, `sensacao.{dominante,registro,corpo}`), relações com `interacao` ×4 níveis, cenário com `voz_do_contador` | 
| Imagem | `src/telas/cenas.ts` (5 SVGs) + **cópia inline** `Tela3SelecaoCenario.dc.html:134-143` | quintal, quarto, floresta, espaco, fundomar |
Tipos canônicos: `src/core/fichas/tipos.ts:37-99` · lints prontos: `src/core/fichas/lint_fichas.ts`, `src/core/lint_grafo.ts`, `src/admin/validar_grafo.ts`.

**Atritos que hoje impedem "ampliar" (todos verificados):**
- Fetches **hard-coded** do Quintal: `estado.js:752-763` (grafo) e `:784` (relações) — não
  há descoberta de cenário.
- **Dois vocabulários de id**: a galeria usa keys de imagem (`quarto`, `floresta`) e o
  motor usa id canônico (`quintal_anoitecer`); `Tela3:250` compara um com o outro
  (`liberados.indexOf(d.key)`) — um cenário novo liberado por id canônico nunca casaria.
- `cenariosLiberados` **não tem UI de escrita** (só leitura em `Tela3:241`; `Regras.dc.html`
  não menciona cenário apesar do cabeçalho prometer).
- Âncoras do validador **duplicadas** repo↔edge (`validador.ts:56-66` ↔
  `functions/realizador/index.ts:206-214`) — objeto novo exige redeploy manual da edge
  (o próprio arquivo avisa, `functions/realizador/index.ts:191`).
- `objetos.v1.json` é global (não por cenário) — ok para reuso (lua/vento servem a vários
  cenários), mas precisa de convenção.
- Goldens/fixtures a regenerar: `src/core/fixtures/{composicao_golden_v2,composicao_golden_v3,pacote_golden_v1,prompt_golden_v1}.json`.

**Abordagem sugerida:** (1) manifesto de cenários (`docs/cenarios.index.json`:
id canônico → {arquivo do grafo, arquivo de relações, svgKey, nome, descrição}) e os 2
fetches derivam dele; (2) unificar o vocabulário: galeria passa a carregar o id canônico
(mapa key→id no manifesto); (3) UI de cenários liberados na tela Regras (o campo e a
leitura na T3 já existem); (4) âncoras: gerar a tabela da edge a partir do canônico no
build, ou aceitar e documentar o redeploy; (5) pipeline de autoria = escrever JSONs +
rodar os lints existentes + goldens. **Só o dono decide:** autoria à mão vs via admin
(`Conteudo.dc.html` existe e `conteudo` está vazio em prod — decisão de rumo);
objetos globais vs por cenário. **Risco/esforço:** plumbing baixo/médio; o custo real é
**conteúdo** (por cenário: grafo 4 níveis ×3 variantes + temperas + 3 fichas + SVG).

### ML-3 · "Navegação: trocar de criança é difícil; da tela de cenários não chego na pontuação"

**Intenção:** trocar de leitor e alcançar o pote (pontuação) sem descer ao portão parental.

**O que está verificado hoje:**
- **Trocar de criança = 7 passos**: T3–T7 ⚙ → PainelA11y → "🔒 Sou o adulto"
  (`PainelA11y.dc.html:111-115`) → T1 PIN → T8 → "↩ Painel" → T11 → Perfis → "Usar este"
  (`Perfis.dc.html:239-246` — **não navega**) → "↩ Para a criança"
  (`PainelCuidador.dc.html:106`) → T2. Nenhuma tela infantil tem botão para a T2; a T3
  **não tem sequer botão voltar** (grep confirmado).
- **Pote inalcançável da T3**: T7 só tem entrada pela T6 (`Tela6Recompensa.dc.html:62-63`);
  saídas da T3 são apenas: cenário→T4, ⚙→A11y, cartão de história→overlay
  (inventário completo em `Tela3:33,46,62,84,90`). O header da T3 mostra avatar, saudação
  e o **saldo de vaga-lumes — não clicável** (`Tela3:15-32`; sonda: 8 alvos na tela, saldo
  fora).
- API pronta para isso: `setState({tela:n})` respeita a guarda KIDMODE
  (`estado.js:130-142`); `selecionarPerfil(p, telaDestino)` já aceita destino (`:452`);
  T2 é por design o "login visual sem senha" da criança — voltar a ela não fura o KIDMODE.

**Abordagem sugerida (tudo dentro do padrão existente):** (1) avatar do header da T3
tocável → T2 ("trocar leitor"); (2) saldo 🟡 tocável → T7 (e a T7 já volta via "Brincar
de novo"→T3); (3) opcional: botão voltar discreto na T4→T3 já existe; adicionar T3→T2
explícito se o avatar não bastar como affordance. Reusa: `setState`, guarda, sondas de
alvo ≥44px. **Só o dono decide:** trocar de leitor exige portão? (recomendação: não — T2
é superfície livre por design; quem exige portão são as telas adultas). **Risco/esforço:**
baixo/baixo (markup das telas + rebuild `build:app`; conferir os MARCADORES dos e2e).

### ML-4 · "Avatars parecem diabinhos; usar emoticons"

**Intenção:** trocar os 5 bichinhos SVG por rostos amigáveis (emojis), sem quebrar perfis.

**O que os avatars são hoje:** SVG gerado por código — cabeça redonda + orelhas por tipo
(`pup/fox/bear/cat/bird`) + 3 cores. Confirmação visual (screenshot da T2): as orelhas
triangulares de `pingo` (azul) e `lua` (roxa) leem como **chifres** — a percepção
"diabinho" procede. Ids canônicos: `src/core/perfil.ts:31`
(`pingo, fubá, cacau, lua, tuca` — nota: **"fubá" com acento no id literal**).

**A dívida que a troca expõe (e resolve de graça):** a definição está **duplicada em 6-7
lugares** — `src/telas/avatares.ts:31-39` (fonte-espelho **sem nenhum importador**, o
próprio cabeçalho avisa) + cópias SVG inline em `Tela2:65-92`, `Tela3:145-171`,
`Tela7:118-140` + defs `{id,name,cor}` de outro formato em `Onboarding:104-112` e
`Perfis:128-136` (o picker do cadastro mostra **disco com inicial**, nem o bichinho —
a criança escolhe um círculo colorido e recebe um bicho). O motivo da duplicação: telas
`.dc.html` não importam módulos; o canal certo é o **bridge** (padrão já usado:
`Canon.historias`, `Canon.a11y`...).

**Abordagem sugerida:** (1) criar `Canon.avatares` no `bridge.ts` expondo a tabela única
`{id, nome, cor, emoji}` (fonte: reativar `src/telas/avatares.ts` ou mover para
`src/core/`); (2) render passa a ser **emoji sobre o disco colorido** nas 5 superfícies
(Tela2, Tela3 header, Tela7 header, Onboarding picker, Perfis picker) — remove as 3
cópias de SVG; (3) manter os **ids e cores atuais** (perfis existentes seguem válidos;
`normalizarAvatar`, `perfil.ts:91-94`, continua o guardião). **Só o dono decide:** os 5
emojis (ex.: 🐶 🦊 🐻 🐱 🐦 mantém a metáfora; 😀 🌟 🦄 🍿 🌙 muda a identidade) e se o
picker do cadastro passa a mostrar o avatar real. **Risco/esforço:** baixo/baixo-médio.
Atenção: emoji renderiza diferente por plataforma (tablet Android × Windows) — validar
com screenshot no aparelho real; alvo de toque atual (140×180) é ótimo, manter.

### ML-5 · "O envio para a IA e o retorno devem ser um pacote com tudo para um texto encantador"

**Intenção:** consolidar ida e volta da IA num contrato único, rico o bastante para
textos bonitos — sem vazar responsabilidade para o cliente.

**O que JÁ existe (e é força):** o fluxo vivo já é um pacote: `PacoteComposicao`
(`pacote.ts:62-88`: cenário {descricao, voz_do_contador, sensacao_no_personagem} +
personagem {nome, genero} + nivel + beats ordenados {objeto, papel, descricao, corpo,
relacoes[]} + eco + restricoes) → prompt determinístico (`prompt_template.ts:183-262`:
3 leis + proibições + ritmo por nível + few-shot personalizado + eco + comprimento) →
edge com cascata de provedores, validador de fidelidade espelhado e resposta estruturada
`{texto, paragrafos, veredito, origem, metadados}`; não-PASS nunca chega à criança
(`proxy_realizador.ts:90-97`), fallback A+ local em 8s (`estado.js:777`). **Não jogar
isso fora.**

**Lacunas concretas (verificadas):**
1. **Material autoral dormente:** as fichas têm `sensacao.registro` (o sentimento:
   "encanto silencioso") e `sensacao.dominante` (sentido: "visão") — e o compositor **não
   os põe no pacote** (`compor.ts:141-160` usa só `descricao`, `corpo`, `relacoes`;
   `pacote.ts` nem tem os campos). O "sentimento" que o dono quer mandar para a IA já
   está escrito — só não viaja.
2. **Prompt montado no cliente** e enviado junto (`proxy_realizador.ts:71,80`): duas
   fontes de verdade (mudar o prompt = rebuild do bundle + redeploy do validador), e a
   edge aceita `prompt` arbitrário de quem tem sessão (superfície de injeção mitigada
   pelo validador/guardrails, mas desnecessária).
3. **Request duplica informação** (pacote + prompt derivado dele) — o "pacote único" do
   dono é literalmente: mandar SÓ o pacote e a edge montar o prompt.
4. Temperatura fixa 0.4 default (`functions/realizador/index.ts:479`); sem espaço hoje
   para "tom da casa" (ex.: mais poético/mais calmo) — se desejado, é um campo novo de
   `config_ia`, não do cliente.

**Abordagem sugerida:** (1) Pacote v1.1 **aditivo**: `beats[].sentimento` (=registro),
`beats[].sentido` (=dominante) — `compor.ts` já lê as fichas, é passar adiante;
(2) `prompt_template.ts` consome os campos novos (uma linha por beat no MATERIAL);
(3) mover `montarPromptRealizador` para a edge e o cliente enviar só `{pacote,
tenantId?}` — a edge já é self-contained por decisão (`functions/realizador/index.ts:23-24`),
então é **espelhar** o template lá (mesmo padrão do validador) OU introduzir um passo de
build da edge a partir do core (decisão estrutural do dono); (4) regenerar goldens
(`prompt_golden_v1.json`) e validar com `scripts/smoke-realizador.mjs`.
**Conflitos/pré-requisitos:** **PS-01 vem antes** (não faz sentido enriquecer o envio
enquanto o consentimento não gateia o envio); duplicação repo↔edge (PS já conhecido);
cota/custo (mais tokens de prompt). **Risco/esforço:** enriquecer = baixo/médio;
mover prompt p/ edge = médio (contrato + redeploy + testes).

---

## DM — Código morto e duplicações

Método: grep de importadores excluindo `*.test.ts` e os 3 bundles; presença só em bundle
não conta como vivo. Três categorias: **remoção segura** (prova de zero uso), **morto —
decisão do dono** (morto no cliente, mas com par deployado/contrato documental), e
**duplicação** (vivo em N cópias).

### DM-A · Remoção segura (prova de não-uso; ~1.400 linhas + ~1.100 de teste + ~85 KB)

| Item | Prova resumida |
|---|---|
| `src/ia/{orquestrador,prompt,simulado}.ts` + `adaptadores/{claude,gemini,openai,deepseek,selecionar}.ts` (~800 L) | subgrafo fechado: nenhum import a partir de `bridge.ts:49-172`, `bridge_admin.ts:38-124`, `estado.js`, `estadoAdmin.js`; símbolos (`criarOrquestrador`, `criarProvedorSimulado`, `selecionarAdaptador`, `envolverComGuardrails`…) com **0 ocorrências nos 3 bundles**; `prompt.ts` tem zero importadores (nem teste). `ia.test.ts` (493 L) sai junto |
| `src/core/roteador.ts` (51 L) | zero importadores (o cabeçalho `:5,:11` admite); o vivo é `roteador.js` (`index.html:12`, `admin.html:12`). ⚠ contrato DIVERGENTE do gêmeo (`roteador.js:17`: assinante recebe `n`; no `.ts`, sem argumento) — gêmeo é armadilha, não reserva |
| `src/componentes/CartaoHistoria.dc.html` (179 L) | nenhuma das 22 tags `dc-import` do repo o monta; `docs/plans02/analise-superficies-leitura.md:100` já o marcava órfão |
| `playwright.config.ts` | `@playwright/test` NÃO está em `devDependencies` (`package.json:22-24` = só typescript); nenhum script o invoca; espera `*.spec.ts` que não existem mais |
| `.thumbnail` (WebP 3 KB), `.canvas/` (1 png) | zero referências |
| `attached_assets/image_1783432997224.png` + `image_1783433051494.png` (81 KB) | zero referências (e servíveis — PS-13) |
| 15 dos 19 exports de `src/core/perfil.ts` | `AVATARES`, `AvatarId`, `AVATAR_PADRAO`, `NIVEL_PADRAO`, `IDADE_MIN/MAX`, `GENEROS`, `GeneroPerfil`, `perfilVazio`, `clampIdade`, `normalizarNome/Nivel/Avatar`, `RepositorioPerfil` (classe, superseded por `RepositorioLocalStorage`) — vivos só: `criarPerfil`, `NOME_PADRAO`, `normalizarGenero`, `validarPerfil`, `Perfil`. Ironia: o catálogo canônico de avatares que ninguém consulta (ver ML-4) |
| `historias.ts`: `MAX_INTERMEDIARIAS_NAO_FAVORITAS` (`:51`), `OrigemHistoria` (`:63`) | sem consumidor externo |
| `old/` e `docs/plans02/fase15_migracao_firebase/` | vazios e untracked (git nem os vê) |

### DM-B · Morto — decisão do dono

| Item | Por quê não é remoção mecânica |
|---|---|
| Stubs firebase (`auth_firebase.ts` + `repo_firebase.ts`, 97 L) + ramo `"firebase"` (`backend.ts:55-56,183-188,269`; `config.ts:34,59-62`) + `rules_firebase.txt` | inalcançável por config real (`pipoca.config.js:17-21` hardcoda supabase; e2e injetam local/supabase), mas: compilado nos 2 bundles, testado por 4 asserções (`backend.test.ts:98,134,139,140`) e citado como contrato de paridade (`docs/plans/fase06_backend/PARIDADE.md:14`). Com o Firestore abandonado, a recomendação é aposentar tudo (código+testes+parágrafo de doc) numa faxina única |
| `src/ia/guardrails.ts` (124 L) | morto no cliente, mas as 2 edges o declaram "o CANÔNICO" do qual são espelho (`functions/proxy-ia/index.ts:31,44,69`; `functions/realizador/index.ts:81`). Remover órfã a fonte-de-verdade declarada — decidir junto com DM-D |
| Edge `proxy-ia` (Geração 1, deployada v4 ACTIVE) | o cliente vivo não a chama (`proxyIA` instanciado em `backend.ts:204` mas `bridge.ts` não o expõe); aposentar a edge é decisão de produto (custo zero de mantê-la; superfície a mais) |
| `attached_assets/Pasted--Prompt-*.txt` | `docs/plans02/fase14.../14-01_arquivamento-em-old.md:38` registra decisão pendente de arquivamento |
| `.agents/` (7 arquivos de memória de agente) | zero refs de código, mas contém doc única não-duplicada (ex.: `roteamento-landing.md` é a única explicação do mapeamento `/`→landing). Migrar o útil para `docs/` antes de apagar |

### DM-C · Vivo com aparência de morto (NÃO remover)

`src/ia/provedor.ts` (11 importadores vivos — `transportePadrao` é o transporte HTTP de
todo o backend) · `src/backend/proxy_ia.ts` (instanciado no caminho default de produção,
`backend.ts:60,204`) · os dois `compor()` homônimos são **camadas**, não concorrentes
(v3 `composicao.ts:482,526` = motor A+/fallback; gen2 `compositor/compor.ts:127` =
fichas→Pacote, chamado por `geracao.ts:196`) — homonímia documentada em
`composicao.ts:20-21` · `roteador.js` · `landing.html` (servida em `/`) ·
`scripts/post-merge.sh` (hook `.replit:41-43`) · `attached_assets/og-pipoca.png`.

### DM-D · Duplicações vivas (o risco é deriva, não lixo)

**10 tabelas duplicadas entre `src/` e `functions/`, 4 triplicadas** — mapa completo:
guardrails (`RE_TERMOS` + `RE_URL/EMAIL/TELEFONE`: `src/ia/guardrails.ts:53,60+` ×
`proxy-ia:70,73-75` × `realizador:82,85-87` — conteúdo hoje idêntico, verificado);
`SECRET_POR_PROVEDOR` (3 cópias, só em `functions/`); `MODELO_PADRAO` (4 cópias, **JÁ
DIVERGIU** — PS-12); `MAXIMO_PALAVRAS` + `ANCORAS_POR_OBJETO` + 6 limiares do validador +
`TERMOS_CORPO`/`ADJ_F`/`ADJ_M` (cliente↔edge, até as mensagens de erro copiadas);
`PROVEDORES`; e intra-src: a gramática de condições
(`composicao.ts:200-231` × `compositor/gramatica.ts:40-69`, espelho auto-declarado) e os
avatars/cenas em 6 cópias (ver ML-4). Recalibrar guardrails hoje = 3 edições + 2
redeploys.

**Ciclos de import:** 2, ambos type-only (inofensivos em runtime):
`persistencia/index.ts:37` ⟷ `RepositorioLocalStorage.ts:36` e `backend.ts:60` ⟷
`proxy_ia.ts:40`. Correção barata: extrair as interfaces para `tipos.ts`.

**Pureza do core:** ✅ conforme — única linha executável tocando `window` fora de
`persistencia/` é `roteador.js:66`, exceção declarada e intencional.

## UI — Varredura de interface

Base: 33 screenshots reais (1280×800 tablet + 390×844 celular) capturados com o harness
playwright dos e2e em backend local, sondas quantitativas (`probes.json`: alvos de toque
medidos, posição da dobra) e leitura linha-a-linha dos `.dc.html`. Contrastes calculados
dos hex REAIS dos arquivos (que divergem dos tokens nominais).

### UI-C · Telas da criança (T1-T7 + overlays)

**Estruturais (contaminam tudo):**
- 🔴 **UI-C01 · Os tokens de acessibilidade são mecanismo morto**: `tokens.css:85,102`
  escuta `[data-reduce-motion]`/`[data-contrast]` (atributos), mas o Shell aplica
  **classes** (`Shell.dc.html:98-100`: `pip-dyslexia|pip-contrast|pip-reduce-motion`) —
  os atributos nunca são setados em lugar nenhum. `--pip-mov` fica permanentemente em 1;
  os componentes que calculam movimento por token (`Vagalume:32,35`, `Botao:35-37`,
  `ChipObjeto:25-26`, `BarraLeitura:22`, `index.html:51`) só não quebram porque o
  blanket `!important` de `index.html:40-44` cobre por cima. Proteção acidental, não
  arquitetural.
- 🔴 **UI-C02 · "Alto contraste" DESTRÓI os botões primários**: `index.html:38`
  (`.pip-contrast * { color:#1a1008 !important }`, sem exceção para superfícies escuras)
  torna quase-preto o texto branco de todo CTA laranja/verde ("Brincar aqui →",
  "Continuar a história ›", "Pronto"…). A função de acessibilidade piora a legibilidade
  para quem mais precisa.
- 🟡 **UI-C03 · `var(--pip-dur-curto)` não existe** (só `-rapido`/`-medio`) —
  `PortaoParental.dc.html:18`, `IaToggle.dc.html:18,21`: transições descartadas em
  silêncio.

**Contraste (WCAG, hex reais):**
- 🔴 **UI-C21 · Todo botão primário do app falha**: branco sobre gradiente
  `#e8965a→#d5713f` = **2,35 a 3,35:1** (reprovado para os rótulos de 14-17px usados) —
  `Tela3:54`, `Tela5:81,96`, `Tela6:63`, `Tela7:245,255`, `PainelA11y:63`. Um ajuste de
  cor conserta o app inteiro de uma vez.
- 🔴 **UI-C22 · Ordinais "1º 2º 3º" dos slots da T4**: 1,74:1 (`Tela4:292`).
- 🟡 **UI-C25/C26 · Toda a microcópia de ajuda** (`#9a8a72`/`#8a7a64` sobre claros,
  11-15px): 3,3-3,6:1 — descrições dos toggles, "toque para reler", dicas da T4, estados
  vazios. 🟡 **UI-C28**: contador de vaga-lumes (`#b8693c`/`#fff3da`, 3,72:1) presente
  em 5 telas. 🟡 **UI-C29/C30**: texto acolhedor do "travou" (T5) e selo "🔒 âncora" a
  10px (2,63:1).
- Passam bem: tinta/creme **11,5:1**, tinta/areia 10,6:1, branco/heeler 5,3:1.

**Alvos de toque (sondados; mínimo criança ≥48px, ideal 5-8 anos ≥75px):**
| Achado | Elemento | Medido |
|---|---|---|
| 🔴 UI-C12 | T4 controles de reordenar ◀ ✕ ▶ (`Tela4:256`) — a mecânica-coração | **26×26** |
| 🔴 UI-C13 | PainelA11y: 4 toggles (`PainelA11y:81`) | **50×28** |
| 🔴 UI-C14 | T3 coração 🤍/💛 (dentro de outro alvo clicável, `Tela3:90`) | **34×34** |
| 🟡 UI-C15/C16/C17 | ✕ fechar (38), ← voltar e ⚙ (40-42) | 38-42 |
Padrão: os alvos **primários** são generosos (avatares 140×180, CTAs 57px, PIN 99×56);
os de **navegação/saída/ajuste/edição** estão todos abaixo de 44px — a criança avança,
mas não volta, não corrige, não se ajusta.

**Fluxo e becos:**
- 🔴 **UI-C34 · T3 sem volta e sem pote** (ver ML-3).
- 🔴 **UI-C35 · T6 é a única tela sem NENHUMA saída lateral nem ⚙** — no momento de
  maior carga emocional, quem precisa de ajuste de fonte/movimento não tem como
  (`Tela6Recompensa.dc.html:22-67`; PainelA11y abre só de T3/T4/T5/T7).
- 🔴 **UI-C04 · Cartões "Em breve" são armadilhas mudas**: `<button>` sem `disabled`,
  `pick: () => {}` (`Tela3:62,255-258`) — 4 dos 5 alvos grandes da tela principal não
  fazem nada, sem som, sem sacudida, sem mensagem.
- 🟡 **UI-C39 · Cinco toques engolidos em silêncio** (`Tela3:258`, `Tela4:305,344,398`,
  `Tela7:243`) — para a faixa etária, silêncio é o pior feedback possível.
- 🟡 **UI-C37 · Voltar da T5 descarta a composição sem aviso** (`Tela5:355-361` +
  `Tela4:136-141`), com o ← exatamente onde a criança toca por reflexo.
- 🟡 **UI-C06 · T4 pode exibir instrução impossível** ("Escolha 3 coisas" com banco de
  1 chip e CTA travado, `Tela4:266,298-311`). ⚠ *Incerteza honesta: o screenshot que
  revelou isso usou estado semeado por seam; confirmar no fluxo real (a R1 real nasce
  com banco 4). O risco genuíno é o par com UI-C37 (voltar da T5 e re-entrar).* 
- 🟡 **UI-C08 · Barra "como dividir" da T7 quebrada por bug de string**:
  `Tela7:265` devolve `"67%"` e `:65` interpola `width:{{ spendPct }}%` → `width:67%%`
  (CSS inválido, largura 0) — a única lição de educação financeira aparece 100% azul,
  contradizendo os números ao lado. 🟡 **UI-C09**: "~2 / ~1" lê como **−2/−1** em Baloo
  2 (aproximação é conceito acima da faixa).
- 🟢 **UI-C40**: resgatar recompensa não celebra nada. 🟢 **UI-C10**: 4 gramáticas de
  cabeçalho em 6 telas. 🟢 **UI-C11**: 3 linguagens diferentes de "carregando".

**Texto e tom:**
- ✅ A escrita é o diferencial do produto — preservar literalmente: "Essa palavra é
  trupé, né? Sem pressa." / "Aqui ninguém erra." (`Tela5:69-70`), "Os dois contam —
  tentar já é leitura. 💚" (`Tela5:99`), "Gastar é só seu — sem pressa, sem cobrança."
  (`Tela7:79`).
- 🟡 **UI-C41 · Nível de leitura acima da faixa em pontos-chave**: "âncoras"
  (`Tela4:266` + selo `:62` — metáfora abstrata num app de alfabetização), "Leitor em
  ascensão" (`Tela3:18` — vocabulário de ensino médio, e **sem concordância**: "Leitor"
  fixo para perfil feminino), "guardar p/ o sonho" (abreviação ilegível para leitor
  iniciante, `Tela7:70`). 🟢 **UI-C42**: a instrução mais longa/pequena/apagada do app
  está na tela que mais precisa ser entendida (T4), sem botão de áudio (o TTS existe e
  só a T5 usa).

**Leitor de tela e teclado (narrativa real conferida):**
- 🔴 **UI-C43 · As duas mecânicas centrais são inacessíveis**: palavras da T5 são
  `<span onClick>` sem role/tabindex (`Tela5:59`); T4 inteira com **0 aria** — a ordem
  da cena nunca é anunciada, ◀ ✕ ▶ anunciam só "botão".
- 🔴 **UI-C44 · Zero `:focus-visible` no repo** — navegando por Tab em T2-T7 não há
  NENHUMA indicação de onde o foco está (WCAG 2.4.7). Os poucos `:focus` são inputs de
  telas adultas com `outline:none`.
- 🔴 **UI-C45 · Nenhum overlay gerencia foco**: PainelA11y/LeitorHistoria/PedirGenero
  sem `role="dialog"`, `aria-modal`, foco inicial, trap ou Esc.
- 🟡 **UI-C46**: toggles sem `role="switch"`/`aria-checked` — o leitor de tela não
  consegue dizer se "Alto contraste" está ligado. 🟡 **UI-C47**: emojis funcionais sem
  rótulo (⚙ ← ✕ ◀ ▶ �favoritos). T6: celebração inteira sem `aria-live` — o leitor de
  tela nunca sabe que a criança ganhou algo.
- ✅ **UI-C48 · `PortaoParental` (T1) é o padrão-ouro interno** — `role="dialog"`,
  `aria-modal`, `aria-live`, `aria-label` por tecla, alvos 56px, e é a única tela que
  usa tokens em vez de hex crus. Copiar esse arquivo é o caminho mais barato para o
  resto.

**Movimento:** 🟡 UI-C49 (o multiplicador `--pip-mov` é inerte — ver UI-C01); 🟡 UI-C50
(transições inline com durações fixas fora do sistema); 🟡 **UI-C51**:
`.pip-chip:hover{transform:translateY(-3px)}` (`Tela4:16`) não é coberto pelo blanket —
com "reduzir movimento" LIGADO o chip continua saltando, só que instantâneo (pior);
🟢 UI-C52: `backdrop-filter: blur()` em 8 superfícies sem desligamento.

**Responsividade (zero media queries no repo):**
- 🔴 **UI-C53 · T2 no celular é bloqueio duro**: título decapitado, marca sobrepondo,
  "⚙ Sou o cuidador" fora da tela — container `overflow:hidden` sem scroll
  (`Tela2:15,20` + `Shell:16`); com 3+ perfis num celular, o adulto não alcança os
  ajustes.
- 🔴 **UI-C54 · T3 no celular**: grade 2×2 fixa espreme cartões a ~90px, textos
  quebrados em 3-5 linhas, pílula colidindo com texto (`Tela3:43,46,60` — flex/grid sem
  wrap). 🟡 **UI-C55**: carrossel de histórias corta o 2º cartão sem pista de scroll.
  🟢 UI-C57/C58: T5 é a que melhor sobrevive (graças ao `clamp()` de `Tela5:387-389` —
  única resposta responsiva genuinamente boa); T4/T7 sem plano para retrato.

**Top 8 oportunidades da criança (impacto × custo):**
1. Corrigir contraste dos CTAs (um ajuste de cor conserta o app; UI-C21) — altíssimo/muito baixo.
2. Desfazer `.pip-contrast *` + unificar classe↔atributo dos tokens (UI-C01/02/03/49) — altíssimo/muito baixo.
3. Saídas: trocar-leitor e pote na T3; ⚙ na T2/T6 (UI-C34/35, =ML-3) — altíssimo/baixo.
4. Resolver o beco da T4 + nunca travar CTA sem caminho (UI-C06/36/39) — altíssimo/baixo-médio.
5. Alvos de navegação/edição ≥48px (min-height/padding, não redesenho; UI-C12-C20) — alto/baixo.
6. Foco visível global + semântica nas 2 mecânicas + dialogs (UI-C43-C46) — alto/médio.
7. Media queries para retrato: scroll na T2, wrap na T3 (UI-C53-C55) — alto/médio.
8. Nunca engolir um toque + consertar `67%%` e "~2" (UI-C39/C08/C09/C40) — médio-alto/baixo.

### UI-A · Telas do cuidador (T8-T16) + admin (SA1-SA7)

**Fluxo do cuidador:**
- 🔴 **UI-A20 · Aterrissagem pós-PIN em T8 é a escolha errada**: o gesto mais deliberado
  do produto (PIN) desemboca num relatório de zeros — não numa ferramenta
  (`estado.js:183-187`). 🟡 **UI-A21**: T8 aparece 2× na navegação e o hub T11 nunca é
  nomeado (só `↩ Painel`). 🟡 **UI-A22**: dois botões "➕ Novo perfil" idênticos com
  destinos diferentes (T11→Onboarding vs T12→formulário inline).
- 🔴 **UI-A23 · "Usar este" (T12) é quase mudo**: `Perfis.dc.html:239-246` seleciona sem
  navegar; a tela nem assina o App — o único feedback é um badge a ~300px do polegar.
  O gesto central de uma casa com 3 crianças parece não funcionar.
- ✅ **UI-A24 resolvido em 2026-08-28 (Plan03 · A2, commit `f9aca22`)** — indisponibilidade com motivo ANTES do
  gesto (mesmo padrão de "Pela voz · Indisponível"), gesto inerte quando indisponível, copy sem "Motor A/B" e com o
  que a IA recebe. Registro original:
- 🔴 **UI-A24 · O toggle de IA é um beco de contradição** (consequência de PS-02 na UI):
  estado inicial "Desligado" sem aviso → o cuidador LIGA (registra `iaLigada:true` no
  save da criança) → só então aparece, para sempre: "Sem provedor de IA configurado — na
  prática a criança continua no Motor A" (`IaToggle:42,79`). A única forma de descobrir
  que a IA "não funciona" é autorizá-la para o próprio filho; e se `C.ia` um dia existir,
  o `true` gravado vira permissão retroativa sem novo consentimento. Combinar com PS-01:
  na prática é o inverso — a IA roda sem o consentimento. O padrão certo já existe na
  mesma tela ("Pela voz · Indisponível", `Regras:188`).
- 🔴 **UI-A25 · Cenários liberados: capacidade sem UI** (=ML-2): o núcleo entrega
  (`bridge.ts:231`), a T3 lê (`Tela3:241`), o cabeçalho de `Regras.dc.html:5` promete —
  e nenhuma tela escreve o campo. `cenariosLiberados` é `null` para 100% das famílias.
- 🔴 **UI-A01 · T8 se autocontradiz no vazio**: "ainda não teve leitura" + MINUTOS 0 ao
  lado de "1 dia ativo" e "POTE ✨ 3" (`PainelEvolucao:195` vs `:229-234`). 🟡 UI-A02/A03:
  grade de 5 cartões em 2 colunas (pote órfão); texto longo no slot de valor numérico.
- 🔴 **UI-A04/A05 · Chips idênticos com 4 significados** (T8 filtra; T13/T14/T15 editam;
  T12 usa um 5º conceito) — e em T15 o escopo do chip é invisível no controle de
  privacidade que ele governa (`Privacidade:150-157`): dá para desligar a coleta da
  criança errada sem perceber.
- 🔴 **UI-A08 · T16: 5 campos de segurança só com placeholder** (o rótulo some ao
  digitar; "PIN atual" e "PIN novo" viram dois campos de bolinhas iguais,
  `ContaCuidador:37-65`). 🟡 UI-A09: botão primário "Trocar a senha" plenamente
  habilitado logo abaixo do texto que declara a troca sem efeito. 🟡 UI-A10: validação
  só pós-clique, num status único longe do campo (idade aceita 40, `Perfis:193`).
  🟡 UI-A07: jargão vazando ("Exportar JSON" 3×, "Motor B", "a plataforma").
- 🟡 **UI-A11 · Alvos adultos sistematicamente < 44px** (chips 38px, Editar/Remover
  ~35px, links da T9 ~30px) — a superfície adulta é MENOS tocável que a infantil,
  invertido do esperado (adulto usa celular, com pressa, no escuro).

**Login (T9):**
- 🔴 **UI-A26 · O "desabilitado" mente**: "Entrar" apagado com `cursor:not-allowed` mas
  SEM `disabled` e com onClick ativo (`LoginFamilia:62,259-263`; idem Onboarding e
  SaLogin). `disabled` real: 0 ocorrências em 19 telas. 🟡 UI-A27/A28: Enter não
  submete no campo e-mail (e no modo "recuperar" NENHUM campo submete); não existe
  `<form>` em tela nenhuma (gerenciadores de senha e teclado móvel "Ir" perdidos).
  🟢 UI-A32: zero autofocus. 🟡 UI-A29/A30: "Entrar com Google" é um G caseiro em Baloo
  na paleta do produto (perde o reconhecimento que justifica social login) e a falha do
  Google aparece ~180px acima do gesto. 🟢 UI-A31: "Criar conta" é o menor alvo da tela.
- ✅ Preservar: modos bem nomeados, recuperação neutra por princípio, erros redigidos
  com cuidado em `role="status"`, `autocomplete` correto, deep-link da landing.

**Admin (SA):**
- 🔴 **UI-A13 · A barra fixa cobre o topo de 6 das 7 telas** (eyebrow cortado; em SA_HOME
  até o "Sair"): `AdminShell.dc.html:29` põe `padding-top:52px` mas os filhos usam
  `position:absolute;inset:0` — o padding não empurra nada. Correção de 1 linha.
- 🟡 UI-A14: switch + botão "Kill-switch" concorrentes por flag, sem explicar a
  diferença (às vezes no-op, `Seguranca:35,38,95-96`). 🟡 UI-A15: sem navegação lateral
  — "criar tenant → configurar IA → conferir flags" custa 6 navegações. 🟡 UI-A16/A17:
  vocabulário cru ("tenant", "write-only", "schema") e nota de roadmap no login ("chega
  na fase 06"). 🟢 UI-A18/A19: operador identificado só por hash; zero estado de erro
  projetado justamente onde mais se falha (validar JSON, testar provedor).
- ✅ Preservar: separação visual/verbal das duas superfícies, a faixa "área do operador —
  não é a tela da criança", estados vazios que nomeiam o próximo passo, fail-closed
  atenuado do CartaoArea, honestidade de SA7 ("nada aqui finge salvar").

**Sistema de design e a11y adulta:**
- 🔴 **UI-A34 · O admin não carrega o sistema**: importa `tokens.css` e usa `var(--pip-`
  ZERO vezes (paleta paralela inteira não-tokenizada); `admin.html` não tem as classes
  transversais de a11y — o operador não tem alto contraste nem redução de movimento.
- 🟡 **UI-A33 · tokens.css declara-se fonte da verdade e é ignorado**: ~470 hex crus vs
  ~68 `var(--pip-*)` nas telas adultas+admin; `IaToggle` é o ÚNICO arquivo conforme (0
  hex, 22 vars) — e o único que destoa visualmente (UI-A12), prova de que os tokens
  divergiram do desenho praticado (`--pip-raio-2`=16px vs 22px usado em todo cartão
  real; `--pip-creme` ≠ o creme das telas). Corrigir os TOKENS, não o arquivo.
- 🟡 **UI-A35/A36**: terceira terracota `#b8693c` fora do sistema (landing + T11);
  landing autocontida com `var(--pip-*, fallback)` que nunca resolvem — identidade
  fiel por cópia manual, 3 fontes de verdade para 1 marca. 🔴 **UI-A37**: o
  `.pip-contrast *` também destrói os estados selecionados adultos (=UI-C02).
- 🔴 **UI-A38 · Zero ARIA em T11 e T8** (hub e painel): emojis lidos literalmente
  ("menina Perfis maior-que"), SVGs `role="img"` sem label. 🟡 UI-A39: seleção só por
  cor, sem `aria-pressed`/`radiogroup` — teclado/leitor não sabe qual criança está
  ativa. 🟡 UI-A40: foco invisível em todos os botões. 🟢 UI-A41/A42: ordem de Tab ok;
  `aria-live` bem usado (só faltaria `role="alert"` para erros).

**Top 6 oportunidades do adulto/operador:**
1. Overlap da barra admin — 1 linha, 6 telas (UI-A13) — alto/trivial.
2. Resolver a mentira do `C.ia` ANTES de qualquer coisa de IA (UI-A24 + PS-01/PS-02) — confiança/baixo.
3. Aterrissagem pós-PIN → T11 + feedback no "Usar este" (UI-A20/A21/A23) — alto/baixo.
4. UI de cenários liberados em T14 (UI-A25, =ML-2) — valor enorme/médio.
5. `disabled` honesto + `<form>`/Enter universal (UI-A26/A27/A28) — alto/baixo.
6. ARIA mínimo + foco visível + desfazer `.pip-contrast *` (UI-A37/A38/A39/A40) — alto/médio.

---

## Consolidação

### Os 10 achados que importam mais (todos os eixos)

| # | ID | Achado | Sev. |
|---|---|---|---|
| 1 | PS-01 | Consentimento de IA e kill-switch não gateiam a Geração 2 — nome+gênero da criança vão ao LLM com IA "desligada" | 🔴 |
| 2 | PS-03 | `registrar_uso_ia` executável por `anon` via REST (DoS de cota barato) + RPC sem uso nas edges | 🔴 |
| 3 | UI-C21 + UI-C02 | Contraste dos CTAs reprovado (2,35:1) e o modo "alto contraste" piora tudo (`.pip-contrast *`) | 🔴 |
| 4 | ML-1 | Histórias salvas: estante-rodapé + intermediárias misturadas + espelho write-only no dia a dia (D-06/D-07) | 🔴 |
| 5 | UI-C53/C54 | Celular: T2 bloqueio duro (título decapitado, saída inalcançável), T3 espremida — zero media queries | 🔴 |
| 6 | ML-3 / UI-C34/C35 | Navegação da criança: sem trocar-leitor, pote inalcançável da T3, T6 sem nenhuma saída | 🔴 |
| 7 | PS-04 | dc-runtime sem fonte (runtime inemendável) | 🔴 |
| 8 | UI-A24 + PS-02 | Cadeia de consentimento cortada na UI: toggle inerte que só avisa DEPOIS de ligar | 🔴 |
| 9 | PS-12 | `MODELO_PADRAO` divergiu cliente↔edge (admin mostra "sem modelo", edge usa claude-haiku silenciosamente) | 🟡 |
| 10 | PS-05 + PS-08 | Admin bundle 12 dias defasado do core compartilhado; sem CI que pegue isso | 🟡 |

### O que NÃO mexer (forças verificadas)

1. **A escrita** — "Essa palavra é trupé, né? Sem pressa." / "Aqui ninguém erra." /
   "tudo bem, o ritmo varia. 🌙" — é o diferencial do produto, nas duas superfícies.
2. **O motor determinístico e sua rede de segurança**: A+ v3 sempre-entrega, contrato
   PASS-only do realizador (`proxy_realizador.ts:90-97`), fallback local, captura
   memoizada "salvo === lido". 318 checks verdes o provam.
3. **O modelo de envelope + validação** (`historias.ts`, `pipoca.*.v1`), a poda com
   favoritas isentas, a preservação de versão desconhecida (D-09).
4. **A guarda fail-closed** do admin (`rotasAdmin.ts:64-66`) e o KIDMODE
   (`estado.js:68,138`).
5. **RLS por dono + deny-all** em `uso_ia`/`chaves_ia`; edges keyless com secrets só no
   ambiente.
6. **T1 (PortaoParental)** como padrão-ouro de a11y; **T2** como padrão-ouro de tela
   infantil; **IaToggle** como padrão-ouro de tokenização (corrigir os tokens, não o
   arquivo); estados vazios do admin como padrão-ouro de copy acionável.
7. **Engajamento sem nota** ("no seu ritmo", nunca %), confirmação destrutiva em 2
   toques in-place, recuperação de senha neutra.
8. Homonímia `compor()`/`montar()` v3×gen2 — é camada, não conflito; está documentada.

### Sequência sugerida (ondas)

**Onda 0 — segurança/consentimento (pequena e cirúrgica):**
PS-01 (gate único de consentimento em `_dispararRealizacao`) · PS-03 (revoke
anon/authenticated da RPC + wire nas 2 edges) · PS-02/UI-A24 (consertar `provedorPronto`
e mostrar indisponibilidade ANTES do gesto) · PS-12 (alinhar MODELO_PADRAO) · rebuild
dos 2 bundles + redeploy das 2 edges ao final.

**Onda 1 — barato-e-seguro (limpeza com prova):**
DM-A inteiro (Geração 1 morta, roteador.ts, CartaoHistoria, playwright.config.ts,
.thumbnail, .canvas, PNGs órfãos, exports de perfil.ts, dirs vazios) · branches
mergeadas · guia-do-codigo (18+2 refs) · decisões DM-B do dono (ramo firebase,
guardrails canônico, edge proxy-ia, .agents/→docs) · UI-A13 (1 linha) · UI-C08 (`67%%`).

**Onda 2 — UX de maior alavancagem (a lista do dono):**
ML-3 (avatar→T2, saldo→T7, ⚙ na T2/T6) · ML-1 onda-UI (estante digna + filtrar
intermediárias) · ML-4 (Canon.avatares + emojis, mata 6 duplicações) · contraste dos
CTAs + `.pip-contrast` (UI-C21/C02) · alvos ≥48px · celular (scroll T2, wrap T3) ·
pós-PIN→T11 + "Usar este" com feedback · `<form>`/`disabled` honestos.

**Onda 3 — estrutural (com teste dedicado):**
ML-1 onda-sync (leitura híbrida + D-06 retry + D-07 desempate) · ML-2 (manifesto de
cenários + vocabulário único de id + UI de cenários liberados) · ML-5 (pacote v1.1 com
sentimentos; decidir prompt na edge) · PS-08 (CI mínimo: typecheck+testes+bundle-check)
· PS-14 (índices FK, políticas) · a11y profunda (foco visível global, dialogs, aria-live
na T6, semântica de seleção) · PS-04 (destino do dc-runtime).

### Incertezas honestas

1. **UI-C06 (beco da T4)**: o screenshot usou estado semeado por seam; a R1 real nasce
   com banco 4. Confirmar no fluxo real (o par UI-C37 "voltar da T5" é o caminho
   suspeito) antes de tratar como bug.
2. **Diff byte-a-byte repo↔deploy**: verificado a fundo só no `realizador` (marcadores
   idênticos); `proxy-ia` e `admin-chaves-ia` conferidos por versão/status apenas.
3. **`updated_at` idêntico nas 3 edges** (2026-08-26): pode ser evento de projeto, não
   redeploy real — irrelevante para os achados, registrado por transparência.
4. **Fila real de `uso_ia`**: 2 linhas somando chamadas reais; não medimos custo por
   chamada nem latência p95 das edges (exigiria logs de produção —
   `query_logs` disponível se o dono quiser).
5. **Comportamento em tablet Android real** (fontes, emojis, toque): screenshots são
   Chromium headless em Windows; validar ML-4 (emojis) no aparelho da criança.
6. **probes.json não mediu T8-T16** (a sonda das telas adultas veio do CSS-fonte).

---

*Gerado pela varredura de 2026-08-26 (findings-only). Nenhum código foi alterado; este
documento não foi commitado — decisão do dono.*
