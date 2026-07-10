# fase12 · 12-04 · Política de falha (cascata de modelos)

## Identidade
- id: `fase12-12-04`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Fixar o que acontece quando algo falha: cascata de provedores com teto de tentativas, distinção entre falha de provedor e falha de fidelidade, e o A+ v3 como rede de segurança final de conteúdo.

## Pré-requisitos / Depende de
- `[[fase12-12-00]]` — o contrato cujo caminho infeliz esta política governa.
- `[[fase12-12-03]]` — o veredito de fidelidade que dispara metade desta política.

## Arquivos afetados
PLANEJADO: `src/core/realizador/cascata.ts` (proposta). Precedente verificado (não tocar): `src/ia/orquestrador.ts:35` — `criarOrquestrador(cadeiaFallback)` já implementa cadeia primário→fallbacks com cota/custo (`:60-84`) para o fluxo do Motor B.

## Nomes & variáveis
- `cascata` — a sequência ordenada de provedores/modelos (A → B → C) com teto de tentativas.
- `falha_de_provedor` / `falha_de_fidelidade` — as duas categorias (vocabulário deste doc; nomes finais na implementação).
- `criarOrquestrador` — o precedente da geração 1 (`src/ia/orquestrador.ts:35`).
- `ErroRecusaProvedor` — recusa de conteúdo do fluxo existente (`src/ia/provedor.ts:38-43`; SAFETY do Gemini vira recusa antes de ler conteúdo, `src/ia/adaptadores/gemini.ts:60-66`).
- Reaproveitados com grafia idêntica: `realizar`, `veredito`, `opcoes` ([[fase12-12-00]]); `ProvedorRealizador` ([[fase12-12-02]]).

## Interfaces / contratos

### As duas categorias de falha (nunca misturar)

| categoria | sinais | reação |
|---|---|---|
| **Falha de PROVEDOR** | rede/timeout/5xx; contrato de erros do proxy (401/400/503/403/422/502 — `functions/proxy-ia/index.ts:14-17`); recusa (`ErroRecusaProvedor`); resposta vazia/malformada | retry curto no mesmo provedor (quando fizer sentido: 5xx sim, recusa NÃO) → próximo da cascata |
| **Falha de FIDELIDADE** | `veredito.pass === false` ([[fase12-12-03]]) — o texto veio, mas é infiel | próximo provedor da cascata (novo texto, mesmo Pacote) → fallback final. **NUNCA entregar texto infiel** |

### A cascata
1. Provedor A (primário) — até N tentativas para falha técnica transitória; 1 tentativa para fidelidade (texto reprovado não se "reconserta" com retry idêntico).
2. Provedor B → Provedor C — mesma regra; recusa de conteúdo pula direto (não reapresentar o mesmo prompt ao mesmo modelo).
3. **Teto global de tentativas** por realização (proposta-semente: 4 chamadas de LLM no total) — acima disso, fallback final.
4. **Fallback final = A+ v3**: o texto determinístico da geração 1 (`montar`, `src/core/composicao.ts:505`) — sempre disponível, sempre fiel, já em produção.

### O que o fallback É e o que NÃO é
- É rede de segurança de **CONTEÚDO**: a geração de fichas depende de LLM; quando o LLM falha (técnica ou editorialmente), o A+ cru garante que a criança sempre recebe história.
- NÃO é rede de segurança de **CONECTIVIDADE**: sem rede, sem geração — decisão de produto já registrada como ADIADA (o app decide a experiência offline; fora deste doc).
- **Sem cache de replay** nesta fase: salvar história ≠ cachear geração (decisão de produto; persistência é assunto da fase 13, texto simples — não criar dependência).

## Regras de negócio
1. **Nunca entregar texto infiel:** FAIL de fidelidade jamais chega à criança — é a razão de existir do validador.
2. **Recusa não repete:** `ErroRecusaProvedor` pula o provedor (reapresentar o mesmo conteúdo ao mesmo modelo é perda de tentativa e de latência).
3. **Cota antes de chamar:** herda a disciplina do proxy existente (cota verificada ANTES da chamada, `functions/proxy-ia/index.ts:272-277`); cota estourada → direto ao fallback final, sem queimar cascata.
4. **Teto global é teto:** atingido o teto, fallback final — sem exceções (latência da criança > perfeccionismo da geração).
5. **Origem do texto sempre sinalizada:** o resultado marca se veio de LLM (e qual) ou do fallback A+ — telemetria e TRILHA de calibração dependem disso.
6. **Ordem da cascata é configuração de servidor** (precedente `config_ia`, `functions/proxy-ia/index.ts:266-270`), não escolha do cliente.

## Passos de implementação
1. Implementar a cascata sobre `ProvedorRealizador` ([[fase12-12-02]]), adaptando o padrão de `criarOrquestrador`.
2. Integrar o veredito ([[fase12-12-03]]) como gate entre chamada e entrega.
3. Implementar o fallback final (chamada ao `montar` do v3 com o estado da partida).
4. Testes: matriz falha-técnica × recusa × fidelidade × cota, cada célula com a reação esperada.

## Estados / edge-cases
- Todos os provedores reprovam por fidelidade → fallback A+ v3 + telemetria de alerta (3 FAILs seguidos no mesmo Pacote é sinal de problema de prompt/fichas, não de modelo).
- Falha técnica no MEIO da cascata com sucesso adiante → sucesso normal; tentativas anteriores só viram metadados.
- Fallback v3 indisponível (estado corrompido) → erro explícito de aplicação — não há quarto nível; o app trata.
- Recusa em TODOS os provedores → fallback + alerta: conteúdo do Pacote pode estar disparando filtros (investigar fichas, não retry).
- Timeout do usuário (criança esperando) → teto de latência é requisito do app (fase 13, texto simples); a cascata respeita orçamento de tempo quando fornecido em `opcoes`.

## Critérios de aceitação / verificação
- [ ] As duas categorias de falha com sinais e reações distintas (tabela).
- [ ] Cascata com teto por provedor e teto global (semente 4) registrados como calibráveis.
- [ ] Fallback final = A+ v3 com o enquadramento certo (conteúdo, não conectividade; sem cache de replay).
- [ ] Regra "nunca entregar texto infiel" e "origem sempre sinalizada" registradas.
- [ ] Precedentes citados por caminho:linha (orquestrador, contrato de erros do proxy, cota-antes).

## Relações com outros docs
- Depende de: `[[fase12-12-00]]`, `[[fase12-12-03]]`
- É consumido por: `[[fase12-12-05]]` (a calibração observa a taxa de acionamento da cascata por nível)
- Reconcilia / conserta: —
