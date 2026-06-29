# fase03 · 03-01 · Telemetria de progresso

> 🟡 **STATUS · 2026-06-29 · PARCIAL** — Tipo `EventoTelemetria` em `src/core/estado.ts:84` + `registrarTelemetria` no seam. Faltam pontos de captura e payloads discriminados. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase03-03-01`
- nó(s) da arquitetura: TELE
- tela(s) do brief: —
- classe: admin

## Objetivo
Definir o tipo `EventoTelemetria` e o schema `pipoca.telemetria.v1`, com os pontos de captura no portão de leitura, na recompensa e na sessão, de modo privado por construção (LGPD) e com `ts` sempre injetado fora do motor.

## Pré-requisitos / Depende de
- [[fase00-00-12]]
- [[fase01-01-06]]

## Arquivos afetados
- `src/core/telemetria.ts` (criar) — tipo `EventoTelemetria`, união de tipos de evento, formato dos `dados` por tipo, validação leve e fábrica `criarEvento(...)` com injeção de `ts`.
- `src/core/captura.ts` (criar) — pontos de captura (funções puras que montam o `EventoTelemetria` a partir do `EstadoApp` + contexto e o entregam a `RepositorioPersistencia.registrarTelemetria`).
- `src/core/persistencia.ts` (editar) — nenhuma mudança de assinatura; apenas o ponto de aterrissagem `registrarTelemetria` (detalhado em [[fase03-03-03]]).
- `docs/plans/_contratos/schemas-json.md` (referência — o schema `pipoca.telemetria.v1` já está listado lá; este doc é o dono).

## Nomes & variáveis
- `EventoTelemetria` — tipo canônico ([[_contratos/tipos-core]]), definido em detalhe aqui (doc dono do nó TELE).
- `TipoEventoTelemetria` — união literal: `"leitura_confirmada" | "sessao_iniciada" | "sessao_encerrada" | "historia_concluida" | "objeto_destravado"`.
- `DadosTelemetria` — união discriminada dos payloads `dados` por tipo de evento.
- `criarEvento(tipo, perfilId, dados, agora)` — fábrica pura; `agora: number` é o `ts` injetado pela borda (CORE), nunca lido dentro do motor.
- `registrarTelemetria(evento: EventoTelemetria)` — método de `RepositorioPersistencia` ([[_contratos/tipos-core]]), reaproveitado tal qual.
- Métricas agregadas pelos `dados`: `palavras` (do trecho lido), `minutos` (derivado de `iniciadaEm`/`restanteSeg` da `Sessao`), `historias` (contagem de `historia_concluida`), `engajamento` (derivado no painel a partir da cadência de eventos — ver [[fase03-03-02]]).
- Reaproveitados do protótipo: `confirmRead` → `leitura_confirmada`; `addToScene` → `objeto_destravado` (o protótipo não tinha telemetria — `Pipoca.dc.html` apenas somava `fireflies`, sem registro).

## Interfaces / contratos
- `EventoTelemetria` ([[_contratos/tipos-core]]), `pipoca.telemetria.v1` ([[_contratos/schemas-json]]).
- `RepositorioPersistencia.registrarTelemetria` ([[_contratos/tipos-core]]).
- Tipos lidos para montar `dados`: `Sessao`, `HistoriaState`, `Nivel`, `Verificacao`, `EstadoApp` ([[_contratos/tipos-core]]).
- Ação canônica que dispara captura no portão: `confirmarLeitura("sozinho"|"juntos")` ([[_contratos/eventos-acoes]]).
- Ação canônica que dispara captura na recompensa: `aoDestravarProximo()` ([[_contratos/eventos-acoes]]).

Tipo TypeScript (forma canônica — assinaturas, não implementação):
```ts
export type TipoEventoTelemetria =
  | "leitura_confirmada"
  | "sessao_iniciada"
  | "sessao_encerrada"
  | "historia_concluida"
  | "objeto_destravado";

// payloads por tipo (união discriminada por `tipo` no nível do evento)
export interface DadosLeituraConfirmada {
  palavras: number;            // nº de palavras do Trecho lido
  cenarioId: string;
  nivel: Nivel;
  verificacao: Verificacao;    // como foi confirmada (cuidador|auto|fala)
  objetoId?: string;           // objeto que destravou (se houver)
}
export interface DadosSessaoIniciada { cenarioId?: string; blocoMin: 10 | 15 | 20 | 25; }
export interface DadosSessaoEncerrada { minutos: number; palavras: number; historias: number; }
export interface DadosHistoriaConcluida { cenarioId: string; nivel: Nivel; objetos: number; palavras: number; }
export interface DadosObjetoDestravado { cenarioId: string; objetoId: string; nivel: Nivel; }

