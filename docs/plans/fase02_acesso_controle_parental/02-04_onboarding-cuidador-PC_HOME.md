# fase02 · 02-04 · Onboarding do cuidador (PC_HOME)

> 🟡 **STATUS · 2026-06-29 · PARCIAL** — Núcleo `src/core/onboarding.ts` (`montarEstadoOnboarding` monta PERF/MODES/SESS e aterrissa em T2; `perfilDoOnboarding`), no bridge (`PipocaCanonico.onboarding`) e testado (`parciais.test.ts`). A tela persiste via `criarRepositorio` (salvarPerfil/salvarSave) e cria o PIN via `acesso`. Falta a tela `Onboarding` + subpainéis (app). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase02-02-04`
- nó(s) da arquitetura: PC_HOME
- tela(s) do brief: 1
- classe: admin

## Objetivo
Preparar a sessão: criar perfil, definir nível, modo de verificação, cardápio de recompensas e bloco de foco — o hub do controle parental.

## Pré-requisitos / Depende de
- `[[fase02-02-03]]` — entra após o PIN.
- `[[fase00-00-07]]` — escreve `Perfil`.
- `[[fase00-00-11]]` — escreve `Modos`.

## Arquivos afetados
- `src/telas/Onboarding.dc.html` (criar) — a tela 1 do brief (a mais completa do protótipo).

## Nomes & variáveis
- escreve `Perfil` (nome/idade/nível/avatar), `Modos` (verificação, desfecho), `Sessao.blocoMin`, cardápio.
- `finishOnboarding` → KIDMODE/T2.
- hub para PC_PROF/LIM/RULES/AI/PRIV/DASH.

## Interfaces / contratos
- `Perfil`, `Modos`, `Sessao`, `Nivel` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Sóbrio (adulto):** estética mais contida, sem infantilização.
2. **Tudo mudável depois** — sem trancar decisões.
3. **Privacidade no controle** (LGPD; link [[fase02-02-09]]).
4. Escreve o estado que governa a experiência da criança.

## Passos de implementação
1. Portar a Tela 1 do protótipo (perfil, níveis, verificação, recompensas, bloco).
2. Gravar em PERF/MODES/SESS.
3. "Tudo pronto" → `irParaTela(2)` (entra no modo criança).
4. Linkar para os subpainéis.

## Estados / edge-cases
- primeiro uso (sem perfil) → cria um.
- múltiplos filhos → ver [[fase02-02-05]].

## Critérios de aceitação / verificação
- [ ] Onboarding grava PERF/MODES/SESS coerentes.
- [ ] "Tudo pronto" leva ao modo criança.

## Relações com outros docs
- Depende de: `[[fase02-02-03]]`, `[[fase00-00-07]]`, `[[fase00-00-11]]`
- É consumido por: `[[fase02-02-05]]`, `[[fase02-02-06]]`, `[[fase02-02-07]]`, `[[fase02-02-08]]`, `[[fase02-02-09]]`, `[[fase03-03-02]]`
- Reconcilia / conserta: —
