# Análise A1 · Modularidade, contratos e o Censo da Joana

**Data:** 2026-07-11 · **Tipo:** relatório analítico — **zero mudanças de código**
**Incidente investigado:** perfil "Pietro" (masculino), overlay de gênero respondido, história lida saiu "Joana" sem flexão masculina.
**Método:** matriz de imports por leitura dos arquivos-fonte; `grep -rn "Joana"` (case-insensitive) no repositório inteiro excluindo `docs/plans*` e `.git`; grep de `genero`/`gênero`/`menino`/`menina` em todo o sistema. Todos os fatos citados abaixo foram conferidos por leitura direta do arquivo na linha indicada. Hipóteses estão marcadas como tal e separadas dos fatos.

---

## Sumário executivo

1. **As fronteiras de código estão íntegras nos 4 contratos** (`PacoteComposicao`, `compor()`, `realizar()`, `montar()`). Nenhum módulo da geração 2 importa internals de outro fora dos contratos. Os acoplamentos existentes fora dos contratos são: (i) o tipo v3 `NivelKey` importado por todos os módulos gen-2, (ii) o fallback `montar()` v3 (intencional), (iii) a camada app (`bridge.ts`, `estado.js`) que acopla aos dois motores de propósito.
2. **O sistema antigo NÃO vaza por contrato — vaza por CONTEÚDO.** "Joana" sobrevive em superfícies da geração 2 como texto embutido: os exemplos few-shot n1/n2 dentro do prompt enviado ao LLM (`src/core/realizador/prompt_template.ts:72-82`, e a cópia compilada em `pipoca.bundle.js:1802-1809`), copy de UI (`src/telas/cenas.ts:85`, `src/componentes/CartaoHistoria.dc.html:76`), doc desatualizado (`src/core/perfil.ts:34-35`), e a rota de fallback v3 que por construção é Joana/feminina (`src/core/composicao.ts:328` + `src/core/geracao/geracao.ts:139-151`).
3. A regra de concordância pós-PR#26 está correta: `GENERO_CONCORDANCIA_PADRAO = "f"` é **só gênero, nunca nome** (`src/core/geracao/geracao.ts:61,165` — verificado: "Joana" só aparece em comentários, nunca como valor executável).

---

## 1. Matriz de imports entre módulos

### 1.1 Onde vivem os contratos

| Contrato | Definição | Observação |
|---|---|---|
| `Pacote` | `src/core/compositor/pacote.ts:40` — `export interface PacoteComposicao` (+ `ESQUEMA_PACOTE_COMPOSICAO_V1` no mesmo arquivo) | Não existe tipo literal `Pacote`; "Pacote" é o nome de prosa do `PacoteComposicao`. |
| `compor()` (gen-2) | `src/core/compositor/compor.ts:101` — `compor(estado, fichas, perfil)` | Homônimo do `compor()` v3 (abaixo). |
| `compor()` (v3) | `src/core/composicao.ts:461` — `compor(estado, objetoId, ordemMiolo)` | Assinatura diferente; usado só pela camada app. |
| `realizar()` | `src/core/realizador/realizar.ts` (export) | |
| `montar()` | `src/core/composicao.ts:505` — função v3 que serve de contrato entre gerações (fallback A+) | |
| `gerar()` (orquestrador gen-2) | `src/core/geracao/geracao.ts:129` | Ponto único de entrada da geração 2 para o app. |

### 1.2 Matriz (módulo → o que importa → de quem)

