# fase14 · 14-02 · Selos SUPERSEDED e linhagem

## Identidade
- id: `fase14-14-02`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Planejar os selos e as notas de linhagem que a documentação da geração 1 recebe quando a geração 2 assumir — com a nuance nova que o SUPERSEDED puro não expressa: superado como titular, vivo como fallback.

## Pré-requisitos / Depende de
- `[[fase14-14-00]]` — a tabela que diz quais docs recebem SELO.
- `[[fase14-14-01]]` — a execução condicionada que os selos acompanham (mesmo gatilho triplo).

## Arquivos afetados
**Nenhum agora.** Na execução (junto da Leva 3 de [[fase14-14-01]]), os alvos são docs da geração 1, citados por caminho: `docs/plans/fase08_conteudo/08-00_motor-a-plus-grafo-v3.md`, `docs/plans/_contratos/grafo-autoral-v3.md`, `docs/plans/_contratos/schemas-json.md`, `docs/plans/TRILHA-DE-IMPLEMENTACAO.md`.

## Nomes & variáveis
- Selo "SUPERADO COMO TITULAR" — o selo NOVO proposto neste doc (o vocabulário `SUPERSEDED` puro da casa significa "não descreve o vivo"; aqui o motor SEGUE vivo como reserva — nuance inédita que exige redação própria).
- Reaproveitados com grafia idêntica: `pipoca.fichas.v1` ([[fase10-10-00]]); `pipoca.pacote-composicao.v1` ([[fase11-11-00]]).

## Interfaces / contratos

### O padrão de selo da casa (verificado)
Selos são blocos `>` no topo do doc com emoji, data, motivo e ponteiros (exemplo verbatim em `docs/plans/fase00_fundacao/00-17_motor-A-grafo-autoral.md:5-11`: "🔄 **SUPERSEDED · 2026-07-06** — O motor narrativo v1 foi ARQUIVADO… permanece como registro histórico… NÃO descreve o motor vivo"). Regra do precedente: **o selo novo é ADICIONADO ACIMA dos selos existentes, que são preservados** (ex.: `00-20` mantém o 🟢 IMPLEMENTADO sob o 🔄 SUPERSEDED).

### Alvo 1 — `08-00_motor-a-plus-grafo-v3.md` (o Motor A+ titular)
Hoje tem 🟢 STATUS COMPLETO + 🔧 lapidação (verificado). Recebe, ACIMA deles, o selo novo — redação proposta:

> 🔄 **SUPERADO COMO TITULAR · \<data da execução\> — VIVO COMO FALLBACK** — o Motor A+ v3 deixou de ser o gerador do texto lido no portão: a geração 2 (fichas → compositor → realizador, `docs/plans02/`) assumiu o posto. O motor descrito aqui PERMANECE em produção como fallback de conteúdo (plans02 · fase12-12-04) e prévia do portão (plans02 · fase13-13-01) — este doc segue descrevendo um motor vivo, agora de reserva. Nada daqui foi arquivado; ver `docs/plans02/TRILHA-plans02.md`.

(Nuance deliberada: o SUPERSEDED da casa diz "não descreve o motor vivo"; este selo diz o OPOSTO — descreve um motor vivo em outro posto. Por isso o rótulo novo.)

### Alvo 2 — `_contratos/grafo-autoral-v3.md` (o contrato do v3)
Recebe NOTA DE LINHAGEM (abaixo dos selos atuais 🟡 PROPOSTA + 📝 changelog, preservados): o contrato segue válido para o motor de reserva; os sucessores no posto de titular são `pipoca.fichas.v1` (conteúdo — plans02 · fase10-10-00) e `pipoca.pacote-composicao.v1` (estrutura — plans02 · fase11-11-00).

### Alvo 3 — `_contratos/schemas-json.md` (o registro de esquemas)
- A tabela `| Schema | Dono | Persistido por |` (formato verificado, :15-22) ganha as entradas novas com dono no plans02 (por caminho, já que os wikilinks da geração 1 não resolvem no plans02 e vice-versa): `pipoca.fichas.v1` → plans02 · fase10-10-00; `pipoca.pacote-composicao.v1` → plans02 · fase11-11-00.
- A "Nota de linhagem (2026-07-06)" existente (:8-13) ganha o parágrafo da geração 2.
- Pendência REGISTRADA da execução: o selo do topo (:3) está DESATUALIZADO (ainda cita `pipoca.grafo-autoral.v1` em `src/dados/quintal_grafo.json`) — corrigir junto, com selo próprio, sem apagar o texto antigo.

