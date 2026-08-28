# Plano de execução — Plan03 (5 ondas · 43 subtarefas)

Este documento diz **em que ordem, com que gates e com que protocolo** as 43 subtarefas de
`docs/Plan03/` são executadas. Cada subtarefa continua autocontida no seu `.md`; aqui está a
orquestração. Base: branch `28_08_26` @ `4eec186` (deploy em `pipoca-mfardo.replit.app`).

---

## 1. Antes de começar — a folha de decisões

Cada subtarefa declara suas "decisões do dono" com um **default recomendado**. Para não
travar sessão nenhuma, as decisões estão consolidadas aqui. **Se você não se manifestar, o
default é executado e registrado no PR.** Marque o que quiser mudar.

### Onda A — segurança
| # | Decisão | Default |
|---|---|---|
| A1 | Kill-switch também bloqueia server-side (edge lê `flags_admin`)? | **não** nesta onda (gate no cliente + cota fechada bastam; follow-up) | decisão confirmada
| A2 | Texto do consentimento no IaToggle | copy proposta em A2 ("histórias do livro da casa" vs "escritas na hora"; diz o que a IA recebe) | decisão confirmada
| A2 | Manter `iaLigada:true` já gravado por cuidadores | **manter** (A1 passa a respeitá-lo) |decisão confirmada
| A3 | Fundir políticas permissivas múltiplas | **fundir**, se `qual` for leitura pura; senão só documentar |decisão confirmada
| A3 | Dropar `historias_dono_perfil_idx` (nunca usado) | **manter**; reavaliar após D1 | decisão confirmada
| A4 | Fonte de verdade do modelo padrão de IA | **admin fail-closed** (edge devolve 503 sem modelo configurado) |decisão confirmada
| A4 | Estender a RPC com `p_chamadas` | **sim**, se hoje incrementa 1 fixo |decisão confirmada

### Onda B — UX crua
| # | Decisão | Default |
|---|---|---|
| B1 | Mecanismo dos tokens de a11y | **classes** (`.pip-contrast`/`.pip-reduce-motion`) |
| B2 | CTA: gradiente escurecido vs texto escuro sobre laranja | **gradiente escurecido** |
| B2 | Valores canônicos de creme e raio de cartão | **os praticados** (superfície `#fffaf0`, fundo `#f6ecd7`, raio 22px) |decisão confirmada
| B3 | Admin com toggles próprios de a11y | **não** — só respeita `prefers-*` do sistema | decisão confirmada
| B4 | Manter "🔒 Sou o adulto" dentro do painel | **sim** |decisão confirmada
| B5 | Trocar de leitor exige portão parental | **não** (T2 é superfície livre por design) |decisão confirmada
| B5 | Onde pedir o gênero | **na chegada à T3** |decisão confirmada
| B6 | Criar `BarraCrianca.dc.html` (1 cabeçalho em vez de 6) | **sim** |decisão confirmada
| B6 | Saudação da T3 | "Oi, {nome}! Vamos ler?" (com concordância) |decisão confirmada
| B7 | Texto do selo das pontas | "🔒 fica aqui" |decisão confirmada
| B7 | Voltar da T5: preservar arranjo vs confirmar | **preservar** |decisão confirmada
| B8 | Setas ←/→ entre palavras na T5 | **sim** |decisão confirmada
| B9 | Texto da celebração ao resgatar; registrar na telemetria | "Combinado! …"; **só se já houver evento de economia** |decisão confirmada
| B10 | Manter `/admin.html` como alias | **sim** |decisão confirmada
| B11 | Glossário do admin; tabs no topo vs lateral | glossário de B11; **tabs no topo** |decisão confirmada

