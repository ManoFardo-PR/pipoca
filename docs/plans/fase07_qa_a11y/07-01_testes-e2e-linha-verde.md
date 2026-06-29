# fase07 · 07-01 · Testes e2e da linha verde

## Identidade
- id: `fase07-07-01`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Validar de ponta a ponta o caminho mínimo da criança (T2→T7) com a história saindo do grafo.

## Pré-requisitos / Depende de
- `[[fase01-01-06]]` — o portão, ponto central do fluxo.
- `[[fase00-00-21]]` — as fixtures do motor (trajetórias convergente/aberto).

## Arquivos afetados
- `tests/e2e/linha-verde.spec.ts` (criar) — percorre T2→T7.

## Nomes & variáveis
- `fluxoLinhaVerde()` — entra, escolhe cenário, monta a tira, lê no portão, recebe recompensa, vê o pote.
- reusa as fixtures de [[fase00-00-21]] (`["vagalume","frasco","vento"]` etc.).

## Interfaces / contratos
- Exercita `MotorNarrativa`/`ValidadorOrdem` via UI; não importa motor concreto (lei do seam).

## Regras de negócio
1. **Texto vem do grafo** (não hardcoded) em cada passo.
2. **Regra de ouro:** só destrava após ler no portão.
3. **Sem X vermelho** em nenhum estado de re-tentativa.

## Passos de implementação
1. Subir o app de teste (dc-runtime).
2. Simular o fluxo T2→T7 com uma fixture.
3. Asserir trechos, destrava de objeto e crédito de vaga-lumes.

## Estados / edge-cases
- ordem inválida da tira → dica acolhedora (sem bloqueio punitivo).
- sem voz pt-BR → leitura segue (TTS degrada).

## Critérios de aceitação / verificação
- [ ] O fluxo completo passa com pelo menos uma fixture convergente e uma aberta.
- [ ] Nenhum texto hardcoded aparece no caminho.

## Relações com outros docs
- Depende de: `[[fase01-01-06]]`, `[[fase00-00-21]]`
- É consumido por: `[[fase07-07-04]]`
- Reconcilia / conserta: —