| Módulo | Importa | De | Onde | Via contrato? |
|---|---|---|---|---|
| fichas | `NivelKey` (tipo) | composicao v3 | `src/core/fichas/tipos.ts:7` | **Não** (tipo compartilhado) |
| compositor | `NivelKey` (tipo) | composicao v3 | `src/core/compositor/pacote.ts:11`, `compor.ts:15` | **Não** (tipo compartilhado) |
| compositor | `ESQUEMA_FICHAS_V1`, `PorNivel` | fichas | `src/core/compositor/compor.ts:16`; `gramatica.ts:11` (`FichaRelacao`) | Fronteira fichas→compositor esperada |
| realizador | `PacoteComposicao` + esquema | compositor | `src/core/realizador/realizar.ts:14`, `prompt_template.ts:13`, `validador.ts:17`, `cascata.ts:14` | **Sim (Pacote)** |
| realizador | `montar`, `EstadoComp`, `NivelKey` | composicao v3 | `src/core/realizador/cascata.ts:13` | Parcial: `montar()` é contrato; `EstadoComp`/`NivelKey` são internals v3 |
| realizador | `transportePadrao`, `Transporte` | ia | `src/core/realizador/provedor_realizador.ts:13` | Infra de transporte, não motor |
| geracao | `compor` | compositor | `src/core/geracao/geracao.ts:29` | **Sim (compor)** |
| geracao | `PacoteComposicao` | compositor | `src/core/geracao/geracao.ts:34` | **Sim (Pacote)** |
| geracao | `realizar` (+ tipos de cascata/provedor/validador) | realizador | `src/core/geracao/geracao.ts:35,40-42` | **Sim (realizar)**; tipos auxiliares |
| geracao | `montar`, `EstadoComp`, `NivelKey` | composicao v3 | `src/core/geracao/geracao.ts:27` | **Sim (montar)** — fallback A+ intencional; tipos v3 junto |
| geracao | `NOME_PADRAO` | perfil | `src/core/geracao/geracao.ts:28` | Constante de identidade compartilhada |
| composicao v3 | **nada** | — | (zero imports no arquivo) | Ilha autocontida |
| app/estado.js | **nenhum import ES** | — | consome via globais `window.PipocaCanonico` / `window.PipocaApp` | Chama v3 `C.montar` em `src/app/estado.js:915` e `C.compor` em `:979` via global — fora de qualquer import, seam de runtime |
| app/bridge.ts | `compor`/`montar`/`ordenarR1`/etc. (v3) **e** `gerar`, `GENERO_CONCORDANCIA_PADRAO`, `ROTA_PADRAO` (gen-2) | ambos os motores | `src/app/bridge.ts:38-44` (v3) e `:49` (geracao) | Acoplamento duplo **deliberado** — é o seam que liga os 2 motores ao app |
| telas/ | **nenhum import de motor** | — | `.dc.html` usam `<dc-import>` (composição de componentes); `avatares.ts`/`cenas.ts` sem imports | Alcançam lógica só via `window.PipocaApp` |
| backend | `PacoteComposicao`, tipos de cascata, `montarPromptRealizador`, transporte ia | compositor/realizador/ia | `src/backend/proxy_realizador.ts:19-22`; `backend.ts:34` | **Sim (Pacote)** + template do realizador |
| edge (`functions/realizador/index.ts`, `functions/proxy-ia/index.ts`) | **zero imports do repo** | — | headers declaram autocontenção (`functions/realizador/index.ts:22`) | É **cópia compacta** do validador/template canônicos — sem import, com risco de drift (§1.3) |

### 1.3 Travessias fora dos contratos (achados)

1. **`NivelKey` (e `EstadoComp`) — vocabulário v3 usado por toda a geração 2.** `src/core/fichas/tipos.ts:7`, `src/core/compositor/pacote.ts:11`, `compor.ts:15`, `src/core/realizador/prompt_template.ts:12`, `cascata.ts:13`, `src/core/geracao/geracao.ts:27`. É acoplamento **tipo-nível** (apagado em runtime), mas significa que a geração 2 não compila sem `composicao.ts`. Não é vetor do incidente.
2. **`estado.js` chama o motor v3 por global** (`window.PipocaCanonico.composicao` → `C.montar` em `src/app/estado.js:915`, `C.compor` em `:979`) — fora do sistema de imports, invisível para qualquer análise estática de fronteira.
3. **Edge é cópia, não import.** `functions/realizador/index.ts:155` declara "espelho compacto de src/core/realizador/validador.ts (canônico)". Fronteira formalmente limpa, mas com risco de **drift silencioso** entre validador canônico e espelho.
4. **`bridge.ts` acopla aos dois motores** (`src/app/bridge.ts:38-49`) — deliberado, é o papel dele.

### 1.4 Veredito de fronteiras

**Íntegras.** Toda travessia compositor→realizador→geracao passa por `PacoteComposicao`/`compor()`/`realizar()`; o único uso runtime de v3 pela geração 2 é o `montar()` do fallback (contrato declarado). Nenhuma tela ou edge importa motor. Os desvios reais são de baixa gravidade: tipos v3 compartilhados (item 1), seam por global (item 2) e cópia edge (item 3). **A fronteira de código não explica o incidente.**

---

## 2. Censo da Joana

