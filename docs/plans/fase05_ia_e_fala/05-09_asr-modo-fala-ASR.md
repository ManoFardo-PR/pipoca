# fase05 · 05-09 · ASR · modo Fala (ASR)

> 🟡 **STATUS · 2026-07-02 · PARCIAL (núcleo pronto; tela na sequência)** — `src/servicos/asr.ts`: `ServicoASR`/`ResultadoFala` no padrão injetável do irmão tts.ts; participação (não perfeição — baixa confiança conta); indisponível/sem permissão/erro/timeout resolvem não-participação gentil (nunca rejeita, portão não quebra); global lido lazy; sem áudio armazenado. Integração na verificação da T5 + opção "Pela voz" nas Regras fecham este doc na etapa seguinte.

## Identidade
- id: `fase05-05-09`
- nó(s) da arquitetura: ASR
- tela(s) do brief: —
- classe: f2

## Objetivo
Habilitar o modo de verificação por voz (Fala), avaliando participação — não perfeição — como irmão do serviço de TTS.

## Pré-requisitos / Depende de
- `[[fase01-01-08]]` — o modo de verificação onde "Fala" estava como "Em breve".
- `[[fase01-01-09]]` — o `ServicoTTS`, cujo padrão de serviço o ASR espelha.

## Arquivos afetados
- `src/servicos/asr.ts` (criar) — `ServicoASR` + impl.

## Nomes & variáveis
- `ServicoASR` — `{ ouvir(opts?): Promise<ResultadoFala> }`.
- `ResultadoFala` — `{ participou, confianca }`.

## Interfaces / contratos
- `ServicoASR`, `ResultadoFala` ([[_contratos/tipos-core]]).

## Regras de negócio
1. `T5 -.modo Fala.-> ASR` (quando `Modos.verificacao === "fala"`).
2. **Avalia participação, NÃO perfeição** — nunca envergonha.
3. **Irmão do TTS** — mesmo padrão de serviço injetável.
4. Sem áudio armazenado por padrão (LGPD).

## Passos de implementação
1. Definir `ServicoASR` e a impl (Web Speech / serviço).
2. Integrar no fluxo de verificação ([[fase01-01-08]]).
3. Mapear `ResultadoFala` para sucesso acolhedor.

## Estados / edge-cases
- sem permissão de microfone → cai para cuidador/auto, sem culpar a criança.
- baixa confiança → ainda conta como participação.

## Critérios de aceitação / verificação
- [ ] Modo Fala confirma por participação.
- [ ] Sem microfone não quebra o portão.

## Relações com outros docs
- Depende de: `[[fase01-01-08]]`, `[[fase01-01-09]]`
- É consumido por: `[[fase01-01-08]]`
- Reconcilia / conserta: —
