# fase14 · 14-01 · Arquivamento das variantes de texto em old/

## Identidade
- id: `fase14-14-01`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Planejar o arquivamento CONDICIONADO dos artefatos da era frase que perderem função — pelo processo-precedente do `old/` — deixando explícito o que fica: todo o runtime do v3.

## Pré-requisitos / Depende de
- `[[fase14-14-00]]` — a tabela consumidor→destino que diz o que é candidato e o que é intocável.
- `[[fase10-10-04]]` — a destilação: só depois dela as ~200 variantes têm sucessor.

## Arquivos afetados
**Nenhum agora — nada se move nesta fase.** A execução é condicionada ao gatilho triplo (abaixo). Alvos da execução futura: `old/README.md` (nova leva) e os candidatos avaliados; **NUNCA**: `docs/quintal.v3.json`, `src/core/composicao.ts`, golden v2/v3, e2e, `lint_grafo`/admin (todos SEGUE em [[fase14-14-00]]).

## Nomes & variáveis
- Gatilho triplo — a condição de execução (vocabulário deste doc): (1) validação em escala aprovada (portão de [[fase10-10-04]]); (2) fase 13 executada (módulo de geração implantado); (3) primeira sessão real confirmando o fluxo novo.
- `old/README.md` — o registro-precedente do arquivamento (verificado; formato abaixo).
- Reaproveitados com grafia idêntica: `montar` ([[fase14-14-00]]); `pipoca.fichas.v1` ([[fase10-10-00]]).

## Interfaces / contratos

### O processo-precedente (verificado no repo)
O `old/` já executou este processo duas vezes (protótipo; expurgo v1/aposentadoria v2). O `old/README.md` registra: header ("Nenhum é referenciado por código vivo, testes, checker ou build — verificado por grep no repositório inteiro antes de cada mudança… o histórico completo permanece no git"), **levas datadas** ("Leva 1 · 2026-07-01/02", "Leva 2 · 2026-07-06"), **commit de origem** (`old/README.md:26-27` — "pós `542b166`"), tabela por arquivo `| Arquivo | O que era | Por que foi arquivado |`, e a seção defensiva **"Não estão aqui (parecem antigos, mas estão vivos)"** (:43-48). A execução desta fase cria a "Leva 3" no MESMO formato: mover preservando estrutura, registrar origem e commit, **nada deletado**.

### O que FICA (não é candidato, por [[fase14-14-00]])
Todo o runtime do v3: `docs/quintal.v3.json` (alimenta fallback e prévia; amarra do checker), `src/core/composicao.ts` (motor+lapidação — **a lapidação de conectivos NÃO é candidata**: com a prévia determinística fixada em [[fase13-13-01]], ela segue viva em todo texto de prévia/fallback; correção honesta a quem a suponha obsoleta), golden v2/v3, fumaça, e2e, `lint_grafo` + admin, bundles.

### Candidatos REAIS a arquivo (avaliar na execução, um a um)
| candidato | condição para arquivar |
|---|---|
| A versão-beats do experimento (`experimentos/beats-para-paragrafos/` como está) | DEPOIS que a versão-fichas ([[fase10-10-04]]) assumir a validação em escala; o histórico de resultados (grade, relatórios) arquiva JUNTO como evidência |
| Oficinas/prompts da era A2 (`attached_assets/` — prompts colados de lapidação/revisão) | quando o conteúdo correspondente estiver destilado em fichas e os prompts não orientarem mais trabalho vivo |
| Artefatos de trabalho editorial da era frase (planilhas/inventários intermediários da migração, quando existirem) | ao fim da validação humana da destilação — o inventário final fica; os rascunhos arquivam |

Docs de revisão (`revisao-quintal-v3*.md`) são REGISTRO EDITORIAL — ficam onde estão (linhagem, [[fase14-14-02]]); não são candidatos.

### O gatilho triplo (condição de execução — nenhum movimento antes)
1. Validação em escala do modelo de fichas aprovada (o portão de [[fase10-10-04]]).
2. Fase 13 executada: módulo de geração implantado e o realizador assumindo o texto lido no portão.
3. Primeira sessão real (criança de verdade) confirmando o fluxo novo — inclusive a observação da hipótese prévia↔texto-final ([[fase13-13-01]]).

**DECISÃO ABERTA:** o destino das ~200 variantes DEPOIS que as fichas as destilarem — o `docs/quintal.v3.json` CONGELA como está (nenhuma edição; toda melhoria vai só para fichas) ou recebe MANUTENÇÃO MÍNIMA enquanto for fallback (correções de erro grosseiro que a criança veria no caminho de prévia/fallback)? A favor de congelar: uma fonte de verdade editorial (as fichas); a favor da manutenção mínima: a prévia e o fallback são texto que a criança LÊ. Decidir quando o gatilho triplo disparar, com dados de quanto o fallback é acionado.

## Regras de negócio
1. **Nada se move antes do gatilho triplo** — as três condições, não duas.
2. **Nada do runtime v3 arquiva** — a lista "o que FICA" é fechada por [[fase14-14-00]]; exceção exige reclassificação formal lá.
3. **Processo = precedente:** leva datada no `old/README.md`, tabela por arquivo, commit de origem, grep de vida antes de cada movimento, nada deletado.
4. **Arquivar com a evidência:** candidato que carrega resultados (o experimento) leva os resultados junto — arquivo sem contexto é lixo com outro nome.
5. **A seção "parecem antigos, mas estão vivos"** ganha as entradas do v3 (quintal, composicao, goldens) — defesa contra arquivamento futuro por engano.

## Passos de implementação
(ordem para QUANDO o gatilho disparar)
1. Verificar o gatilho triplo e registrar a verificação na TRILHA-plans02.
2. Reexecutar a auditoria ([[fase14-14-00]], passo 1) e fechar a lista real de candidatos.
3. Fechar a DECISÃO ABERTA (congelar vs manutenção mínima) com dados de acionamento do fallback.
4. Executar a Leva 3: mover candidatos, atualizar `old/README.md` (leva, tabela, commit de origem, seção "estão vivos").
5. Rodar a régua completa: `bun run test` + e2e + os dois checkers de planos — tudo verde, nada quebrado.

## Estados / edge-cases
- Gatilho parcialmente satisfeito (validação ok, sessão real pendente) → NÃO executa; o plano espera.
- Candidato com consumidor vivo descoberto no grep da execução → sai da lista; volta à tabela de [[fase14-14-00]] como SEGUE.
- Rollback da geração 2 (realizador desativado em produção) → o v3 volta a titular SEM cerimônia — é exatamente por isso que nada do runtime arquiva.
- `old/` crescer demais → irrelevante: o README diz que tudo ali pode ser apagado a qualquer momento (o git guarda); a disciplina é do registro, não do tamanho.

## Critérios de aceitação / verificação
- [ ] Gatilho triplo registrado como condição dura de execução.
- [ ] Lista "o que FICA" fechada (todo o runtime v3), com a correção sobre a lapidação de conectivos.
- [ ] Candidatos reais tabelados com condição individual de arquivamento.
- [ ] Processo-precedente citado com o formato verificado do `old/README.md`.
- [ ] DECISÃO ABERTA (congelar vs manutenção mínima do v3) registrada com o critério de quando decidir.

## Relações com outros docs
- Depende de: `[[fase14-14-00]]`, `[[fase10-10-04]]`
- É consumido por: `[[fase14-14-02]]` (os selos acompanham a execução do arquivamento)
- Reconcilia / conserta: —
