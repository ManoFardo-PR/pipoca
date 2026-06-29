# Contrato · A lei do seam (a tela fala com o contrato, nunca com o motor)

> Regra arquitetural load-bearing. Aparece (resumida) em todo doc que toca **CN**, **MA**, **MB** ou a tira.
> O checker ([[../check_plans]]) audita violações.

## A lei

1. **Telas e CORE falam SOMENTE com `MotorNarrativa` (CN)** e, para o quebra-cabeça da tira, com
   `ValidadorOrdem`. Nenhuma tela importa `MotorGrafoAutoral` (MA) nem `MotorIA` (MB) diretamente.
2. **A troca MA↔MB acontece só na fábrica** ([[../fase00/00-19_fabrica-de-motor]]), governada por
   `Modos.iaLigada` (autorizado em [[../fase02/02-08_ia-on-off-PC_AI]]). No MVP, sempre Motor A.
3. **`HIST.objetos` é a única fonte de verdade da história**, em ordem. É exatamente o argumento
   `historia: string[]` que `MotorNarrativa` recebe. Telas não inventam estado de história paralelo.
4. **O motor é função pura do grafo**: sem UI, sem `Date.now()`, sem efeitos. Timestamps/aleatoriedade entram
   pela borda (CORE/telemetria), nunca dentro do motor.
5. **Mesma interface, motores intercambiáveis**: `MotorGrafoAutoral` (MA) e `MotorIA` (MB) implementam
   `abertura`/`aoAdicionarObjeto`/`desfecho` com assinaturas idênticas → trocar de motor **não muda nenhuma tela**.

## Por quê
A arquitetura tem dois eixos-pivô (`CN` e `AIPROV`). `CN` isola a UI do "como" da narrativa (grafo hoje, IA
amanhã). Quebrar a lei (uma tela importando MA/MB) acopla a UI ao motor e mata a troca da Fase 2.

## Como o checker audita
- Nenhum doc de tela (`T2`–`T7`, `A11Y`) pode listar `MotorGrafoAutoral`/`MotorIA` em "Arquivos afetados"
  ou "Interfaces / contratos" — só `MotorNarrativa` e/ou `ValidadorOrdem`.
- `CN` e `AIPROV` devem estar marcados como `pivot`.
- Todo nó `f2` (Motor B, AIPROV, GUARD, GEMINI/OPENAI/CLAUDE, ASR, AIMODEL) pertence só à `fase05`.
