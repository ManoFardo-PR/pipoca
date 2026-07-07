# fase00 · 00-18 · Validador de ordem (suporte ao quebra-cabeça)

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/motores/validador_ordem.ts` (topo-sort, `ordemCanonica`, `validar` com dicas acolhedoras). Nota: ✅ Marco 1 — `validar` aceita ordem parcial consistente (critério 00-18). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md Nota 2026-07-01: o quebra-cabeça foi superado pela composição autoral v2 (ordenação só na R1, com pontas travadas); `ValidadorOrdem` segue em `src/` a serviço do Motor A/v1 — ver [[fase00-00-20]].

> 🔄 **SUPERSEDED · 2026-07-06** — Com o expurgo do v1 na implantação do Motor A+
> ([[fase08-08-00]]), `validador_ordem.ts` foi ARQUIVADO em `old/motores/` (ver
> `old/README.md`) — nada vivo o instanciava. As regras de posição da linha verde
> vivem na própria composição (`podeInserir`: miolo/âncoras) e nas condições `pos:*`
> do grafo v3. `src/core/historia.ts` mantém só o shape estrutural do tipo. Este doc
> permanece como registro histórico, mas NÃO descreve código vivo. Ver: [[fase00-00-20]].

## Identidade
- id: `fase00-00-18`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Sustentar o quebra-cabeça da tira: dizer qual é a ordem certa dos objetos (saída do grafo) e validar, de forma acolhedora, a ordem montada pela criança.

## Pré-requisitos / Depende de
- `[[fase00-00-13]]` — o grafo, fonte de `ordem_canonica` e das `regras` de dependência.
- `[[fase00-00-16]]` — convive com o `MotorNarrativa` (o texto sai do motor; a ordem, daqui).

## Arquivos afetados
- `src/motores/validador_ordem.ts` (criar) — implementa `ValidadorOrdem` a partir de um `Cenario`.

## Nomes & variáveis
- `ValidadorOrdem` — `{ ordemCanonica(): string[]; validar(ordemJogador: string[]): { ok: boolean; dica?: string } }`.
- `ordemCanonica()` — devolve `cenario.ordem_canonica` se existir; senão, **ordenação topológica** das dependências `tem:` das `regras`.
- `validar(ordemJogador)` — `ok` se a ordem do jogador respeita as dependências (não exige a ordem exata); `dica` acolhedora quando incompleta/fora de ordem.

## Interfaces / contratos
- `ValidadorOrdem` ([[_contratos/tipos-core]]); lê `Cenario`/`Objeto`/`Regra` ([[_contratos/tipos-core]]) e o campo `ordem_canonica` ([[_contratos/schemas-json]]).

## Regras de negócio
1. **Ordem sai do grafo, nunca de array fixo:** aposenta o `_order()` fixo do protótipo.
2. **Perdoador (nunca envergonha):** `validar` ACEITA qualquer ordem consistente com as dependências `tem:` — não há "a única ordem certa".
3. **Dica calorosa:** mensagens como "Quase! Arraste os quadros…", nunca "errado"/X vermelho.
4. **Derivação topológica:** ex.: `frasco` (regra `tem:vagalume`) deve vir depois de `vagalume`.

## Passos de implementação
1. Construir grafo de dependências a partir das `regras[].se` do tipo `tem:ID`.
2. `ordemCanonica()`: usar `ordem_canonica` do cenário, ou Kahn/topo-sort estável das dependências.
3. `validar()`: checar que, para todo objeto colocado, suas dependências já apareceram antes; produzir `dica` quando faltar objeto ou violar dependência.
4. Expor a instância pela fábrica [[fase00-00-19]] (telas não instanciam direto).

## Estados / edge-cases
- ciclo nas dependências → erro de conteúdo (reportado na validação de [[fase04-04-04]]).
- tira incompleta → `ok:false` com `dica` "Faltam quadros".
- sem `ordem_canonica` e sem dependências → qualquer ordem é válida.

## Critérios de aceitação / verificação
- [ ] `validar(["frasco","vagalume"])` no quintal retorna `ok:false` (frasco depende de vagalume) com dica acolhedora.
- [ ] `validar(["vagalume","frasco"])` retorna `ok:true`.
- [ ] `ordemCanonica()` respeita `ordem_canonica` quando presente.

## Relações com outros docs
- Depende de: `[[fase00-00-13]]`, `[[fase00-00-16]]`
- É consumido por: `[[fase00-00-19]]`, `[[fase01-01-05]]`
- Reconcilia / conserta: `[[fase00-00-20]]`
