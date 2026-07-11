# Análise · O caminho da realização em produção — a hipótese da contaminação few-shot (A3)

> 📋 **RELATÓRIO ANALÍTICO · 2026-07-11** — investigação do prompt A3 (caça ao
> "traço do sistema antigo"). SÓ relatório: nenhuma correção de código, nenhum
> commit além deste arquivo. Branch `analise/realizacao-producao`.
> Método: fatos com caminho:linha; hipóteses separadas de evidências; teste A/B
> local com 24 chamadas reais de LLM; evidência de produção colhida no projeto
> Supabase `pipoca` (`bamlljvllcxdnsheatqv`) por leitura (logs + SELECT).

## TL;DR (veredito em 4 linhas)

1. **A contaminação few-shot NÃO foi observada**: 0 ocorrências de "Joana"
   indevida em **80 textos Pietro/m** gerados com o template atual (68 do lote
   oficial Gemini + 12 do teste A/B local), e o few-shot parametrizado
   (condição B) não mudou nenhuma métrica.
2. **A produção hoje nem chega ao modelo**: todas as invocações POST reais da
   edge `realizador` retornaram **503 `nao_configurado`** e a tabela `uso_ia`
   está **vazia** — nenhuma realização por LLM jamais completou nesta
   implantação. Qualquer história da geração 2 hoje vem do **fallback A+ v3 no
   dispositivo**, cujo conteúdo autoral é 100% "Joana".