### Onda C — bundle do app
| # | Decisão | Default |
|---|---|---|
| C1/C2 | Intermediárias: somem da estante ou viram "rascunhos" | **somem** |decisão confirmada
| C2 | Estante: seção promovida na T3 vs tela dedicada | **seção promovida na T3** |decisão confirmada
| C3 | `CartaoHistoria`: remover vs arquivar | **remover** |decisão confirmada
| C4 | Os 5 emojis | 🐶 Pingo · 🦊 Fubá · 🐻 Cacau · 🐱 Lua · 🐦 Tuca |decisão confirmada
| C4 | Manter o id `fubá` com acento | **sim** (compat de perfis) |decisão confirmada
| C5 | `cenas.ts`: expor via bridge vs apagar | **expor via `Canon.cenas`** |decisão confirmada
| C6 | Destino pós-PIN | **hub (T11)** |decisão confirmada
| C6 | Fluxo único de "Novo perfil" | **inline em Perfis** (Onboarding só no 1º uso) |decisão confirmada
| C7 | Mostrar cenários "em breve" desabilitados na Regras | **sim** |decisão confirmada
| C8 | Componentizar chips de perfil (`ChipsPerfil.dc.html`) | **sim** |decisão confirmada
| C9 | Mensagens de validação | curtas, no tom da casa |decisão confirmada
| C10 | Texto do botão Google | "Entrar com o Google" |decisão confirmada
| C11 | Tabela textual oculta dos gráficos da T8 | **sim** |decisão confirmada

### Onda D — bundle app + admin
| # | Decisão | Default |
|---|---|---|
| D1 | Leitura híbrida reativa no repo vs mescla só no boot | **reativa** |decisão confirmada
| D2 | Fila persistente de push; badge no painel | **sim, com teto**; badge **não** |decisão confirmada
| D3 | Apagar a chave legada na migração | **sim** |decisão confirmada
| D5 | Apagar `.agents/` após migrar o útil para `docs/` | **sim** |decisão confirmada
| D6 | Apagar branches remotas mergeadas; tag antes de apagar a fase15 | **sim, após lista aprovada**; tag **sim** |decisão confirmada
| D7 | Harness e2e compartilhado | **sim** |decisão confirmada
| D8 | Bloquear merge sem CI verde; hook local | **sim**; hook **não** |decisão confirmada

### Onda E — edge e dados
| # | Decisão | Default |
|---|---|---|
| E1 | Subir o esquema do pacote para v1.1 agora | **não** (aditivo em v1) |decisão confirmada
| E2 | Fonte única dos guardrails em `src/core/seguranca/`; gerar edges a partir do core | **sim**; gerar **não** (paridade verificada basta) |decisão confirmada
| E3 | Aposentar a edge `proxy-ia`; rejeitar `prompt` no corpo após transição | **sim**; **sim** |decisão confirmada
| E4 | Objetos globais vs por cenário; autoria à mão vs admin | **globais**; **à mão (JSON)** |decisão confirmada
| E5 | Texto do "Em breve" ao toque | o de E5 |decisão confirmada
| E6 | Destino do `Pasted-*.txt`; ordem dos 4 cenários | mover para `docs/plans02/fase14…/anexos/`; **você** |decisão confirmada

**Decisões que bloqueiam outras ondas:** E3 (`proxy-ia`) e E2 (`guardrails`) precisam estar
tomadas **antes de D4** — por isso a folha existe: responda-as já, mesmo que E rode por último.

---

## 2. Sequência

**A sequência é as ondas, na ordem A → B → C → D → E**, com 3 passos de preparação antes e
4 de encerramento depois — **59 passos numerados**, um atrás do outro, em
`02-EXECUCAO-PASSO-A-PASSO.md`. A ordem dentro de cada onda:

