# fase02 · 02-03 · Portão parental (PIN)

## Identidade
- id: `fase02-02-03`
- nó(s) da arquitetura: PINGATE
- tela(s) do brief: —
- classe: admin

## Objetivo
Proteger os ajustes adultos atrás de um PIN, sem culpar a criança em caso de erro.

## Pré-requisitos / Depende de
- `[[fase02-02-02]]` — o modo criança de onde se sai.

## Arquivos afetados
- `src/telas/PortaoParental.dc.html` (criar) — entrada de PIN.
- `src/core/acesso.ts` (editar) — verificação de PIN.

## Nomes & variáveis
- `abrirPortaoParental()` (era `backToOnboarding`).
- `verificarPin(pin)` → ok/erro.
- `tentativas`/`bloqueioAte` — lockout suave.

## Interfaces / contratos
- Usa `acesso.ts`; sem motor. Ações em [[_contratos/eventos-acoes]].

## Regras de negócio
1. **KIDMODE -.abrir ajustes.-> PINGATE -> (ok) -> PC_HOME.**
2. **Erro acolhedor:** PIN errado não pune a criança; mensagem calma.
3. **Lockout suave** após N erros (anti-tentativa, não punitivo à criança).

## Passos de implementação
1. Tela de PIN com teclado grande.
2. `verificarPin` → em sucesso `irParaTela` PC_HOME ([[fase02-02-04]]).
3. Contagem de tentativas com bloqueio temporário.

## Estados / edge-cases
- PIN errado → mensagem suave, sem X vermelho.
- bloqueado → aguardar; opção de recuperação pelo login da família.

## Critérios de aceitação / verificação
- [ ] PIN correto abre PC_HOME; errado não.
- [ ] Lockout ativa após N erros.

## Relações com outros docs
- Depende de: `[[fase02-02-02]]`
- É consumido por: `[[fase02-02-04]]`
- Reconcilia / conserta: —
