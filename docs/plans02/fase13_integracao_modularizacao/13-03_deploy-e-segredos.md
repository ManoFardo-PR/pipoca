# fase13 · 13-03 · Deploy e segredos (cliente vs edge)

## Identidade
- id: `fase13-13-03`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Fixar o que roda onde na geração 2 (cliente vs edge vs estático) e como o realizador reusa o padrão real de segredos já verificado no repo — a chave de API nunca no cliente.

## Pré-requisitos / Depende de
- `[[fase13-13-00]]` — o mapa de módulos que este doc distribui pela infraestrutura.
- `[[fase12-12-02]]` — o provedor plugável e o mapa de reuso da infra de IA.

## Arquivos afetados
Nesta fase, nenhum. Na implementação: nova rota/função edge para o realizador (irmã de `functions/proxy-ia/`), configuração de secrets, e o caminho estático das fichas. Infra REAL verificada (não tocar agora): `functions/proxy-ia/index.ts`, `src/backend/proxy_ia.ts`, `server.js`.

## Nomes & variáveis
- `SECRET_POR_PROVEDOR` — o mapa real de secrets da Edge Function (`functions/proxy-ia/index.ts:121-126`): `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, lidos via `Deno.env.get` (:154-156).
- `criarProxyIA` / `provedorViaProxy` — o cliente keyless real (`src/backend/proxy_ia.ts:27`, :54-60; só o bearer do usuário :41).
- Reaproveitados com grafia idêntica: `ProvedorRealizador` ([[fase12-12-02]]); `realizar` ([[fase12-12-00]]); `pipoca.fichas.v1` ([[fase10-10-00]]).

## Interfaces / contratos

### O que roda onde

| módulo | onde roda | por quê |
|---|---|---|
| Conteúdo (fichas `pipoca.fichas.v1`) | estático (hoje) → BD (decisão abaixo) | dado versionado, sem segredo; hoje o precedente é o grafo servido estático: `estado.js` faz `fetch("./docs/quintal.v3.json")` (:666) e o `server.js` serve qualquer arquivo do disco genericamente (`resolverCaminho` `server.js:31-41`; `fs.readFile` :64-75; mime json :12) — as fichas seguem o MESMO caminho no primeiro momento |
| Compositor (`compor` → Pacote) | cliente OU edge | leve, determinístico, sem segredo, sem I/O — pode rodar onde for melhor para a latência ([[fase13-13-01]]); nada o prende ao servidor |
| Realizador (`realizar`) | **edge SEMPRE** | guarda a chave de API; a chamada de LLM real só existe no servidor |
| App | dispositivo | como hoje (bundle estático + localStorage) |

### O padrão real de segredos (verificado) e como o realizador o reusa
Hoje, no fluxo de IA existente:
- As chaves vivem SÓ como secrets da Edge Function Supabase (`SECRET_POR_PROVEDOR`, `functions/proxy-ia/index.ts:121-126`; `Deno.env.get` :154-156). Grep por chaves de API em `src/` = **zero** ocorrências.
- O cliente manda apenas o bearer do usuário + payload (`src/backend/proxy_ia.ts:41`); o SERVIDOR decide provedor/modelo lendo `config_ia` (o cliente não escolhe — `functions/proxy-ia/index.ts:266-270`) e verifica cota ANTES de chamar (:272-277). Contrato de erros: 401/400/503/403/422/502 (:14-17).
- A função é autocontida (fora do tsc do app, `index.ts:11-12`) e o teste da geração 1 assere que nenhuma chave sai do cliente (`src/ia/ia.test.ts:236-237`).

O realizador REUSA este padrão inteiro: rota edge própria (irmã do proxy — mesma disciplina de secrets, decisão de modelo no servidor, cota-antes, contrato de erros), cliente keyless chamando com o bearer, e a cascata ([[fase12-12-04]]) rodando NO EDGE (uma viagem de rede por realização, não uma por provedor tentado).

### Migração das fichas JSON→BD
A decisão da fase 10 foi **JSON-first** (fichas nascem versionadas no repositório — [[fase10-10-00]]); esta fase decide o QUANDO/SE da migração a banco.
**DECISÃO ABERTA:** a migração fichas JSON→BD é trabalho DESTA fase ou fica plantada no jardim? A favor de agora: o backend Supabase já existe (tabelas `config_ia`/`uso_ia` são precedente); fichas no BD habilitam edição sem deploy. A favor de plantar: um cenário e ~7 objetos não justificam BD; arquivo estático é auditável, versionável em git e grátis; a condição de colheita natural é "mais de um cenário em produção OU edição de fichas por não-dev virou necessidade real".

## Regras de negócio
1. **Chave NUNCA no cliente** — invariante verificado e herdado; PR com chave em `src/` está errado por definição.
2. **Servidor decide o modelo em produção** (precedente `config_ia`); o cliente nunca escolhe provedor.
3. **Cota antes de chamar** (precedente :272-277) — vale também para a rota do realizador.
4. **Compositor não tem segredo:** rodá-lo no cliente é legal por contrato; a escolha cliente-vs-edge é SÓ de latência/arquitetura ([[fase13-13-01]]), nunca de segurança.
5. **Cascata no edge:** as tentativas de provedores ([[fase12-12-04]]) acontecem do lado do servidor — o cliente faz UMA chamada por realização.
6. **Fichas seguem o caminho estático do grafo** até a DECISÃO ABERTA fechar diferente.

## Passos de implementação
1. Fechar a DECISÃO ABERTA (JSON→BD: agora ou jardim) com o Manoel.
2. Criar a rota edge do realizador no padrão do proxy (secrets, config no servidor, cota, erros).
3. Cliente keyless do realizador no padrão `criarProxyIA`/`provedorViaProxy`.
4. Servir `docs/fichas/*.v1.json` estático (nenhum trabalho: o `server.js` já serve genericamente) e carregar no boot ao lado do grafo.
5. Teste herdado: nenhum header de chave sai do cliente (padrão de `ia.test.ts:236-237`).

## Estados / edge-cases
- Secret ausente no ambiente → a função responde erro explícito sem chamar provedor (precedente: `{ok:false, semChave:true}`, `functions/proxy-ia/index.ts:154-156`) → cascata pula o provedor.
- Edge do realizador fora do ar → falha de PROVEDOR ([[fase12-12-04]]) → fallback A+ v3 no cliente (o fallback NÃO depende do edge — roda no dispositivo).
- Fichas estáticas com cache velho do navegador → versionamento no NOME do arquivo (`.v1`) já resolve: novo conteúdo = novo arquivo, sem cache-busting exótico.
- Deploy do edge dessincronizado do bundle (contrato do Pacote v1 vs v2) → rejeição explícita por `esquema` na fronteira ([[fase13-13-00]]).

## Critérios de aceitação / verificação
- [ ] Tabela o-que-roda-onde completa com o porquê de cada linha.
- [ ] Padrão real de segredos descrito com caminho:linha (secrets, servidor-decide, cota-antes, cliente keyless, grep zero).
- [ ] Reuso pelo realizador especificado (rota irmã, cascata no edge, uma viagem por realização).
- [ ] DECISÃO ABERTA da migração JSON→BD registrada com prós/contras e condição de colheita.

## Relações com outros docs
- Depende de: `[[fase13-13-00]]`, `[[fase12-12-02]]`
- É consumido por: — (fecha a fase 13; a fase 14 cuida da aposentadoria do banco de frases — texto simples)
- Reconcilia / conserta: —