Grep case-insensitive no repositório inteiro (excluindo `docs/plans*` e `.git`): **~2.278 ocorrências em 145 arquivos**. A esmagadora maioria é dado offline ou legado arquivado. Zonas bulk agregadas primeiro; depois a tabela completa das ocorrências em código/runtime/teste/prompt/fixture — as que decidem o incidente.

**Fato negativo relevante:** nenhum arquivo em `functions/` (edge), nenhum `.sql` e nenhum diretório `supabase/` contém "Joana". A camada edge/DB está limpa.

### 2.1 Zonas bulk — classificação (a) legítima-legado

| Zona | ~Hits | Justificativa |
|---|---|---|
| `experimentos/**` (saídas de LLM, historias-base, agregados, avaliações) | ~1.700+ | Corpus de experimento offline; "Joana"/"Pietro" eram os personagens de amostra. Não é runtime. |
| `old/**` (app.html, Pipoca.dc.html, quintal_grafo.json, quintal.v2.json, testes antigos) | ~110 | Geração anterior arquivada. |
| `docs/quintal.v3.json` | 112 | Dado de autoria do v3 (Joana hardcoded por design). |
| `docs/revisao-quintal-v3*.md`, `docs/fichas/*` | ~160 | Docs de revisão v3. |
| `src/core/fixtures/composicao_golden_v2.json` / `_v3.json` | 92 | Goldens v2/v3 — Joana é a protagonista golden. Correto. |

### 2.2 Tabela completa — ocorrências em código/runtime/teste/prompt/fixture

#### (a) legítima-legado — motor v3 e seus testes

| caminho:linha | trecho | por quê |
|---|---|---|
| `src/core/composicao.ts:319-320` | doc de `nomesProtegidos` ("…fallback 'Joana'…") | comentário do motor v3 |
| `src/core/composicao.ts:328` | `if (nomes.length === 0) nomes.push("Joana");` | **o default Joana do v3** — fallback de nome protegido quando `cenario.personagem` não tem palavra capitalizada |
| `src/core/composicao.test.ts:469,489` | `personagem: "a Joana"` / assert de rebaixamento | teste do v3 |
| `pipoca.bundle.js:2409` | `nomes.push("Joana");` | espelho compilado de `composicao.ts:328` |
| `src/core/fixtures/composicao_golden_v2.json` (60), `_v3.json` (32) | textos golden | goldens v2/v3 |
| `tests/fumaca-presenca-v3.ts:32` | `"joana", "ela", "dela", "nela"` | wordlist do smoke-test v3 |
| `tests/e2e/run-linha-verde-canonico.mjs:163` | `perfil: { id: "p1", nome: "Joana", … }` | e2e canônico do v3 usa perfil Joana |
| `src/core/parciais.test.ts:73` | `criarPerfil("p1", { nome: "Joana", … })` | fixture de teste |
| `src/core/leitura.ts:13,52` | exemplos de doc ("A Joana, curiosa." / "Joa·na") | exemplos de hifenização em comentário |
| `src/ia/ia.test.ts:39` | `personagem: "a Joana"` | fixture de teste do módulo ia |

#### (a) fixture de teste gen-2 — Joana como personagem de amostra (não como default de substituição)

| caminho:linha | trecho |
|---|---|
| `src/core/realizador/realizador.test.ts:81,96-105,138,141,197-237` | `personagem: { nome: "Joana", genero: "f" }`, textos fiéis, asserts do validador |
| `src/core/realizador/realizador.test.ts:144` | assert de que a proibição é **parametrizada** ("nunca 'Joana' fixo no template") |
| `src/core/geracao/geracao.test.ts:7,84-85,106` | Joana como protagonista de teste |
| `src/core/compositor/compositor.test.ts:109,399,416` | `perfilBase = { nome: "Joana", genero: "f", … }` |
| `src/core/persistencia/persistencia.test.ts:378` | `personagem: { nome: "Joana", genero: "f" }` |
| `src/core/fixtures/pacote_golden_v1.json:10` | `"nome": "Joana"` (golden do Pacote) |
| `experimentos/**/*.ts` (matriz, tipos, gemini-cliente, avaliar) | tooling de experimento offline |

#### (b) legítima-default — regra de concordância pós-PR#26 (verificada por leitura direta)