### Alvo 4 — `TRILHA-DE-IMPLEMENTACAO.md` (o roteiro da geração 1)
Hoje NÃO menciona o plans02 nem a geração 2 (verificado: zero ocorrências). Recebe nota de encerramento no topo do "Mapa de status": a trilha da geração 1 está completa e selada; o roteiro ativo passa a ser `docs/plans02/TRILHA-plans02.md`.

### O destino do próprio plans02 (registrado desde já)
Quando a fase 14 executar: `TRILHA-plans02.md` vira O roteiro ativo do projeto; `docs/plans/` permanece como HISTÓRIA SELADA — o `check_plans.mjs` da geração 1 continua rodando enquanto o conteúdo que ele guarda existir (amarra de [[fase14-14-00]]). **Regra permanente: linhagem nunca se apaga** — nenhum selo substitui texto; todo selo ADICIONA.

## Regras de negócio
1. **Linhagem nunca se apaga:** selos adicionam, nunca substituem; selos anteriores são preservados (precedente verificado).
2. **A nuance titular/reserva exige selo próprio:** não usar SUPERSEDED puro no 08-00 — mentiria (o motor está vivo).
3. **Cross-geração por caminho simples:** docs da geração 1 citam o plans02 por caminho (e vice-versa) — os dois sistemas de wikilinks não se cruzam (escopos dos dois checkers).
4. **Selos junto da execução:** os selos entram na MESMA leva do arquivamento ([[fase14-14-01]], gatilho triplo) — nunca antes (selar antes de assumir é mentira documental).
5. **Registro de esquemas é obrigatório:** todo esquema novo da geração 2 entra no `schemas-json.md` com dono — a regra da casa não muda de geração.

## Passos de implementação
(na execução, junto da Leva 3)
1. Aplicar o selo novo no `08-00` (redação proposta acima, data real).
2. Nota de linhagem no `grafo-autoral-v3.md`; entradas novas + parágrafo de linhagem no `schemas-json.md` (e a correção do selo desatualizado do topo).
3. Nota de encerramento na `TRILHA-DE-IMPLEMENTACAO.md` apontando a TRILHA-plans02.
4. Atualizar a TRILHA-plans02 (roteiro ativo) e registrar a virada.
5. Rodar `node docs/plans/check_plans.mjs` — os selos não podem quebrar o checker da geração 1 (10/10 permanece).

## Estados / edge-cases
- Checker da geração 1 reprovando um selo (ex.: link novo que não resolve lá) → citar por caminho simples, nunca wikilink cross-geração — regra 3.
- Execução parcial (geração 2 assume só n2–n4; n1 fica no A+ cru pelo CRITÉRIO de [[fase12-12-05]] — citado por contexto) → o selo do 08-00 diz EXATAMENTE o que assumiu ("titular para n2–n4; titular do n1 permanece o v3"), sem arredondar.
- Rollback pós-selo (geração 2 desativada) → novo selo ACIMA registrando a reversão — linhagem nunca se apaga, nem a de idas e vindas.
- Docs da geração 1 não listados aqui que citem o v3 como titular (ex.: `08-01…08-05`) → a auditoria da execução decide selo individual ou nota única no 08-00; registrar a escolha na leva.

## Critérios de aceitação / verificação
- [ ] Os 4 alvos com o selo/nota específico de cada um, incluindo a redação proposta do selo "SUPERADO COMO TITULAR · vivo como fallback".
- [ ] Regra "selo adiciona, nunca substitui" com o precedente citado.
- [ ] Entradas novas do `schemas-json.md` especificadas (formato verificado) + pendência do selo desatualizado registrada.
- [ ] Destino do plans02 (TRILHA ativa) e da geração 1 (história selada) registrados.
- [ ] Selos condicionados ao MESMO gatilho triplo do arquivamento.

## Relações com outros docs
- Depende de: `[[fase14-14-00]]`, `[[fase14-14-01]]`
- É consumido por: — (fecha a fase 14 e o plans02)
- Reconcilia / conserta: —
