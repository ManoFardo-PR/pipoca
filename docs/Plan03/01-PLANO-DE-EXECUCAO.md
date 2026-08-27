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
| A1 | Kill-switch também bloqueia server-side (edge lê `flags_admin`)? | **não** nesta onda (gate no cliente + cota fechada bastam; follow-up) |
| A2 | Texto do consentimento no IaToggle | copy proposta em A2 ("histórias do livro da casa" vs "escritas na hora"; diz o que a IA recebe) |
| A2 | Manter `iaLigada:true` já gravado por cuidadores | **manter** (A1 passa a respeitá-lo) |
| A3 | Fundir políticas permissivas múltiplas | **fundir**, se `qual` for leitura pura; senão só documentar |
| A3 | Dropar `historias_dono_perfil_idx` (nunca usado) | **manter**; reavaliar após D1 |
| A4 | Fonte de verdade do modelo padrão de IA | **admin fail-closed** (edge devolve 503 sem modelo configurado) |
| A4 | Estender a RPC com `p_chamadas` | **sim**, se hoje incrementa 1 fixo |

### Onda B — UX crua
| # | Decisão | Default |
|---|---|---|
| B1 | Mecanismo dos tokens de a11y | **classes** (`.pip-contrast`/`.pip-reduce-motion`) |
| B2 | CTA: gradiente escurecido vs texto escuro sobre laranja | **gradiente escurecido** |
| B2 | Valores canônicos de creme e raio de cartão | **os praticados** (superfície `#fffaf0`, fundo `#f6ecd7`, raio 22px) |
| B3 | Admin com toggles próprios de a11y | **não** — só respeita `prefers-*` do sistema |
| B4 | Manter "🔒 Sou o adulto" dentro do painel | **sim** |
| B5 | Trocar de leitor exige portão parental | **não** (T2 é superfície livre por design) |
| B5 | Onde pedir o gênero | **na chegada à T3** |
| B6 | Criar `BarraCrianca.dc.html` (1 cabeçalho em vez de 6) | **sim** |
| B6 | Saudação da T3 | "Oi, {nome}! Vamos ler?" (com concordância) |
| B7 | Texto do selo das pontas | "🔒 fica aqui" |
| B7 | Voltar da T5: preservar arranjo vs confirmar | **preservar** |
| B8 | Setas ←/→ entre palavras na T5 | **sim** |
| B9 | Texto da celebração ao resgatar; registrar na telemetria | "Combinado! …"; **só se já houver evento de economia** |
| B10 | Manter `/admin.html` como alias | **sim** |
| B11 | Glossário do admin; tabs no topo vs lateral | glossário de B11; **tabs no topo** |

### Onda C — bundle do app
| # | Decisão | Default |
|---|---|---|
| C1/C2 | Intermediárias: somem da estante ou viram "rascunhos" | **somem** |
| C2 | Estante: seção promovida na T3 vs tela dedicada | **seção promovida na T3** |
| C3 | `CartaoHistoria`: remover vs arquivar | **remover** |
| C4 | Os 5 emojis | 🐶 Pingo · 🦊 Fubá · 🐻 Cacau · 🐱 Lua · 🐦 Tuca |
| C4 | Manter o id `fubá` com acento | **sim** (compat de perfis) |
| C5 | `cenas.ts`: expor via bridge vs apagar | **expor via `Canon.cenas`** |
| C6 | Destino pós-PIN | **hub (T11)** |
| C6 | Fluxo único de "Novo perfil" | **inline em Perfis** (Onboarding só no 1º uso) |
| C7 | Mostrar cenários "em breve" desabilitados na Regras | **sim** |
| C8 | Componentizar chips de perfil (`ChipsPerfil.dc.html`) | **sim** |
| C9 | Mensagens de validação | curtas, no tom da casa |
| C10 | Texto do botão Google | "Entrar com o Google" |
| C11 | Tabela textual oculta dos gráficos da T8 | **sim** |

### Onda D — bundle app + admin
| # | Decisão | Default |
|---|---|---|
| D1 | Leitura híbrida reativa no repo vs mescla só no boot | **reativa** |
| D2 | Fila persistente de push; badge no painel | **sim, com teto**; badge **não** |
| D3 | Apagar a chave legada na migração | **sim** |
| D5 | Apagar `.agents/` após migrar o útil para `docs/` | **sim** |
| D6 | Apagar branches remotas mergeadas; tag antes de apagar a fase15 | **sim, após lista aprovada**; tag **sim** |
| D7 | Harness e2e compartilhado | **sim** |
| D8 | Bloquear merge sem CI verde; hook local | **sim**; hook **não** |

