# fase02 · 02-05 · Perfis das crianças (PC_PROF)

## Identidade
- id: `fase02-02-05`
- nó(s) da arquitetura: PC_PROF
- tela(s) do brief: —
- classe: admin

## Objetivo
Gerenciar múltiplos perfis de crianças (criar, editar, remover) que alimentam PERF.

## Pré-requisitos / Depende de
- `[[fase02-02-04]]` — acessível pelo hub do cuidador.
- `[[fase00-00-07]]` — a forma de `Perfil`.

## Arquivos afetados
- `src/telas/Perfis.dc.html` (criar) — CRUD de perfis.

## Nomes & variáveis
- `Perfil[]` — lista de crianças.
- `criarPerfil`/`editarPerfil`/`removerPerfil`.

## Interfaces / contratos
- `Perfil`, `Nivel` ([[_contratos/tipos-core]]); schema `pipoca.perfil.v1` ([[_contratos/schemas-json]]).

## Regras de negócio
1. **Multi-criança** com avatar/idade/nível por perfil.
2. **Persistência** via `pipoca.perfil.v1` ([[fase00-00-14]]).
3. **Remoção** respeita LGPD (apaga dados associados; [[fase02-02-09]]).

## Passos de implementação
1. Listar perfis; formulário de criar/editar.
2. Gravar via `RepositorioPersistencia.salvarPerfil`.
3. Selecionar perfil ativo (escreve PERF).

## Estados / edge-cases
- nenhum perfil → CTA de criar.
- remover perfil ativo → escolher outro.

## Critérios de aceitação / verificação
- [ ] CRUD persiste em `pipoca.perfil.v1`.
- [ ] Selecionar perfil muda PERF.

## Relações com outros docs
- Depende de: `[[fase02-02-04]]`, `[[fase00-00-07]]`
- É consumido por: `[[fase01-01-01]]`
- Reconcilia / conserta: —