3. A causa do incidente original já tinha sido estabelecida pela forense
   anterior ([forense-personagem.md](forense-personagem.md)): o `PERSONAGEM_CANONICO`
   descartava o nome do perfil **antes** do LLM (corrigido no PR #26) — o
   modelo recebeu um Pacote que JÁ pedia "Joana (menina)"; o few-shot é
   irrelevante para aquele caso.
4. `origem` do texto salvo vive em **localStorage do dispositivo** (não no
   Supabase) — a resposta final "fallback ou realizador?" do incidente depende
   de o autor colher esse campo (passo a passo na seção 6).

---

## 1. O incidente e a hipótese A3

Incidente (1ª sessão real, 2026-07-11): perfil **Pietro**, overlay de gênero
respondido, e a história lida saiu **"Joana"** sem flexão
([forense-personagem.md](forense-personagem.md), "O incidente").

Hipótese A3 (a testar aqui): os exemplos few-shot do template do realizador
dizem "PERSONAGEM: Joana (menina)"; com perfil Pietro/m o modelo **copiaria**
"Joana" dos exemplos → o validador (parametrizado pelo Pacote) reprova →
cascata esgota → fallback A+ v3 (Joana) → a criança vê Joana MESMO pelo
caminho da geração 2.

## 2. Fatos de código (análise estática, caminho:linha)

### 2.1 O few-shot é POR NÍVEL — e só o n1 é 100% "Joana"

`FEWSHOT_POR_NIVEL` em `src/core/realizador/prompt_template.ts:68-119`; só o
array do nível pedido entra no prompt (`prompt_template.ts:186-191`):

| nível | exemplos | personagens dos exemplos |
|---|---|---|
| n1 | 1 | **Joana (menina)** (`prompt_template.ts:72-74`) |
| n2 | 2 | Joana (`:80`) + Pietro (`:86`) — misto |
| n3 | 2 | Pietro + Pietro (`:94`, `:100`) |
| n4 | 2 | Pietro + Pietro (`:108`, `:114`) |

Os exemplos são **estáticos/verbatim** por decisão editorial ("PROIBIDO
reescrever — o veto/edição é do autor", `prompt_template.ts:61-67`). O nome
REAL do perfil é parametrizado em todo o resto do prompt: matéria
(`PERSONAGEM: ${nome} (${genero})`, `:142`), Lei 1 (`:157`) e a proibição
explícita `NÃO troque o nome (${nome}), o gênero (${genero})...` (`:165`).
Refino da hipótese: contaminação só seria plausível em **n1** (e parcialmente
n2); **n3/n4 são controle natural** — se "Joana" aparecesse ali, a causa não
seria o few-shot.

### 2.2 O validador não procura "Joana" — procura o nome do Pacote

`validar()` em `src/core/realizador/validador.ts:103-192` (`pass =
motivos.length === 0`, `:192`). Gates de identidade, todos parametrizados:
nome do Pacote ausente (`:141`); artigo do gênero oposto antes do nome
(`:143-148`); palavra "menina"/"menino" oposta (`:149-150`); flexões
predicativas opostas — listas `ADJ_F`/`ADJ_M` em `:53-54` (`:151-153`). Um
texto "Joana" para Pacote Pietro reprovaria por ≥2 motivos. Também são gates:
âncora por beat (`:119-135`), teto de crescimento de 25% sobre o máximo
canônico (`:155-164`) e ritmo n1 (`:178-190`).

### 2.3 A cascata e o fallback — onde "Joana" volta

`realizarComCascata()` em `src/core/realizador/cascata.ts:85-172`: FAIL de
fidelidade = 1 tentativa por provedor, sem retry do mesmo prompt (`:145-147`);
teto global 4 (`:24`); esgotada + `estadoFallback` ⇒ `montar()` do v3 com
`origem: { fonte: "fallback-a-mais" }` (`:152-167`).

O conteúdo do fallback é **autoralmente da Joana**: `docs/quintal.v3.json`
contém 115 ocorrências de "Joana" e 0 de "Pietro" (contagem 2026-07-11), e o
v3 protege "Joana" como nome default (`src/core/composicao.ts:328`). Ou seja:
**toda vez que o fallback A+ v3 roda, a criança vê Joana**, qualquer que seja
o perfil — este é o único caminho estrutural que produz "Joana sem flexão"
depois do PR #26.

### 2.4 Quem decide cair no fallback (cliente) e o que fica registrado

- O app dispara a realização com `estadoFallback` no dispositivo
  (`src/app/estado.js:747-770`, campo em `:762`).
- `gerar()` (`src/core/geracao/geracao.ts:129-203`) converte QUALQUER falha do
  realizador remoto em fallback: `aMais("realização falhou: ...")`
  (`:198-202`). O cliente do edge lança em qualquer não-200
  (`src/backend/proxy_realizador.ts:60-62`, mensagem
  `"ProxyRealizador: HTTP <status> — fallback A+ v3 local."`).
- A `origem` (`fonte`, `rota`, `provedor`, `modelo`, `motivo`) é persistida em
  **localStorage**, não no Supabase: `OrigemHistoria` em
  `src/core/historias.ts:42-48`, gravada por
  `src/core/persistencia/RepositorioLocalStorage.ts:167` na chave
  `pipoca.historias.v1:${perfilId}` (`src/core/persistencia/chaves.ts:23-24`).

### 2.5 A edge `realizador` não loga nada

`functions/realizador/index.ts` não contém **nenhum** `console.log/error`
(grep 2026-07-11; fonte implantada conferida via API de gestão — idêntica em
estrutura à do repo). O que o modelo devolveu **não é recuperável** dos logs
do painel; os únicos sinais observáveis são os status HTTP das invocações e as
linhas de `uso_ia` (gravadas em `:488` no sucesso e `:504` no esgotamento).
Mapa de erros: `401 nao_autenticado · 400 requisicao_invalida · 503
nao_configurado · 403 cota_excedida · 422 conteudo_bloqueado · 502
realizacao_esgotada` (`functions/realizador/index.ts:25-28`).

## 3. Teste A/B local — o few-shot "Joana" contamina?

### 3.1 Método (reprodutível)

- Driver efêmero (fora do repo, scratchpad da sessão) que reusa os blocos
  REAIS: `compor()` (`src/core/compositor/compor.ts`),
  `montarPromptRealizador()` e `validar()` de produção,
  `segmentarParagrafos()` da cascata, e a matriz oficial do experimento
  (`experimentos/fichas-para-historias/matriz.ts:35-53`, seedBase `"42"`).
- **12 estados Pietro/m** com ids/seeds/linhas idênticos aos do lote oficial:
  `r{1,2,3}-{n1,n2,n3,n4}-m-p02`. Temperatura 0.4, cenário
  `quintal_anoitecer`, desfecho convergente (mesmo desenho de
  `entradasDoEstado`, `experimentos/fichas-para-historias/gerar.ts:45-58`).
- **Condição A**: prompt de produção intocado. **Condição B**: mesmo prompt com
  o bloco few-shot (do marcador `"EXEMPLOS do nível"` em diante) parametrizado
  MECANICAMENTE: `\bJoana\b` → nome do Pacote; `(menina)` → `(menino)`;
  `\bEla\b` → `Ele`. Em n3/n4 a substituição é no-op (few-shot já é Pietro) —
  esses pares medem o piso de variação.
- Provedor: o Gemini local estava com cota estourada (`http_429` no smoke,
  2 tentativas); o driver caiu para **OpenAI `gpt-5.4-mini`** (mesmo formato
  do juiz do experimento, `experimentos/beats-para-paragrafos/avaliar/camada2-juiz.ts:82-108`).
  24 chamadas, ~31k tokens (centavos).

### 3.2 Resultados

| condição | n | "Joana" indevida | marca feminina indevida | PASS validador | FAIL (= cairia em cascata) |
|---|---|---|---|---|---|
| A (few-shot atual) | 12 | **0 (0%)** | 0 (0%) | 3 (25%) | 9 (75%) |
| B (few-shot parametrizado) | 12 | **0 (0%)** | 0 (0%) | 3 (25%) | 9 (75%) |

Por nível (PASS/n): n1 0/3, n2 0/3, n3 0/3, n4 3/3 — **idêntico nas duas
condições**. TODOS os 18 FAILs têm como motivo o **teto de crescimento**
(28%–132% acima do máximo canônico; em 2 casos do n1 da condição B, também
ritmo n1). **Nenhum** motivo de identidade (nome ausente / gênero) em nenhuma
das 24 gerações.

Amostra (n1, condição A — few-shot 100% Joana; o modelo escreve Pietro
corretamente e flexiona no masculino):

> "O quintal fala baixinho e sussurra segredos; Pietro quer ver tudo. A grama
> fria toca o pé de Pietro. Uma folha desce rodando, e o dedo de Pietro segue
> no ar. \[...\]" — FAIL por comprimento (113% sobre 31 palavras), não por
> identidade.

### 3.3 Réplica com o provedor da produção (Gemini) — custo zero

Os lotes oficiais do ciclo 2 (2026-07-11, `gemini-2.5-flash`, em
`experimentos/fichas-para-historias/saida/geracao/*.json`) contêm **68 textos
Pietro/m** gerados com o MESMO template (few-shot Joana em n1/n2):

- "Joana" indevida: **0/68 (0%)**.
- Marcas femininas indevidas: 0/68 pelo critério do validador (um regex mais
  amplo acusa 6 casos em n4, todos falsos positivos — "uma luz de prata macia
  e **quieta**", adjetivo concordando com "luz"; o validador de produção não
  os acusa e deu PASS a 5 dos 6).
- PASS Pietro por nível (Camada 1): n1 6/19 (32%) · n2 10/15 (67%) · n3 8/16
  (50%) · n4 13/18 (72%) — global 37/68 (54%).

### 3.4 Leitura estatística

Combinando as amostras sob o template ATUAL (68 Gemini + 12 gpt-5.4-mini =
**80 textos Pietro, 0 contaminações**): se a taxa real de contaminação fosse
≥ 4%, a probabilidade de observar 0/80 seria < 4% (regra de três: limite
superior ~3,7% com 95% de confiança). A contaminação, se existe, é rara —
e não é o mecanismo dominante de "Joana" na geração 2.

## 4. Evidência de produção (Supabase, somente leitura)

Projeto `pipoca` (`bamlljvllcxdnsheatqv`, sa-east-1). Colhido em 2026-07-11
via API de gestão (logs de edge, SELECT em `config_ia`/`uso_ia`, fonte da
função implantada).

### 4.1 Todas as invocações reais da edge `realizador` falharam com 503

Edge `realizador` **versão 1**, implantada 2026-07-11 **15:38 UTC**. Log de
invocações (janela de 24h; 12 entradas retornadas):

| horário (UTC) | método | status |
|---|---|---|
| 15:38:33 | POST ×2 | **401** (logo após o deploy — sem bearer válido) |
| 16:27:55 · 16:29:41 · 16:32:50 · 16:37:32 · 16:37:53 | POST ×5 (com OPTIONS 200 pareados) | **503** |

**Nenhum POST 200 ou 502 nas entradas retornadas.**

### 4.2 A causa do 503: `config_ia` não resolve para o tenant do app

- 503 = `nao_configurado`: sem linha de `config_ia` para o tenant **e** sem
  linha `"plataforma"` de fallback (`functions/realizador/index.ts:447-453`).
- O app manda `tenantId = "familia:<uid>"` (`src/backend/tenant.ts:13-18`,
  fiação em `src/backend/backend.ts:183-188`,
  `src/backend/proxy_realizador.ts:44,57`).
- `config_ia` tem **UMA** linha: `tenant_id = "ten_aced3c71"`
  (`{provedor: gemini, modelo: gemini-flash, fallback: deepseek, cotaMensal:
  4, custoMaxMensal: 3}`, atualizada 2026-07-06). **Não existe** linha
  `"plataforma"` nem `"familia:<uid>"`. ⇒ toda chamada do app cai no `:453` →
  503 → o cliente lança (`proxy_realizador.ts:60-62`) → `gerar()` cai no
  fallback A+ v3 no dispositivo (`geracao.ts:198-202`) → **Joana**.

### 4.3 `uso_ia` vazia — nenhuma realização por LLM jamais completou

`SELECT * FROM uso_ia` ⇒ **0 linhas**. A tabela tem `PRIMARY KEY (tenant_id,
mes)` (o upsert `on_conflict=tenant_id,mes` de `registrarUso`,
`functions/realizador/index.ts`, funcionaria), e o registro acontece tanto no
sucesso 200 quanto no esgotamento 502. Zero linhas ⇒ nesta implantação da
edge, **nenhuma cascata sequer chegou a um provedor** (o 503 acontece antes).

### 4.4 Tensão com a forense anterior — pendência explícita

[forense-personagem.md](forense-personagem.md) registra o incidente como "a
história chegou REALIZADA \[...\] o primeiro 200 do caminho feliz em
produção". A evidência colhida aqui (todas as POSTs = 503; `uso_ia` vazia) não
mostra nenhum 200 na implantação atual. As duas leituras são conciliáveis se
(a) a sessão do incidente ocorreu contra uma implantação anterior da função
(hoje só existe a versão 1, criada 15:38 UTC — deploy anterior teria sido
apagado), ou (b) a história do incidente na verdade veio do fallback e a
forense inferiu o 200 da aparência do texto. **Quem decide é o campo `origem`
no localStorage do dispositivo** (seção 6) — até lá, "o texto do incidente é
`fallback` ou `realizador`?" fica **em aberto**.

### 4.5 Risco adicional detectado (hipótese, não testada)

Mesmo consertando o tenant, a `config_ia` atual pede `modelo: "gemini-flash"`
— que não é um id público da API do Gemini (o experimento usa
`gemini-2.5-flash`). Se o id for inválido, a chamada falha com 4xx →
`continue cascata` → `deepseek` (exige o secret `DEEPSEEK_API_KEY` na função)
→ esgotamento 502 → fallback Joana do mesmo jeito. Os defaults
`MODELO_PADRAO` do edge (`claude-haiku-4-5`, `gpt-mini`, `gemini-flash`,
`deepseek-chat`) merecem a mesma conferência — `gpt-mini` tampouco é um id
válido da OpenAI. Não testei os ids contra as APIs (fora do escopo somente
leitura deste relatório); fica como verificação recomendada.

## 5. Por que a hipótese A3 não explica o incidente

A cadeia da A3 pressupõe que o Pacote chega ao modelo com "Pietro" e o modelo
devolve "Joana". A forense já estabeleceu que no incidente o Pacote **já
levava "Joana (menina)"**: `generoValido(undefined) === false` ⇒
`PERSONAGEM_CANONICO` substituía nome+gênero ANTES de compor
([forense-personagem.md](forense-personagem.md), timeline elo 3; corrigido no
PR #26 — a regra atual em `src/core/geracao/geracao.ts:159-167` +
`GENERO_CONCORDANCIA_PADRAO`, `:61`). O validador do edge validou
"Joana"/f **fielmente** porque era o que o Pacote pedia. Nesse cenário o
few-shot é indiferente — o prompt inteiro (matéria + proibições) já dizia
Joana.

E para o estado ATUAL (pós-PR #26): a produção nem chega ao modelo (seção 4) —
"Joana" continua aparecendo pelo fallback A+ v3, não pelo few-shot.

## 6. O que só o autor pode colher (passo a passo)

A evidência decisiva do incidente está no dispositivo em que a sessão rodou:

1. Abrir o app no MESMO navegador/dispositivo → DevTools (F12) → aba
   **Application** → **Local Storage** → origem do app.
2. Localizar a chave `pipoca.historias.v1:<perfilId>` (uma por perfil;
   `src/core/persistencia/chaves.ts:23-24`). Para achar o `<perfilId>` do
   Pietro: chave `pipoca.perfis.v1` lista os perfis.
3. No JSON, achar a história do incidente (por data/texto) e ler o campo
   **`origem`**:
   - `{fonte: "fallback-a-mais", rota: "realizador", motivo: "realização
     falhou: ProxyRealizador: HTTP 503 — fallback A+ v3 local."}` ⇒ o texto é
     do **v3** e o motivo confirma o 503 da seção 4.
   - `{fonte: "llm", provedor, modelo}` ⇒ houve 200 real (concilia com a
     forense; procurar o deploy anterior da edge).
   - `origem` ausente ⇒ história salva antes da sinalização de origem (12-04)
     ou registro legado.
4. Conferir também `pacoteOrigem.personagem` (`src/core/historias.ts:65-67`):
   `{nome: "Joana", genero: "f"}` ⇒ era a era do `PERSONAGEM_CANONICO`
   (pré-PR #26), fechando a explicação da forense.
5. Logs no painel (se a janela de 24h já passou): Dashboard → Edge Functions →
   `realizador` → Logs/Invocations — filtrar POSTs e olhar só o status (o
   corpo da resposta do modelo NUNCA aparece; a função não loga — seção 2.5).

## 7. Veredito

**"A contaminação existe e em que taxa?"** Não foi observada: **0/80** textos
Pietro sob o template atual (duas famílias de modelo), limite superior ~3,7%
(95%). O few-shot parametrizado (condição B) não alterou nenhuma métrica —
não há ganho mensurável em parametrizá-lo, e o custo editorial (reescrever
exemplos com veto do autor, `prompt_template.ts:61-67`) não se justifica por
identidade. O modelo obedece à proibição parametrizada (`:165`) mesmo com
exemplo "Joana" à vista.

**"O texto salvo do incidente é `origem: fallback` ou `origem: realizador`?"**
Indecidível a partir do servidor (a origem vive no localStorage — seção 6).
FATOS que cercam a resposta: (a) na implantação atual da edge, nenhuma
realização por LLM jamais completou (POSTs 100% 503, `uso_ia` vazia); (b) a
causa do "Joana" do incidente já tem explicação suficiente sem o few-shot
(PERSONAGEM_CANONICO, corrigido); (c) o único caminho que produz "Joana"
hoje é o fallback A+ v3 — e ele está sendo acionado em **100% das
tentativas** da geração 2 por causa do 503 `nao_configurado`.

**Implicação prática** (para priorização, não é correção deste relatório):
1. Criar a linha `config_ia` do tenant real do app (`"familia:<uid>"` ou uma
   linha `"plataforma"`) — sem isso a geração 2 é 100% fallback/Joana.
2. Conferir os ids de modelo (`gemini-flash`, `gpt-mini`) — seção 4.5.
3. Mesmo com tudo isso, a taxa de FAIL do validador por **comprimento** (46%
   dos Pietro no Gemini oficial; 75% no A/B local, com n1–n3 reprovando 100%)
   manda uma fração grande das realizações para a cascata; quando ela esgota,
   o fallback é Joana. Enquanto o conteúdo do v3 for autoral da Joana, o
   "traço do sistema antigo" continua a um FAIL de distância.

## 8. Limitações

- **Provedor**: o A/B local rodou com `gpt-5.4-mini` (Gemini local estava com
  429 de cota); a réplica Gemini usou os lotes oficiais (`gemini-2.5-flash`),
  próximo mas não idêntico ao id configurado em produção (`gemini-flash`,
  possivelmente inválido — seção 4.5). Nenhuma amostra com claude/deepseek.
- **Amostra**: 12 estados × 2 condições no A/B; 68 Pietro no lote oficial.
  Contaminações abaixo de ~4% não seriam detectadas.
- **Condição B em n3/n4 é no-op** (few-shot já é Pietro) — esses 6 pares medem
  apenas o piso de variação entre execuções.
- **Logs**: `get_logs` cobre 24h e retornou 12 entradas; um 200 anterior à
  janela (ou além do corte de entradas) não seria visto. A ausência de linhas
  em `uso_ia` é a evidência mais forte, mas o `registrarUso` engole erros
  (`functions/realizador/index.ts`, "telemetria de uso nunca derruba a
  geração") — um defeito de escrita silencioso não é 100% descartável (a PK
  `(tenant_id, mes)` existe e o upsert é bem-formado, então é improvável).
- **Brutos do A/B**: gerados no scratchpad da sessão (efêmero, fora do repo,
  como manda o escopo "só relatório"). Os números essenciais estão
  transcritos acima; para reproduzir: mesma matriz (`seedBase "42"`, ids
  `r{1,2,3}-*-m-p02`), temperatura 0.4, condições A/B com a substituição
  mecânica da seção 3.1.