| caminho:linha | trecho | verificação |
|---|---|---|
| `src/core/geracao/geracao.ts:56-59` | doc: "Substitui o antigo PERSONAGEM_CANONICO ('Joana', f), que trocava a identidade inteira — causa-raiz do incidente" | Joana só em comentário |
| `src/core/geracao/geracao.ts:61` | `export const GENERO_CONCORDANCIA_PADRAO = "f" as const;` | **só gênero — nenhum nome** |
| `src/core/geracao/geracao.ts:159-161` | comentário da resolução de identidade ("nunca 'Joana'") | Joana só em comentário |
| `src/core/geracao/geracao.ts:165` | `nome: nomeCru !== "" ? nomeCru : NOME_PADRAO` | nome real SEMPRE; degenerado ⇒ `NOME_PADRAO` (perfil.ts), nunca Joana |
| `src/core/geracao/geracao.test.ts:229,254,260` | testes de regressão do incidente | Joana só em comentário/mensagem de assert |
| `tests/e2e/run-geracao2-canonico.mjs:375` | assert "sem resposta ⇒ história do PIETRO com concordância f (nunca Joana)" | trava o fix em e2e |
| `src/core/realizador/prompt_template.ts:162` | comentário "nunca 'Joana' fixo" — a linha 165 usa `${nome}` | proibição parametrizada, correta |

**Conclusão da classe (b): a regra pós-PR#26 está conforme — é SÓ gênero, nunca nome.**

#### (c) SUSPEITA — "Joana" viva em superfície da geração 2

| # | caminho:linha | trecho | por que é suspeita |
|---|---|---|---|
| C1 | `src/core/realizador/prompt_template.ts:72,74` | few-shot n1: `PERSONAGEM: Joana (menina)` + corpo inteiro feminino ("…a pele de Joana sente o fresco…") | Exemplo **dentro do prompt enviado ao LLM**. O n1 tem **um único** exemplo — e ele é Joana/feminino. |
| C2 | `src/core/realizador/prompt_template.ts:80,82` | 1º few-shot n2: `PERSONAGEM: Joana (menina)` + corpo feminino | O 2º exemplo do n2 (`:86-88`) é Pietro/menino; n3/n4 usam Pietro. Ou seja: **n1 e a abertura do n2 dão ao LLM um prior feminino/Joana**. |
| C3 | `pipoca.bundle.js:1802-1803,1808-1809` | cópias compiladas de C1/C2 | É o artefato que **de fato roda** — o bundle enviado ao runtime. |
| C4 | `src/core/fixtures/prompt_golden_v1.json:2-3` | golden do prompt com o few-shot Joana | Um teste que passa **trava** a Joana dentro do prompt como comportamento esperado. |
| C5 | `src/core/perfil.ts:34-35` | doc do campo `genero`: "Ausente (perfil legado) ⇒ o módulo de geração usa o personagem canônico ('Joana', f)" | **Doc desatualizado que contradiz o PR#26**: geracao.ts não faz mais isso (mantém o nome real, `geracao.ts:163-167`). Re-documenta exatamente o modelo mental do bug num módulo vivo da geração 2. |
| C6 | `src/telas/cenas.ts:85` | `desc: "Com a Joana e o vaga-lume"` no card do cenário "quintal" | Copy de UI gen-2 hardcoded, independente do perfil. |
| C7 | `src/telas/Tela3SelecaoCenario.dc.html:53` | `<span>Com a Joana e o vaga-lume</span>` | Markup renderizado espelhando C6. |
| C8 | `src/componentes/CartaoHistoria.dc.html:76` | `"default": "A Joana viu um vaga-lume brilhar no quintal."` | Texto default/preview do cartão de história — feminino + Joana, renderizável sem geração real. |

**Nota sobre C1-C4:** o PR#26 corrigiu o default de **substituição de identidade** (`PERSONAGEM_CANONICO`), mas **não tocou os exemplos few-shot** do template, nem o doc de `perfil.ts`, nem a copy de telas/cartão.

---

## 3. Censo do gênero

### 3.1 Fluxo ponta-a-ponta do campo `genero` (código atual)

