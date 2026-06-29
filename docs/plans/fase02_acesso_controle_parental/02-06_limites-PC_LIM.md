# fase02 · 02-06 · Limites (tempo de tela, bloco de foco)

## Identidade
- id: `fase02-02-06`
- nó(s) da arquitetura: PC_LIM
- tela(s) do brief: —
- classe: admin

## Objetivo
Configurar tempo de tela e bloco de foco, escrevendo a SESS sem pressa punitiva.

## Pré-requisitos / Depende de
- `[[fase02-02-04]]` — acessível pelo hub do cuidador.
- `[[fase00-00-08]]` — a forma de `Sessao`.

## Arquivos afetados
- `src/telas/Limites.dc.html` (criar) — ajustes de limites.

## Nomes & variáveis
- `Sessao.blocoMin` (10/15/20/25).
- `tempoDeTelaMin` (limite diário opcional).

## Interfaces / contratos
- `Sessao` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Bloco curto e visível** (Pomodoro).
2. **Sem castigo:** fim do bloco é encerramento calmo.
3. Escreve `Sessao` consumida por [[fase00-00-08]].

## Passos de implementação
1. Seletor de `blocoMin` e tempo de tela.
2. Gravar em SESS.
3. Persistir.

## Estados / edge-cases
- limite atingido → encerramento suave, sem bloquear a história em curso.

## Critérios de aceitação / verificação
- [ ] Mudar bloco reflete no timer da sessão.
- [ ] Limite gera encerramento calmo.

## Relações com outros docs
- Depende de: `[[fase02-02-04]]`, `[[fase00-00-08]]`
- É consumido por: `[[fase00-00-08]]`
- Reconcilia / conserta: —
