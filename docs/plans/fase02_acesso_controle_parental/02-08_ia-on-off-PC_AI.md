# fase02 · 02-08 · IA ligada/desligada para a criança (PC_AI)

## Identidade
- id: `fase02-02-08`
- nó(s) da arquitetura: PC_AI
- tela(s) do brief: —
- classe: admin

## Objetivo
Dar ao cuidador o controle de autorizar (ou não) a geração por IA (Motor B) para a criança.

## Pré-requisitos / Depende de
- `[[fase02-02-04]]` — acessível pelo hub do cuidador.
- `[[fase00-00-11]]` — a flag `Modos.iaLigada`.

## Arquivos afetados
- `src/telas/IaToggle.dc.html` (criar) — toggle de IA por perfil.

## Nomes & variáveis
- `autorizarIA(perfilId, on)` — escreve `Modos.iaLigada`.
- default `false` (MVP).

## Interfaces / contratos
- `Modos` ([[_contratos/tipos-core]]); ações em [[_contratos/eventos-acoes]].

## Regras de negócio
1. **Default seguro = desligado.**
2. `PC_AI -.autoriza IA p/ a criança.-> MB`: a fábrica ([[fase00-00-19]]) lê `iaLigada`.
3. Sem provedor configurado ([[fase04-04-05]]) → permanece Motor A.

## Passos de implementação
1. Toggle por perfil → `Modos.iaLigada`.
2. Mostrar estado do provedor (disponível/indisponível).
3. Persistir.

## Estados / edge-cases
- `on` sem provedor → aviso, Motor A na prática.

## Critérios de aceitação / verificação
- [ ] Toggle altera `Modos.iaLigada`.
- [ ] Fábrica respeita a flag.

## Relações com outros docs
- Depende de: `[[fase02-02-04]]`, `[[fase00-00-11]]`
- É consumido por: `[[fase00-00-19]]`, `[[fase05-05-01]]`
- Reconcilia / conserta: —