| Onda | Ordem dos passos |
|---|---|
| P | P1 régua → P2 screenshots "antes" → P3 painel |
| A | A0 branch → A1 → A3 ∥ → A2 → A4 → A5 fechamento (SQL, 2 redeploys, build, merge) |
| B | B0 → B1 → B2 → B3 → B4 → **B-M1 merge** → B5 → B6 → B7 · B8 ∥ · B9 ∥ → **B-M2 merge** → B10 → B11 → **B-M3 merge** |
| C | C0 → C1 → C2 → C3 → C4 → C5 → C6 · C7 ∥ · C8 ∥ → C9 → C10 → C11 → C12 fechamento |
| D | D0 → D7 → D8 (CI primeiro) → D1 → D2 → D3 → D4 → D5 → D6 → D9 fechamento |
| E | E0 → E1 → E2 → E3 → E4 → E5 → E6 → E7 fechamento |
| F | F1 régua final → F2 catálogo → F3 STATUS 100% → F4 push (com ordem sua) |

**∥** = pode rodar ao mesmo tempo que o passo anterior (não toca os mesmos arquivos). Só isso;
não há "etapas" nem paralelismo obrigatório. A Onda B é a única que vai ao ar por partes
(3 merges, porque é servida crua).

**Auto-monitoramento:** o grafo desses 59 passos está em `plan03.graph.json`; o monitor
`scripts/plan03.mjs` lê a linha `> Status:` de cada subtarefa + o git e diz o próximo passo,
os bloqueios e as incoerências (branch errada, árvore suja, bundle desatualizado, decisão sem
carimbo). `docs/Plan03/STATUS.md` é o painel gerado — commitado a cada passo, o progresso
fica no histórico. Comandos: `status` · `proximo` · `iniciar <ID>` · `concluir <ID> --commit`
· `verificar [--e2e]` · `gate <onda>` · `relatorio`.

---

## 3. Gates (o que precisa estar verde para passar)

| Gate | Condição |
|---|---|
| Fim de cada subtarefa | critérios de aceite do `.md` + comandos de verificação listados nele |
| Fim de cada trilha CRU (B) | 4 e2e verdes + screenshots antes/depois conferidos → merge em `28_08_26` |
| Fim de onda com bundle (A, C, D, E) | subtarefa de fechamento: `tsc` limpo → `npm test` → `build:*` → 4 e2e → bundle no MESMO commit da fonte → merge |
| Onda A (extra) | `get_advisors security` sem WARN de `anon`; `proacl` sem `anon`; teste "IA desligada ⇒ realizador não chamado" |
| Onda D (extra) | CI verde; `check:bundles` passa |
| Onda E (extra) | `check:paridade` verde; corpo do POST = `{pacote, tenantId?}` |

---

## 4. Git, deploy e rollback

- **Branch por onda** a partir de `28_08_26`: `onda-A-seguranca`, `onda-B-cru-ux`,
  `onda-C-bundle-app`, `onda-D-bundle-app-admin`, `onda-E-edge-dados`. PR por subtarefa (ou por
  trilha em B). Merge na `28_08_26` só pelo gate da onda/trilha.
- **`28_08_26` é a branch de deploy** (Replit serve o repo): merge de CRU = ao vivo; merge de
  bundle = ao vivo se o bundle estiver no commit. Nunca mergear fonte de BUNDLE sem o bundle.
- **Sessões paralelas** disputam o HEAD deste diretório: todo comando git começa com
  `git rev-parse --abbrev-ref HEAD`; commits com `git checkout <branch> && git add … && git commit`
  encadeados; nunca `reset --hard`/`checkout` destrutivo; `-d` (não `-D`) em branches.
- **Rollback:** app/bundle → `git revert` do merge da onda (o bundle volta junto); edge →
  redeploy da versão anterior (o Supabase guarda versões: `realizador` v4, `proxy-ia` v4,
  `admin-chaves-ia` v2 hoje); SQL de A3 → `grant execute … to anon, authenticated` desfaz o
  revoke (reversível), índices → `drop index`.
- **Supabase:** MCP só-leitura por padrão; `apply_migration` só em A3, `deploy_edge_function`
  só em A5 e E3 — e só depois do seu "pode".

---

## 5. Protocolo de sessão (como executar uma subtarefa)

