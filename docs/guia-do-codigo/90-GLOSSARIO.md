# 90 · Glossário

← [Mapa geral](00-MAPA-GERAL.md)

Os termos canônicos do Pipoca, uma linha cada, com o arquivo onde vivem. Preserve
este vocabulário ao escrever código e comentários.

| Termo | Uma linha | Vive em |
|---|---|---|
| **ficha** | Unidade de conteúdo por nível (identidade, relação ou cenário) — a MATÉRIA que o compositor consome. | [`src/core/fichas/tipos.ts`](../../src/core/fichas/tipos.ts) |
| **Pacote de Composição** | O contrato `pipoca.pacote-composicao.v1`: a matéria já resolvida no nível, entregue do compositor ao realizador. | [`src/core/compositor/pacote.ts`](../../src/core/compositor/pacote.ts) |
| **compositor** | A etapa determinística (sem RNG) que decide e arranja: fichas → Pacote. Não escreve prosa. | [`src/core/compositor/compor.ts`](../../src/core/compositor/compor.ts) |
| **realizador** | A etapa LLM que transforma o Pacote em prosa final (prompt + cascata + validador). | [`src/core/realizador/realizar.ts`](../../src/core/realizador/realizar.ts) |
| **portão** | A leitura que destrava a próxima rodada; perdoador (leitura imperfeita → dica calorosa, sem punição). | [`src/core/composicao.ts`](../../src/core/composicao.ts) · [`src/core/modos.ts`](../../src/core/modos.ts) |
| **prévia** | O texto determinístico do portão (Motor A+ v3), mostrado como reserva enquanto o texto realizado (LLM) corre. | [`src/app/estado.js`](../../src/app/estado.js) |
| **fallback** | A rede de segurança A+ v3 (`origem = "fallback-a-mais"`): quando a cascata LLM esgota/indisponível, `montar()` gera texto fiel no dispositivo. | [`src/core/realizador/cascata.ts`](../../src/core/realizador/cascata.ts) |
| **tempero** | Condição de gramática que ENRIQUECE a frase quando casa — é SABOR, nunca PORTÃO; jamais bloqueia uma escolha. | [`src/core/composicao.ts`](../../src/core/composicao.ts) |
| **eco** | O arranjo do desfecho aberto (`{abre_com, fecha_com}`): fechar ecoando a abertura; `null` = desfecho convergente. | [`src/core/compositor/gramatica.ts`](../../src/core/compositor/gramatica.ts) |
| **rota por nível** | A política que manda cada nível para `"realizador"` (compor→realizar) ou `"ap_cru"` (A+ v3 direto). | [`src/core/geracao/geracao.ts`](../../src/core/geracao/geracao.ts) |
| **tenant** | O modelo multi-inquilino (conta/tenant/plano com limites); `novoTenant` nasce no Freemium (60d de Família, IA on) e degrada ao Grátis (mais restritivo, IA off) ao vencer. | [`src/admin/tenant/tiposTenant.ts`](../../src/admin/tenant/tiposTenant.ts) |
| **cascata** | A política de falha ordenada: retry curto só em erro transitório, falha de fidelidade → próximo provedor, teto global, depois fallback. | [`src/core/realizador/cascata.ts`](../../src/core/realizador/cascata.ts) |

Termos vizinhos, úteis para ler o fluxo:

| Termo | Uma linha | Vive em |
|---|---|---|
| **veredito** | O objeto do validador (`{pass, motivos}`); `pass = motivos.length === 0`; FAIL nunca chega à criança. | [`src/core/realizador/validador.ts`](../../src/core/realizador/validador.ts) |
| **origem** | O sinal, sempre presente, de onde o texto veio: `"llm"` ou `"fallback-a-mais"`. | [`src/core/realizador/cascata.ts`](../../src/core/realizador/cascata.ts) · [`src/core/geracao/geracao.ts`](../../src/core/geracao/geracao.ts) |
| **Motor A+ v3** | O motor de composição autoral determinístico (`composicao.ts`), ARQUIVO INTOCÁVEL, vivo como prévia + fallback. | [`src/core/composicao.ts`](../../src/core/composicao.ts) |
| **keyless** | O cliente sem chave: manda só o bearer do usuário + a anon key pública; a chave paga vive só nas edges. | [`src/backend/`](../../src/backend/) · [`functions/`](../../functions/) |
