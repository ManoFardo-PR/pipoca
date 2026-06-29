# fase06 · 06-01 · Seam de backend e portabilidade (Supabase | Firebase)

## Identidade
- id: `fase06-06-01`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Definir a fachada `Backend` (auth + persistência + proxy de IA) como seam único, para que o BaaS (Supabase ou Firebase) seja trocável sem mudar tela/CORE.

## Pré-requisitos / Depende de
- `[[fase00-00-12]]` — o seam de persistência (`RepositorioPersistencia`) que esta fachada agrega.

## Arquivos afetados
- `src/backend/backend.ts` (criar) — interface `Backend` + função `obterBackend(config)`.
- `src/backend/adaptadores/` (criar) — pasta para `BackendSupabase`/`BackendFirebase`.

## Nomes & variáveis
- `Backend` — `{ auth: ServicoAuth; repo: RepositorioPersistencia; proxyIA: ProxyIA }`.
- `obterBackend(config)` — devolve o adaptador conforme `config.provedor: "supabase"|"firebase"|"local"`.
- adaptadores: `BackendSupabase`, `BackendFirebase` (implementam `Backend`).

## Interfaces / contratos
- `Backend`, `ServicoAuth`, `RepositorioPersistencia`, `ProxyIA` ([[_contratos/tipos-core]]); a lei do backend em [[_contratos/lei-do-contrato]].

## Regras de negócio
1. **Lei do backend:** app/CORE/telas falam só com `Backend` e seus contratos; nunca com o SDK do provedor.
2. **Trocar de BaaS = trocar adaptador** (mesmo padrão de [[fase00-00-19]] MA↔MB).
3. **Seleção por config/flag** (provedor ativo), governável por SA_SAFE ([[fase04-04-06]]).
4. **Default offline-first:** adaptador `local` funciona sem backend (MVP).

## Passos de implementação
1. Declarar `Backend` e `obterBackend(config)`.
2. Esqueleto dos adaptadores (auth/repo/proxyIA por provedor).
3. Injetar o `Backend` na app (contexto), nunca importar SDK em tela.

## Estados / edge-cases
- provedor indisponível → cai no adaptador `local` (degradação).
- config ausente → `local` por padrão.

## Critérios de aceitação / verificação
- [ ] Trocar `config.provedor` não muda nenhuma tela/CORE.
- [ ] Nenhum import de SDK Supabase/Firebase fora de `src/backend/adaptadores/`.

## Relações com outros docs
- Depende de: `[[fase00-00-12]]`
- É consumido por: `[[fase06-06-02]]`, `[[fase06-06-03]]`, `[[fase06-06-04]]`, `[[fase06-06-05]]`, `[[fase06-06-06]]`
- Reconcilia / conserta: —