| Etapa | caminho:linha | O que acontece |
|---|---|---|
| Tipo do perfil | `src/core/perfil.ts:21-22,37` | `GENEROS=["m","f"]`; `genero?: GeneroPerfil` — campo aditivo **opcional** no `pipoca.perfil.v1` |
| Sanitização | `src/core/perfil.ts:79-96` | `normalizarGenero`: só `"m"`/`"f"` passam; inválido ⇒ `undefined` |
| Onboarding | `src/telas/Onboarding.dc.html:44-51,120,126` | Seletor **obrigatório** (`if(!this.state.genero) return` em `:120`); grava em `dados.genero` |
| Edição de perfis | `src/telas/Perfis.dc.html:158,170,195` | Carrega, exige no save, grava |
| Overlay pedir-uma-vez | `src/app/estado.js:419-421,432` (gatilho), `:441-462` (`definirGeneroPerfil`); `src/telas/PedirGenero.dc.html` | Perfil legado sem gênero abre overlay; resposta é validada (m/f), persistida via `repo.salvarPerfil` e o overlay fecha. **A resposta do overlay É consumida** (fato — ver 3.2 item 5) |
| Entrada da geração | `src/app/estado.js:760` | `perfil: { nome: state.perfil.nome, genero: state.perfil.genero, nivel }` → `G.gerar(entrada, opcoes)` |
| Resolução de identidade | `src/core/geracao/geracao.ts:163-167` | Nome real SEMPRE (`:165`); `genero: generoValido(...) ? perfil.genero : GENERO_CONCORDANCIA_PADRAO` (`:166`) |
| Pacote | `src/core/compositor/pacote.ts:53`; `compor.ts:149` | `personagem.genero: "m"\|"f"` — o Pacote **carrega** gênero; copiado verbatim do perfil resolvido |
| Prompt | `src/core/realizador/prompt_template.ts:127-128,134,142,157,165` | `rotuloGenero` → "menina"/"menino"; emitido em `PERSONAGEM: {nome} ({genero})` e na proibição "NÃO troque o nome (…), o gênero (…)" — **o gênero chega ao LLM** |
| Montagem local e remota | `src/core/realizador/realizar.ts:34-35`; `src/backend/proxy_realizador.ts:45,54-55` | Ambos os caminhos usam `montarPromptRealizador(pacote)` e enviam `{pacote, prompt}` |
| Edge | `functions/realizador/index.ts:143-153` (`pacoteValido` exige `genero ∈ {m,f}` em `:149`), `:474` (repassa o prompt verbatim ao LLM) | O edge valida a presença e **não reescreve** o personagem |
| Validador de concordância | `src/core/realizador/validador.ts:137-153` (canônico); espelho no edge `functions/realizador/index.ts:249-265` | Bidirecional: nome presente (`:141`), artigo oposto antes do nome (`:142-148`), palavra oposta menino/menina (`:149-150`), flexões predicativas opostas (`:151-153`) |
| Persistência | `src/dados/schemas.ts:110-116`; testes `src/core/persistencia/persistencia.test.ts:58-80` | `validarPerfil` re-sanitiza no load; round-trip preserva `genero` válido |

**Fato:** no código atual, o gênero viaja intacto perfil → estado → Pacote → prompt → LLM, e o validador exige concordância. Nenhum ponto derruba o campo no caminho feliz da geração 2.

### 3.2 Pontos que assumem "f", ignoram ou podem derrubar o campo

1. **`src/core/geracao/geracao.ts:61` + `:166`** — default de concordância **feminina** quando `genero` ausente/inválido. Intencional e documentado (regra de 2026-07-11), mas é uma assunção silenciosa de "f" quando o overlay é adiado.
2. **`src/core/realizador/prompt_template.ts:128`** — `genero === "f" ? "menina" : "menino"`: pivô binário; qualquer valor não-"f" vira "menino". Coerente com o tipo `"m"|"f"`, mas é o único ponto onde "f" é o ramo distinguido no template.
3. **`src/core/composicao.ts:53`** — o v3 declara `genero` nos objetos como "consumo futuro": **o motor v3 não consome gênero nenhum** (nem do objeto, nem do perfil).
4. **`src/core/composicao.ts:322-328`** — `nomesProtegidos` deriva o nome de `cenario.personagem` e cai em **"Joana"** quando não há palavra capitalizada. O v3 é, por construção, Joana/feminino.
5. **Overlay pode ser adiado** — botão "Depois" (`src/telas/PedirGenero.dc.html`, handler em `src/app/estado.js:432`): fecha sem gravar ⇒ geração cai no default "f" do item 1. **Fato verificado:** quando a resposta é dada, `definirGeneroPerfil` (`estado.js:441-462`) persiste e `_dispararRealizacao` (`estado.js:760`) a lê — a hipótese "overlay gravado mas não consumido" está **descartada** no código atual.