### Onda E — edge e dados
| # | Decisão | Default |
|---|---|---|
| E1 | Subir o esquema do pacote para v1.1 agora | **não** (aditivo em v1) |
| E2 | Fonte única dos guardrails em `src/core/seguranca/`; gerar edges a partir do core | **sim**; gerar **não** (paridade verificada basta) |
| E3 | Aposentar a edge `proxy-ia`; rejeitar `prompt` no corpo após transição | **sim**; **sim** |
| E4 | Objetos globais vs por cenário; autoria à mão vs admin | **globais**; **à mão (JSON)** |
| E5 | Texto do "Em breve" ao toque | o de E5 |
| E6 | Destino do `Pasted-*.txt`; ordem dos 4 cenários | mover para `docs/plans02/fase14…/anexos/`; **você** |

**Decisões que bloqueiam outras ondas:** E3 (`proxy-ia`) e E2 (`guardrails`) precisam estar
tomadas **antes de D4** — por isso a folha existe: responda-as já, mesmo que E rode por último.

---

## 2. Sequência e paralelismo

```
Etapa 0  preparação (1 sessão)
Etapa 1  ┌ Onda A (segurança) ─────────────┐   ← crítica, pequena, primeiro
         └ Onda B (UX crua) em paralelo ───┘   ← independente de A, branch própria
Etapa 2  Onda C (bundle app)                    ← usa tokens de B2/B3
Etapa 3  Onda D (bundle app+admin, CI)          ← fecha o pipeline; D4/D5 após decisão E2/E3
Etapa 4  Onda E (edge + dados)                  ← E1–E3 após A; E5 após C5
```

### Etapa 0 — preparação
1. Responder a folha de decisões (ou aceitar os defaults).
2. Conferir o ambiente: `git rev-parse --abbrev-ref HEAD` = `28_08_26`; `git worktree list`
   (há `fix/geracao2-em-producao` em outro worktree); `bun --version`; os 4 e2e verdes na base
   (régua: 28 + 80 + 25 + 42 = 175; unit 143).
3. Capturar screenshots "antes" com o harness (`onda-B-cru-ux/00-onda-B.md`) para prova de
   antes/depois.

### Etapa 1 — Ondas A e B em paralelo
- **A** (`onda-A-seguranca`): A1 → A2 → A3 → A4 → A5. A3 pode começar junto com A1 (SQL não
  depende do cliente). Fecha com migração aplicada, 2 redeploys e `build:app`.
- **B** (`onda-B-cru-ux`): três trilhas independentes que podem rodar em sessões separadas:
  - B1 → B2 → B3 → B4 (tokens/a11y)
  - B5 → B6 (navegação) · B7, B8, B9 (mecânica — independentes entre si)
  - B10 → B11 (admin)
  **Atenção:** B é CRU — ao mergear em `28_08_26` **vai ao ar imediatamente**. Mergear só ao
  fechar cada trilha com os 4 e2e verdes e screenshots conferidos.
- Conflito possível: A2 e B (IaToggle/Regras) tocam `Regras.dc.html`/`IaToggle.dc.html`; A2
  mexe na lógica, B2 nos tokens — rebase de B sobre A ao final resolve.

### Etapa 2 — Onda C
C1 → C2 → C3 (histórias) · C4 → C5 (avatars) · C6, C7, C8 (fluxo do cuidador — independentes)
· C9 → C10 (formulários) · C11 (aria) · C12 fecha com `build:app` **e** `build:admin`
(C1/C4 tocam `src/core`).

### Etapa 3 — Onda D
D1 → D2 (sync) · D3 · D7 → D8 (pipeline) · D4 → D5 → D6 (faxina; D4 espera decisão E2/E3) ·
D9 fecha com `build:all` e CI verde. A partir daqui o `check:bundles` do CI impede o drift
que causou o PS-05.

### Etapa 4 — Onda E
E1 → E2 → E3 (edge; E3 faz o redeploy em 2 passos) · E4 → E5 → E6 (cenários).

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
6. Marcar no `.md` da subtarefa: `Status: concluída em <data> · commit <hash>` (uma linha no
   topo) — o `00-onda-X.md` vira o painel de progresso.
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

1. Você responde a folha de decisões (ou diz "defaults").
2. `git switch -c onda-A-seguranca 28_08_26` (após conferir o HEAD).
3. Executar **A1** (gate de consentimento + teste) e **A3** (migração escrita, **não aplicada**
   até seu ok) na mesma sessão; PRs separados.
4. Sessão seguinte: A2, A4; depois A5 com seu "pode aplicar/redeployar".
5. Em paralelo, quando quiser, abrir `onda-B-cru-ux` e começar por B1 (é a base de B2–B4).
