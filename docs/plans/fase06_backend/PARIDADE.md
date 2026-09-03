# Fase 06 · Paridade de backend (Supabase ↔ Firebase) e operação

> ⚰️ **Ramo Firebase APOSENTADO em 2026-09-03 (Plan03 · D5):** decisão de ficar
> no Postgres/Supabase (contexto na migração `2026-08-28_otimizacao-rls-cascade-cota.sql`).
> Os stubs (`auth_firebase.ts`, `repo_firebase.ts`, `rules_firebase.txt`), o tipo
> `"firebase"` e o ramo de dispatch saíram do código; config antiga com
> `provedor:"firebase"` cai em `local` (fail-closed). Este documento fica como
> registro histórico da matriz de paridade — a lei do backend segue valendo:
> adotar outro BaaS um dia = escrever o adaptador e trocar a config.

> Anexo do doc 06-06. Este build usa **Supabase real** (projeto `pipoca`,
> ref `bamlljvllcxdnsheatqv`, região sa-east-1, plano free).

## Matriz de paridade

| Recurso | Supabase (ATIVO) | Firebase (stub) |
|---|---|---|
| Auth (família + operador) | GoTrue via REST (`adaptadores/auth_supabase.ts`) — password grant, signup 1º uso, refresh | Firebase Auth (`adaptadores/auth_firebase.ts` — stub) |
| Persistência | PostgREST via REST (`adaptadores/repo_supabase.ts`) — tabelas `perfis`/`saves`/`telemetria`, envelopes canônicos em jsonb | Firestore (`adaptadores/repo_firebase.ts` — stub), coleções homônimas |
| Isolamento por dono/tenant | RLS (`adaptadores/rls_supabase.sql`, aplicado) — `dono = auth.uid()` com default no banco | Security Rules (`adaptadores/rules_firebase.txt`, template equivalente) |
| Gate de operador | tabela `operadores` + `eh_operador()` security definer | coleção `/operadores/{uid}` + `exists()` nas rules |
| Proxy de IA (chaves no servidor) | Edge Function `proxy-ia` (deployada, verify_jwt) | Cloud Function equivalente (não implementada) |
| Cotas/custo de IA persistidos | tabelas `config_ia` + `uso_ia` (deny-all p/ cliente; só a função com service role) | Firestore `config_ia`/`uso_ia` com rules deny-all + Admin SDK |
| Config pública no cliente | `pipoca.config.js` → `window.PIPOCA_CONFIG` (URL + anon key) | mesmo arquivo (web config do Firebase em `opcoes`) |
| Migração de dados | `migrar(de, para)` + `sincronizarInicial` (testados) — mesmos schemas dos envelopes | idem (a interface é a mesma) |

Alternar provedor = editar `pipoca.config.js` (a fachada `obterBackend`
seleciona o adaptador) e migrar os dados com `migrar()`/`sincronizarInicial`
— nenhuma tela muda (critério 06-06; não existe função `alternarProvedor`
dedicada, a alternância é operacional via config).

## Estado do projeto real (2026-07-02)

- Projeto `pipoca` criado via MCP (org do usuário, sa-east-1, R$ 0/mês).
- Migrations aplicadas: `fase06_schema_inicial_rls` (schema + RLS + trigger de
  teto de perfis) e `fase06_hardening_funcoes` (revoke de EXECUTE das funções
  SECURITY DEFINER para anon/public, pós-advisors).
- Edge Function `proxy-ia` v1 ACTIVE com `verify_jwt` (sem bearer → 401,
  verificado ao vivo).
- RLS verificado ao vivo: `anon` lê 0 linhas em `perfis`/`uso_ia` e escrita em
  `tenants` é negada. Advisor INFO restante sobre `uso_ia` sem policy é
  INTENCIONAL (deny-all: só a função com service role toca a tabela).

## Passos manuais (dashboard) — únicos itens fora do código