### 3.3 O fallback v3 silencioso — rota viva para "Joana/feminino"

**Fatos (verificados por leitura):**

- O fallback A+ v3 é `aMais()` em `src/core/geracao/geracao.ts:139-151`; gera texto com `montar(entrada.estadoFallback.estado, entrada.estadoFallback.nivel)` (`:143`).
- Gatilhos: rota do nível = `ap_cru` (`:154`); fichas não carregadas (`:157`); `compor()` lança (`:176-178`); **realizador lança** — edge fora do ar, cota, cascata esgotada (`:198-201`).
- O `estadoFallback` é montado pelo app em `src/app/estado.js:762` como `{ estado: comp, nivel }` — **nenhum código injeta `perfil.nome`/`perfil.genero` no estado v3 do fallback**.
- Como o v3 não consome gênero (3.2 item 3) e o nome protegido default é "Joana" (3.2 item 4), **qualquer criança que caia no fallback recebe história de Joana com flexão feminina, independente do perfil**.
- A queda é **silenciosa para a criança**: a origem só é etiquetada em telemetria (`origem.fonte: "fallback-a-mais"` + `motivo`, `geracao.ts:148`; comentário "a criança nunca vê" em `:104`), e em `src/app/estado.js:774-777` o `.catch` do `gerar()` engole qualquer erro restante ("captura cai no A+ cru") retornando `null`.

**Ressalva importante (fato):** o texto v3 depende de `cenario.personagem` do estado da partida. Se o cenário carregado nomear a personagem (ex.: dado do `quintal.v3.json`), é esse nome que aparece; o `push("Joana")` de `composicao.ts:328` é o fallback quando não há nome capitalizado. Em ambos os casos o perfil da criança é ignorado.

---

## 4. Veredito final: contrato ou conteúdo?

**O sistema antigo vaza por CONTEÚDO, não por CONTRATO.**

- **Contrato:** as fronteiras estão íntegras (§1.4). Compositor→realizador→geracao só se falam por `PacoteComposicao`/`compor()`/`realizar()`; o único uso runtime de v3 pela geração 2 é o `montar()` do fallback, que é contrato declarado. Telas e edge não importam motor nenhum. Nada aqui produz uma Joana.
- **Conteúdo:** onde "Joana" (e a flexão feminina) sobrevive em superfícies da geração 2:
  1. **Prompt ao LLM** — few-shots n1 e 1º do n2 são integralmente Joana/menina (C1-C3), travados por golden (C4). O único exemplo que o LLM vê no n1 é feminino.
  2. **Fallback v3** — rota silenciosa e viva que ignora o perfil por construção (§3.3).
  3. **UI** — copy do card de cenário e preview do cartão de história (C6-C8).
  4. **Doc vivo contradizendo o fix** — `perfil.ts:34-35` (C5), que perpetua o modelo mental da regra antiga.

### Hipóteses (separadas dos fatos, exigem confirmação em runtime/telemetria)

- **H1 — O incidente original (Pietro→Joana) foi o name-swap do antigo `PERSONAGEM_CANONICO` em geracao, já corrigido no PR#26** — é o que o registro forense conclui (`docs/plans02/forense-personagem.md`) e o que os testes de regressão travam (`geracao.test.ts:229-260`, `run-geracao2-canonico.mjs:375`). Este relatório não reproduziu o incidente em runtime.
- **H2 — Recorrência futura de "Joana" viria mais provavelmente do fallback v3 (§3.3) ou do prior feminino dos few-shots n1/n2 (C1-C2)** — o validador de concordância (`validador.ts:137-153`) deveria barrar o segundo caso quando o Pacote diz "m", mas o fallback v3 não passa por validador nenhum (`veredito: null`, `geracao.ts:147`). Não testado em runtime.
- **H3 — Drift edge/canônico**: o espelho compacto no edge (`functions/realizador/index.ts:155`) pode divergir do validador canônico com o tempo; nenhuma divergência foi verificada nesta análise, apenas o risco estrutural registrado.

### Achados secundários (registrar, não são vetor do incidente)

- Acoplamento tipo-nível `NivelKey`/`EstadoComp` de toda a geração 2 ao arquivo v3 (§1.3 item 1).
- `estado.js` alcança o v3 por global de runtime, invisível a análise estática de imports (§1.3 item 2).

---

*Relatório produzido pelo Prompt A1 (análise de modularidade/identidade). Nenhum arquivo de código foi alterado.*
