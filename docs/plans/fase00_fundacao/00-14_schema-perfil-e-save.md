# fase00 · 00-14 · Schemas de perfil e save

## Identidade
- id: `fase00-00-14`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Congelar os schemas de dados persistidos: `pipoca.perfil.v1` e `pipoca.save.v1`.

## Pré-requisitos / Depende de
- `[[fase00-00-13]]` — padrão de versionamento de schema.
- `[[fase00-00-07]]` — a forma de `Perfil`.
- `[[fase00-00-12]]` — onde os dados são gravados.

## Arquivos afetados
- `src/dados/schemas.ts` (criar) — validadores de `pipoca.perfil.v1` e `pipoca.save.v1`.

## Nomes & variáveis
- `pipoca.perfil.v1` — `{ esquema, perfil: Perfil }`.
- `pipoca.save.v1` — `{ esquema, perfilId, estado: EstadoApp }`.

## Interfaces / contratos
- `Perfil`, `EstadoApp` ([[_contratos/tipos-core]]); strings de schema em [[_contratos/schemas-json]].

## Regras de negócio
1. **Versão imutável:** `.v1` nunca muda de forma; mudança = `.v2`.
2. **Validação na carga:** save inválido → recai no estado inicial ([[fase00-00-06]]).
3. **LGPD:** só dados mínimos (nome/apelido, idade, progresso) — detalhe em [[fase02-02-09]].

## Passos de implementação
1. Definir os dois schemas e exemplos.
2. Escrever validadores leves (sem dependência externa pesada).
3. Usar nos métodos de `RepositorioPersistencia` ([[fase00-00-12]]).

## Estados / edge-cases
- versão desconhecida no save → migração/descarte seguro.
- campos faltando → defaults.

## Critérios de aceitação / verificação
- [ ] Round-trip salvar/carregar preserva `EstadoApp`.
- [ ] Save corrompido não quebra o app.

## Relações com outros docs
- Depende de: `[[fase00-00-13]]`, `[[fase00-00-07]]`, `[[fase00-00-12]]`
- É consumido por: `[[fase02-02-05]]`, `[[fase02-02-09]]`
- Reconcilia / conserta: —