export type DadosTelemetria =
  | DadosLeituraConfirmada
  | DadosSessaoIniciada
  | DadosSessaoEncerrada
  | DadosHistoriaConcluida
  | DadosObjetoDestravado;

export interface EventoTelemetria {
  esquema: "pipoca.telemetria.v1";
  tipo: TipoEventoTelemetria;
  perfilId: string;
  ts: number;                  // epoch ms — INJETADO fora do motor (borda CORE)
  dados: DadosTelemetria;
}

// fábrica pura: `agora` é a única fonte de tempo, vinda da borda
export function criarEvento(
  tipo: TipoEventoTelemetria,
  perfilId: string,
  dados: DadosTelemetria,
  agora: number,
): EventoTelemetria;
```

Schema persistido `pipoca.telemetria.v1` ([[_contratos/schemas-json]]):
```jsonc
{
  "esquema": "pipoca.telemetria.v1",
  "evento": {
    "tipo": "leitura_confirmada",
    "perfilId": "uuid",
    "ts": 0,
    "dados": { "palavras": 6, "cenarioId": "quintal_anoitecer", "nivel": "n2", "verificacao": "cuidador" }
  }
}
```

## Regras de negócio
1. **`ts` injetado fora do motor.** Nenhuma função de telemetria chama `Date.now()` internamente; o tempo entra pelo parâmetro `agora` na fábrica `criarEvento` (mesma disciplina do seam — o motor é função pura, ver [[_contratos/lei-do-contrato]]).
2. **Privada por construção (LGPD).** `dados` contém apenas métricas de progresso e ids opacos (`perfilId`, `cenarioId`, `objetoId`, `nivel`, `verificacao`). Nunca texto livre, nunca conteúdo lido, nunca PII além do `perfilId` (que já é id opaco do `Perfil`). A coleta e a retenção são governadas por PC_PRIV — ver [[fase02-02-09]] (PC_PRIV).
3. **`leitura_confirmada` é capturado no portão**, no mesmo ponto da ação `confirmarLeitura`, depois de o trecho ser confirmado. `dados.palavras` = nº de palavras do `Trecho` lido; `dados.verificacao` = `Modos.verificacao` vigente.
4. **`objeto_destravado` é capturado na recompensa**, no ponto da ação `aoDestravarProximo`, com o `objetoId` recém-creditado. Idempotente em relação a `creditarVagalumes`: se o objeto já fora creditado (re-render/voltar), não emite evento duplicado.
5. **`sessao_iniciada` / `sessao_encerrada`** são capturados na borda da `Sessao` (início do bloco de foco e seu término — por tempo esgotado, saída ou conclusão). `minutos` = `round((iniciadaEm_ms_de_encerramento - Sessao.iniciadaEm)/60000)` calculado na borda.
6. **`historia_concluida`** é capturado quando `HistoriaState.aberta` passa a `false` (chegou ao desfecho). `dados.objetos` = `historia.objetos.length`; `dados.palavras` = soma das palavras dos trechos da história.
7. **Sem efeitos colaterais na captura.** As funções de `captura.ts` montam o evento e chamam `registrarTelemetria`; falha de persistência nunca trava a UI (a leitura/recompensa segue normalmente — ver [[fase03-03-03]]).
8. **Versionamento.** O campo `esquema` é fixo `"pipoca.telemetria.v1"`; mudança de forma exige `.v2` novo (nunca mutar o `.v1` publicado — [[_contratos/schemas-json]]).
9. **Nenhuma menção a motor.** Este doc não cita `MotorGrafoAutoral`/`MotorIA`; telemetria observa o `EstadoApp` e as ações, não a narrativa (compatível com [[_contratos/lei-do-contrato]]).

## Passos de implementação
1. Em `src/core/telemetria.ts`, declarar `TipoEventoTelemetria`, os payloads `Dados*`, `DadosTelemetria` e o tipo canônico `EventoTelemetria` (forma idêntica à seção "Interfaces / contratos").
2. Implementar `criarEvento(tipo, perfilId, dados, agora)`: retorna `{ esquema: "pipoca.telemetria.v1", tipo, perfilId, ts: agora, dados }`. Pseudocódigo:
   ```
   função criarEvento(tipo, perfilId, dados, agora):
     assert(agora é número finito)          // tempo vem da borda
     retorna { esquema:"pipoca.telemetria.v1", tipo, perfilId, ts: agora, dados }
   ```
3. Adicionar `validarEvento(e): boolean` leve: checa `esquema`, `tipo ∈ TipoEventoTelemetria`, `perfilId` não-vazio, `ts` numérico e `dados` coerente com `tipo`.
4. Em `src/core/captura.ts`, criar funções puras de captura, cada uma recebendo o `EstadoApp` (ou o recorte necessário) + `agora` + `repo: RepositorioPersistencia`:
   - `capturarLeituraConfirmada(estado, palavras, objetoId?, agora, repo)` — chamada no fluxo de `confirmarLeitura` ([[fase01-01-06]]).
   - `capturarObjetoDestravado(estado, objetoId, agora, repo)` — chamada no fluxo de `aoDestravarProximo` (recompensa, [[fase01-01-10]]).
   - `capturarSessaoIniciada(estado, agora, repo)` / `capturarSessaoEncerrada(estado, agora, repo)` — borda da `Sessao` ([[fase00-00-08]]).
   - `capturarHistoriaConcluida(estado, agora, repo)` — quando `HistoriaState.aberta` vira `false` ([[fase00-00-09]]).
   Pseudocódigo de uma captura:
   ```
   função capturarLeituraConfirmada(estado, palavras, objetoId, agora, repo):
     dados = { palavras, cenarioId: estado.historia.cenarioId,
               nivel: estado.perfil.nivel, verificacao: estado.modos.verificacao, objetoId }
     evento = criarEvento("leitura_confirmada", estado.perfil.id, dados, agora)
     repo.registrarTelemetria(evento)   // fire-and-forget; erro não trava UI ([[fase03-03-03]])
   ```
5. Garantir a injeção de `agora` na borda: as telas/CORE passam `Date.now()` (ou o relógio mockável de teste) ao chamar as funções de captura; nada de tempo dentro de `telemetria.ts`/`captura.ts`.
6. Conectar `registrarTelemetria` ao destino real (local agora; Supabase na Fase 1.5) em [[fase03-03-03]].

## Estados / edge-cases
- **Sem perfil ativo (`EstadoApp.perfil === null`):** não captura nada (precondição `perfilId`); retorna sem erro.
- **Persistência indisponível:** `registrarTelemetria` rejeita/lança → captura engole o erro (fire-and-forget) e a UI segue; eventos podem ser enfileirados localmente ([[fase03-03-03]]).
- **Re-render / voltar de tela:** captura de `objeto_destravado` e `leitura_confirmada` é idempotente por objeto commitado (alinhada ao `creditarVagalumes` idempotente — [[_contratos/eventos-acoes]]); sem evento duplicado.
- **Sessão encerrada sem leitura:** emite `sessao_encerrada` com `palavras: 0, historias: 0`; o painel trata zero com mensagem encorajadora, nunca como falha ([[fase03-03-02]]).
- **`reduceMotion` / a11y:** telemetria não tem UI própria; não há animação a suprimir.
- **PC_PRIV desliga coleta:** se o cuidador desativar telemetria, as funções de captura viram no-op (flag lida do `EstadoApp.modos`/config de privacidade — [[fase02-02-09]]).

## Critérios de aceitação / verificação
- [ ] `EventoTelemetria` e `pipoca.telemetria.v1` batem **exatamente** com [[_contratos/tipos-core]] e [[_contratos/schemas-json]] (nomes, literais de `tipo`, campo `esquema`).
- [ ] Nenhuma função de `telemetria.ts`/`captura.ts` chama `Date.now()`; `ts` só entra por parâmetro `agora` (teste: mockar relógio e verificar `evento.ts`).
- [ ] Os 5 tipos de evento são capturados nos pontos certos: portão (`leitura_confirmada`), recompensa (`objeto_destravado`), sessão (`sessao_iniciada`/`sessao_encerrada`), desfecho (`historia_concluida`).
- [ ] `dados` nunca contém texto lido nem PII além de ids opacos (revisão LGPD com [[fase02-02-09]]).
- [ ] Falha de `registrarTelemetria` não trava a leitura nem a recompensa (teste com repo que rejeita).
- [ ] Captura idempotente: chamar `capturarObjetoDestravado` duas vezes para o mesmo objeto não duplica evento.
- [ ] Este doc não cita `MotorGrafoAutoral`/`MotorIA` ([[_contratos/lei-do-contrato]]).

## Relações com outros docs
- Depende de: `[[fase00-00-12]]` · `[[fase01-01-06]]`
- Consome (em "Relações", não importa motor): `Sessao` `[[fase00-00-08]]`, `HistoriaState` `[[fase00-00-09]]`, `Perfil` `[[fase00-00-07]]`, `Modos` `[[fase00-00-11]]`; ações `confirmarLeitura`/`aoDestravarProximo` de `[[fase01-01-06]]` e `[[fase01-01-10]]`.
- É consumido por: `[[fase03-03-02]]` (PC_DASH lê a telemetria) · `[[fase03-03-03]]` (onde TELE aterrissa em SAVE).
- LGPD / privacidade: `[[fase02-02-09]]` (PC_PRIV governa coleta, retenção e anonimização).
