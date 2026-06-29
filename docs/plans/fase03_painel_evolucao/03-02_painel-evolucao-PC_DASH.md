# fase03 · 03-02 · Painel de evolução da leitura

## Identidade
- id: `fase03-03-02`
- nó(s) da arquitetura: PC_DASH
- tela(s) do brief: 8
- classe: admin

## Objetivo
Entregar o painel do cuidador (tela 8, Fase 1.5) que mostra a evolução da leitura — minutos, palavras, histórias e engajamento ao longo do tempo — de forma encorajadora e calma, lendo a telemetria privada e acessível a partir do PC_HOME.

## Pré-requisitos / Depende de
- [[fase03-03-01]]
- [[fase02-02-04]]

## Arquivos afetados
- `src/telas/PainelEvolucao.dc.html` (criar) — a tela PC_DASH (componente `.dc.html`, ver [[_contratos/convencoes-dc-runtime]]).
- `src/core/agregadosTelemetria.ts` (criar) — funções puras que transformam `EventoTelemetria[]` em séries/resumos para o painel (minutos, palavras, histórias, engajamento por período).
- `src/telas/PainelCuidador.dc.html` (editar — dono em [[fase02-02-04]]) — adicionar o ponto de entrada "Evolução da leitura" que navega para PC_DASH (apenas o link; a tela é deste doc).

## Nomes & variáveis
- `PainelEvolucao` — classe do componente `.dc.html` (`class PainelEvolucao extends DCLogic`).
- `EventoTelemetria`, `pipoca.telemetria.v1` — fonte de dados ([[fase03-03-01]]).
- `RepositorioPersistencia` — origem dos eventos (via leitura do destino de [[fase03-03-03]]).
- Estado interno do componente (`setState`): `carregando: boolean`, `periodo: "semana" | "mes" | "tudo"`, `resumo: ResumoEvolucao`, `series: SeriesEvolucao`, `vazio: boolean`.
- `ResumoEvolucao` — totais do período: `{ minutos, palavras, historias, diasAtivos, sequenciaDias }`.
- `SeriesEvolucao` — séries temporais para os gráficos: `{ minutosPorDia, palavrasPorDia, historiasPorSemana, engajamentoPorDia }`.
- `engajamento` — índice 0..1 derivado da cadência de eventos (não é "nota"); rotulado como linguagem calorosa, nunca percentual frio.
- `chartRef` / `sparklineRef` — refs para subárvores imperativas dos gráficos (regra "SVG fora dos holes" — ver [[_contratos/convencoes-dc-runtime]]).
- `irParaTela(n)` — ação canônica para navegação de/para o painel ([[_contratos/eventos-acoes]]).
- Novo no protótipo: a tela 8 **não existe** em `Pipoca.dc.html` (o protótipo cobre só telas 1-7); este doc a cria do zero.

## Interfaces / contratos
- Lê `EventoTelemetria` (`pipoca.telemetria.v1`) — [[_contratos/tipos-core]] / [[_contratos/schemas-json]].
- `RepositorioPersistencia` (origem dos eventos persistidos) — [[_contratos/tipos-core]].
- `A11yPrefs` — aplica fonte/contraste/`reduceMotion` ao painel ([[_contratos/tipos-core]]).
- Ação `irParaTela(n)` — [[_contratos/eventos-acoes]].

Tipos auxiliares do agregador (forma canônica — derivam de `EventoTelemetria`, não criam tipo de domínio novo):
```ts
import type { EventoTelemetria } from "../core/telemetria"; // [[fase03-03-01]]

export interface ResumoEvolucao {
  minutos: number;
  palavras: number;
  historias: number;
  diasAtivos: number;
  sequenciaDias: number;     // dias seguidos com ao menos 1 leitura_confirmada
}
export interface PontoSerie { rotulo: string; valor: number; }   // rotulo = dia/semana
export interface SeriesEvolucao {
  minutosPorDia: PontoSerie[];
  palavrasPorDia: PontoSerie[];
  historiasPorSemana: PontoSerie[];
  engajamentoPorDia: PontoSerie[];   // valor 0..1
}
export type PeriodoPainel = "semana" | "mes" | "tudo";

export function resumir(eventos: EventoTelemetria[], periodo: PeriodoPainel, agora: number): ResumoEvolucao;
export function gerarSeries(eventos: EventoTelemetria[], periodo: PeriodoPainel, agora: number): SeriesEvolucao;
export function calcularEngajamento(eventos: EventoTelemetria[], dia: string): number; // 0..1
```