0b. ~~Migration da iteração 2 pendente~~ ✅ **APLICADA (2026-07-06)** via SQL editor
   (`migracao_2026-07-06_admin_remoto.sql`) e verificada ao vivo: `flags_admin`/
   `conteudo`/`contas_tenant` → 200; a família lê a própria linha de `tenants`
   (planoId freemium); insert de perfil com `tenant_id` FORJADO voltou corrigido
   para `familia:<uid>` pelo trigger `fixar_tenant_perfis`; anon em `flags_admin`
   → 401. Falta só o SEED das flags: o operador abre SA_SAFE no admin publicado
   e salva uma vez (deliberadamente sem seed automático).

0. ~~Migrations pós-fase06 pendentes~~ ✅ **APLICADAS (2026-07-06)** via SQL editor
   e verificadas ao vivo (`historias` → 200 com RLS; tenant `familia:<uid>` no
   Freemium via backfill). Registro do que era — arquivo PRONTO PARA COLAR:
   `src/backend/adaptadores/migracao_2026-07-06_historias_freemium.sql`
   (idempotente; cole o conteúdo INTEIRO no SQL editor do dashboard e Run —
   ou aplique via MCP `apply_migration` quando o conector voltar). Contém:
   (a) tabela `historias` + índice + policy RLS (bloco "histórias salvas");
   (b) Freemium: `create or replace` do `verificar_teto_perfis` (teto por
   planoId + validade de 60 dias — a versão original estava inerte),
   função+trigger `provisionar_tenant_familia` em `auth.users` e o backfill
   dos usuários existentes. NÃO cole o `rls_supabase.sql` inteiro (as tabelas
   da fase06 já existem e dariam erro; ele é o espelho, não a migração).
   Sem (a), o espelho remoto das histórias falha em silêncio (local
   funciona); sem (b), cadastros novos não entram no Freemium e o teto de
   perfis segue sem efeito.

1. **Confirmação de e-mail** (Auth → Sign In / Providers → Email → "Confirm
   email"). Hoje está LIGADA (default). A tela de conta AGORA cobre os dois
   estados: o cadastro explícito mostra "Quase lá! Confirme o e-mail…" quando
   ligada e entra direto quando desligada. Desligar continua sendo a opção
   sem fricção do MVP; ligada, é um passo a mais para a família.
1b. **URLs de retorno do e-mail** (Auth → URL Configuration): apontar o
   **Site URL** para a origem publicada do app (ex.:
   `https://pipoca-mfardo.replit.app`) e adicioná-la em **Redirect URLs**.
   Sem isso, os links de confirmação e de RECUPERAÇÃO DE SENHA redirecionam
   para o default (localhost) e a tela "Escolher a nova senha" (hash
   `type=recovery`) nunca abre no app publicado.
2. **Secrets dos provedores de IA** (Edge Functions → Secrets): configurar
   qualquer combinação de `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
   `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`. Sem a chave do provedor configurado,
   o proxy responde 503 limpo e o app degrada para o provedor simulado →
   Motor A (a criança nunca vê erro).
3. **Semear o operador**: criar o usuário do operador (Auth → Add user, com
   senha) e rodar no SQL editor:
   `insert into operadores (uid) values ('<uid do usuário>');`
   Sem a linha, o login do operador devolve erro neutro (por desenho).
4. **Config de IA por tenant**: com o operador logado no `/admin.html`
   (provedor supabase), salvar a Configuração de IA espelha a config na
   tabela `config_ia` — é ela que o proxy lê (provedor/modelo/cota/custo).
   O tenant sintético de uma família é `familia:<uid>`; a config de
   plataforma usa o id `plataforma` (fallback do proxy).

## Limitações registradas do MVP

- Plano free pausa projetos inativos → o fail-soft cobre (o app segue 100%
  local; o espelho volta quando o projeto acordar).
- Edição concorrente do MESMO perfil em dois aparelhos na mesma janela: vence
  o último push (união com preferência local é por id, não por campo).
- Cota do proxy é *soft* (leitura → chamada → upsert; corrida entre requisições
  simultâneas pode passar 1-2 chamadas do teto).
- Telas do admin (tenants/conteúdo/flags) seguem em storage local; só a
  config de IA é espelhada no servidor. Vínculo explícito conta↔tenant
  (`contas_tenant`) existe no schema e fica para a próxima iteração.
