# fase04 · 04-04 · Biblioteca de conteúdo (grafos autorais)

> 🟢 **STATUS · 2026-07-02 · IMPLEMENTADO (MVP local)** — `src/admin/validar_grafo.ts`: validação dupla (`validarGrafoAutoral` — schema `pipoca.grafo-autoral.v1` via núcleo + ciclo de dependências via `ValidadorOrdem` + simulação do Motor A nos 4 níveis com desfechos convergente e aberto; desfecho aberto sem ramo → aviso "degrada") + biblioteca rascunho → versão → publicação com teto `cenariosCustomizados` do plano (catálogo da plataforma sem teto). Tela `src/admin/Conteudo.dc.html` (exemplo do Quintal carregável). Testado + e2e admin. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase04-04-04`
- nó(s) da arquitetura: SA_CONTENT
- tela(s) do brief: —
- classe: admin

## Objetivo
Gerenciar (CRUD/curadoria) os grafos autorais `pipoca.grafo-autoral.v1`, validados contra schema e Motor A.

## Pré-requisitos / Depende de
- `[[fase04-04-02]]` — acessível pelo painel do Super Admin.
- `[[fase00-00-13]]` — o schema do grafo.
- `[[fase00-00-17]]` — o Motor A para validar jogabilidade.

## Arquivos afetados
- `src/admin/Conteudo.dc.html` (criar) — biblioteca de cenários.
- `src/admin/validar_grafo.ts` (criar) — validação.

## Nomes & variáveis
- `validarGrafo(grafo)` — checa schema, `regras` (tem:/nao_tem:), `ordem_canonica`, desfechos.
- `publicarCenario`/`versionarCenario`.

## Interfaces / contratos
- `GrafoAutoral`, `Cenario`, `MotorNarrativa` ([[_contratos/tipos-core]]); schema `pipoca.grafo-autoral.v1` ([[_contratos/schemas-json]]).

## Regras de negócio
1. `SA_CONTENT --> GRAPH`: a biblioteca alimenta o grafo consumido pelo Motor A.
2. **Validação dupla:** schema ([[fase00-00-13]]) + simulação com Motor A ([[fase00-00-17]]) / `ValidadorOrdem`.
3. **Versionamento** de cenários (`.vN`).
4. Conteúdo seguro para crianças.

## Passos de implementação
1. Listar/editar cenários.
2. `validarGrafo` antes de publicar (inclui ordem topológica).
3. Versionar e publicar.

## Estados / edge-cases
- ciclo em `regras` → rejeita com diagnóstico.
- desfecho aberto sem ramo → aviso (degrada p/ convergente).

## Critérios de aceitação / verificação
- [ ] Grafo inválido é rejeitado com motivo.
- [ ] Cenário publicado roda nas fixtures de [[fase00-00-21]].

## Relações com outros docs
- Depende de: `[[fase04-04-02]]`, `[[fase00-00-13]]`, `[[fase00-00-17]]`
- É consumido por: `[[fase00-00-13]]`
- Reconcilia / conserta: —