1. Abrir o `.md` da subtarefa; conferir "Depende de" satisfeito e a decisão do dono resolvida.
2. `git rev-parse --abbrev-ref HEAD`; se não estiver na branch da onda,
   `git checkout onda-X-…` (ou `git switch -c` a partir de `28_08_26` na primeira vez).
3. Ler os arquivos citados **antes** de editar — as linhas do `.md` valem para `e0bdcd2`; use os
   nomes de função/marcadores de texto como âncora quando a linha tiver deslocado.
4. Executar os passos; rodar os comandos de verificação do `.md`; para UI, capturar screenshot
   depois com o harness.
5. Commit pequeno (`feat|fix|chore(escopo): …`), mensagem em pt-BR sem acentos no assunto,
   `Co-Authored-By` quando gerado com agente. Bundle só na subtarefa de fechamento.
6. Marcar pelo monitor: `node scripts/plan03.mjs concluir <ID> --commit` — grava
   `> Status: concluída (data · hash)` no topo do `.md`, regenera `STATUS.md` e commita o status.
   Antes de começar o passo: `node scripts/plan03.mjs iniciar <ID>` (recusa se dependência
   pendente ou branch errada).
7. Ao fechar a onda: atualizar `docs/auditorias/varredura-2026-08-26.md` (achados resolvidos)
   conforme a subtarefa de fechamento pede.

---

## 6. Esforço estimado (sessões de trabalho focado, com agente)

| Onda | Subtarefas | Estimativa | Observação |
|---|---|---|---|
| A | 5 | 2–3 sessões | pequena, mas com migração + 2 redeploys — fazer com calma |
| B | 11 | 5–7 sessões | 3 trilhas paralelizáveis; muito `.dc.html`, zero build |
| C | 12 | 6–8 sessões | C2 (estante) e C9 (formulários em 7 telas) são as maiores |
| D | 9 | 4–6 sessões | D1 exige teste "2 aparelhos" bem feito; D6 é rápida |
| E | 6 | 4–6 sessões + conteúdo | E3 tem deploy em 2 passos; o custo real de E é escrever cenários |
| **Total** | **43** | **~21–30 sessões** | incerteza alta em C2/D1/E3; o resto é previsível |

---

## 7. Riscos globais e mitigação

| Risco | Mitigação |
|---|---|
| dc-runtime sem fonte (PS-04): algum recurso do `.dc.html` que o `support.js` não suporte (ex.: `onSubmit` em C9, `disabled` em wrapper) | testar o recurso num componente mínimo antes de refatorar N telas; fallback documentado no `.md` |
| e2e por texto (MARCADORES, cliques por rótulo) quebram com mudança de copy | cada `.md` lista os asserts afetados; atualizar o runner **no mesmo PR** |
| Bundle e fonte em commits separados | fechamento por onda + `check:bundles` no CI (D8) |
| Merge de CRU vai ao ar na hora | gate por trilha com screenshots; mergear B em horário de baixo uso |
| Deriva cliente↔edge ao mexer nas edges (A4, E3) | `check:paridade` (E2) — até existir, conferência manual nos 3 arquivos |
| Sessões/worktrees paralelos trocando o HEAD | protocolo de git da seção 4 em todo comando |
| Linhas citadas deslocam entre ondas | âncoras por nome de função/texto; `grep` antes de editar |

---

## 8. Primeira sessão, concretamente

1. `node scripts/plan03.mjs status` → próximo = **P1**.
2. `iniciar P1` → régua (`verificar --e2e`) → `concluir P1 --commit`.
3. P2 (screenshots "antes") e P3 (painel) do mesmo jeito.
4. **A0**: `git switch -c onda-A-seguranca 28_08_26` (após conferir o HEAD) → `concluir A0`.
5. **A1** (gate de consentimento + teste) e **A3 ∥** (migração escrita, **não aplicada** até seu
   ok); sessão seguinte A2, A4; depois A5 com seu "pode aplicar/redeployar".
6. Toda sessão começa com `status` e termina com `concluir`; se `status` acusar alerta,
   resolve-se antes de qualquer passo.