`renderVals()` do componente expõe os holes do template (ver [[_contratos/convencoes-dc-runtime]]): `{ carregando, vazio, periodo, resumo, series, chartRef, sparklineRef, fonteLeitura, irParaTela, trocarPeriodo, mensagemEncorajadora }`.

## Regras de negócio
1. **Visual encorajador, não planilha fria.** O painel abre com uma frase calorosa em destaque ("Esta semana o Pingo leu 6 histórias e 142 palavras 🌱"), depois cartões grandes (minutos, palavras, histórias) e só então pequenos gráficos. Sem grade de planilha, sem percentual cru de "desempenho", sem vermelho/queda punitiva.
2. **Quatro métricas do brief:** minutos, palavras, histórias e engajamento ao longo do tempo (tela 8 do brief). Cada uma vem de agregação de `EventoTelemetria`:
   - minutos ← soma de `sessao_encerrada.dados.minutos`;
   - palavras ← soma de `leitura_confirmada.dados.palavras` (e `historia_concluida.dados.palavras` para totais por história);
   - histórias ← contagem de `historia_concluida`;
   - engajamento ← `calcularEngajamento` (cadência/regularidade de `leitura_confirmada` e `sessao_iniciada`), normalizado 0..1.
3. **Tendência sem culpa.** Quedas são mostradas de forma neutra ("menos leituras esta semana — tudo bem, o ritmo varia"), nunca como falha. Sem "metas não atingidas" em vermelho.
4. **Só leitura (read-only).** PC_DASH apenas lê telemetria; não grava telemetria nem altera `EstadoApp`. Mudanças de configuração ficam em outras telas parentais.
5. **Privacidade.** Mostra dados só do(s) perfil(is) da própria conta, atrás do PIN (acessível pelo PC_HOME, que já está sob PINGATE — ver [[fase02-02-04]]). Respeita PC_PRIV: se a coleta estiver desligada, o painel exibe estado "sem dados ainda" sem expor histórico ([[fase02-02-09]]).
6. **`reduceMotion` obrigatório.** Com `A11yPrefs.reduceMotion === true`, gráficos aparecem estáticos (sem animação de desenho/contagem crescente); sem parallax. Aplica fonte (Atkinson se `dyslexia`), contraste e `letter-spacing` como toda tela ([[_contratos/convencoes-dc-runtime]]).
7. **Um foco por tela (calmo).** Um período visível por vez (`semana` por padrão); trocar período é uma ação explícita (`trocarPeriodo`), não muitos gráficos competindo.
8. **SVG fora dos holes.** Gráficos/sparklines são injetados via `ref` + `this._inject(el, svg)`, nunca por `{{ }}` (regra do runtime — [[_contratos/convencoes-dc-runtime]]).
9. **Nenhuma menção a motor.** Esta tela não importa `MotorGrafoAutoral`/`MotorIA`; não há narrativa aqui, só leitura de telemetria (compatível com [[_contratos/lei-do-contrato]]).

## Passos de implementação
1. Criar `src/core/agregadosTelemetria.ts` com `resumir`, `gerarSeries`, `calcularEngajamento` (puras; `agora` injetado para janela de tempo). Pseudocódigo do resumo:
   ```
   função resumir(eventos, periodo, agora):
     janela = filtrarPorPeriodo(eventos, periodo, agora)
     minutos  = soma(e.dados.minutos para e em janela se e.tipo=="sessao_encerrada")
     palavras = soma(e.dados.palavras para e em janela se e.tipo=="leitura_confirmada")
     historias= conta(e em janela se e.tipo=="historia_concluida")
     diasAtivos = nº de dias distintos com algum evento
     sequenciaDias = maior cadeia de dias consecutivos com leitura_confirmada
     retorna { minutos, palavras, historias, diasAtivos, sequenciaDias }
   ```
