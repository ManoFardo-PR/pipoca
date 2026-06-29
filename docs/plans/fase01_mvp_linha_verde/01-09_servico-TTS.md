# fase01 · 01-09 · Serviço de TTS

## Identidade
- id: `fase01-01-09`
- nó(s) da arquitetura: TTS
- tela(s) do brief: —
- classe: mvp

## Objetivo
Abstrair a fala (text-to-speech) atrás de uma interface, substituindo o `_speak` inline do protótipo.

## Pré-requisitos / Depende de
- `[[fase00-00-02]]` — convenções para serviços/injeção.

## Arquivos afetados
- `src/servicos/tts.ts` (criar) — `ServicoTTS` + impl Web Speech.

## Nomes & variáveis
- `ServicoTTS` — `{ falar(texto, opts?) }`.
- impl: `window.speechSynthesis` com `lang: "pt-BR"`, `rate: 0.82`, `pitch: 1.05`, escolha de voz pt (do protótipo).

## Interfaces / contratos
- `ServicoTTS` ([[_contratos/tipos-core]]).

## Regras de negócio
1. **Abstração:** telas dependem de `ServicoTTS`, não de `speechSynthesis`.
2. **pt-BR primeiro**, com fallback de voz.
3. **Irmão do ASR** ([[fase05-05-09]]) — mesmo padrão de serviço.
4. Respeita preferências de A11y onde aplicável.

## Passos de implementação
1. Definir `ServicoTTS` e a impl Web Speech.
2. Portar a seleção de voz pt-BR do `_speak`.
3. Injetar a instância nas telas que falam (Tela 5).

## Estados / edge-cases
- sem `speechSynthesis` → no-op silencioso (não quebra a leitura).
- sem voz pt-BR → usa voz pt genérica/fallback.

## Critérios de aceitação / verificação
- [ ] `falar("vaga-lume")` fala em pt-BR quando disponível.
- [ ] Ausência de TTS não quebra o portão.

## Relações com outros docs
- Depende de: `[[fase00-00-02]]`
- É consumido por: `[[fase01-01-06]]`, `[[fase01-01-07]]`, `[[fase05-05-09]]`
- Reconcilia / conserta: —