2. Implementar `calcularEngajamento(eventos, dia)`: combina regularidade (leu hoje?), volume (leituras/dia) e variedade (cenários distintos) em 0..1; documentar a fórmula como heurística calorosa, não nota.
3. Criar `src/telas/PainelEvolucao.dc.html`: template com (a) frase encorajadora `{{ mensagemEncorajadora }}`, (b) cartões grandes de minutos/palavras/histórias via `<sc-for>`, (c) seletor de período `<sc-if>`/botões `trocarPeriodo`, (d) containers de gráfico com `ref="{{ chartRef }}"`.
4. Na lógica do componente: `componentDidMount()` → `carregando=true`, ler eventos do `RepositorioPersistencia` (origem de [[fase03-03-03]]), chamar `resumir`/`gerarSeries`, `setState({ resumo, series, vazio: eventos.length===0, carregando:false })`.
5. `componentDidUpdate()` → quando `series` mudar e `!reduceMotion`, desenhar gráficos via `this._inject(chartRef, svg)`; com `reduceMotion`, injetar SVG estático.
6. `trocarPeriodo(p)` → `setState({ periodo: p })` e re-agregar.
7. Adicionar entrada "Evolução da leitura" no `PainelCuidador.dc.html` ([[fase02-02-04]]) chamando `irParaTela(8)` (ou rota PC_DASH).
8. Aplicar `A11yPrefs` ao componente (fonte/contraste/`reduceMotion`) seguindo a aplicação transversal ([[_contratos/convencoes-dc-runtime]]).

## Estados / edge-cases
- **Vazio (sem telemetria ainda):** `vazio === true` → ilustração calorosa + "A jornada de leitura aparece aqui assim que o Pingo começar 🌟"; nunca tela em branco nem "0%".
- **Carregando:** placeholder calmo (skeleton suave), sem spinner agressivo.
- **Período sem leituras (mas com histórico):** mostra zeros com tom neutro/encorajador; não usa vermelho nem "abaixo da meta".
- **`reduceMotion`:** gráficos estáticos, sem animação de contagem/desenho.
- **Sem voz pt-BR / TTS:** não se aplica (painel é adulto, sem leitura em voz alta).
- **PC_PRIV desligou coleta:** estado "sem dados" e aviso de que a coleta está pausada, com link para [[fase02-02-09]].
- **Múltiplos perfis:** se a conta tem mais de uma criança, seletor de perfil antes do painel (dado pelo `Perfil` ativo / lista de [[fase02-02-05]]).
- **Outlier de tempo (sessão deixada aberta):** `agregadosTelemetria` deve clampear `minutos` por evento a um teto razoável para não distorcer o gráfico.

## Critérios de aceitação / verificação
- [ ] Tela 8 do brief atendida: mostra minutos, palavras, histórias e engajamento ao longo do tempo.
- [ ] Estética encorajadora: frase calorosa em destaque, cartões grandes antes de gráficos; sem grade de planilha, sem vermelho de "erro/queda".
- [ ] Lê `EventoTelemetria` (`pipoca.telemetria.v1`) e nunca grava telemetria nem altera `EstadoApp` (read-only).
- [ ] Acessível a partir do PC_HOME ([[fase02-02-04]]), atrás do PIN; mostra só dados da própria conta.
- [ ] `A11yPrefs.reduceMotion === true` ⇒ gráficos estáticos; fonte para dislexia e contraste aplicados.
- [ ] SVG injetado por `ref` + `_inject`, nunca por `{{ }}` ([[_contratos/convencoes-dc-runtime]]).
- [ ] Estado vazio e período-zero exibem mensagem encorajadora (sem "0%").
- [ ] Esta tela não importa `MotorGrafoAutoral`/`MotorIA` ([[_contratos/lei-do-contrato]]).

## Relações com outros docs
- Depende de: `[[fase03-03-01]]` (telemetria/`EventoTelemetria`) · `[[fase02-02-04]]` (PC_HOME — ponto de acesso).
- Consome: `RepositorioPersistencia` como origem dos eventos (destino definido em `[[fase03-03-03]]`); `A11yPrefs` `[[fase01-01-12]]`; `Perfil` `[[fase00-00-07]]` / `[[fase02-02-05]]` (seleção de perfil).
- Privacidade: `[[fase02-02-09]]` (PC_PRIV governa o que aparece e a coleta).
- É consumido por: cuidador (uso final); nenhum doc downstream o importa.
