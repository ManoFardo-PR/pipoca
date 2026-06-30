# fase02 · 02-09 · Privacidade e dados (LGPD)

> 🟡 **STATUS · 2026-06-29 · PARCIAL** — Núcleo `src/core/lgpd.ts` (`exportarDados` → JSON dos schemas congelados; `apagarDados` → remove perfil+save+telemetria via seam `apagarPerfil`), no bridge (`PipocaCanonico.lgpd`) e testado (`parciais.test.ts`). Falta a tela `Privacidade` + registro de consentimento (app). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase02-02-09`
- nó(s) da arquitetura: PC_PRIV
- tela(s) do brief: —
- classe: admin

## Objetivo
Dar ao cuidador controle sobre os dados (exportar, apagar, consentir), com minimização — privacidade no controle do cuidador.

## Pré-requisitos / Depende de
- `[[fase02-02-04]]` — acessível pelo hub do cuidador.
- `[[fase00-00-12]]` — o seam de persistência onde os dados vivem.

## Arquivos afetados
- `src/telas/Privacidade.dc.html` (criar) — controles LGPD.
- `src/core/lgpd.ts` (criar) — exportar/apagar.

## Nomes & variáveis
- `exportarDados(perfilId)`, `apagarDados(perfilId)`, `consentimento`.

## Interfaces / contratos
- `RepositorioPersistencia` ([[_contratos/tipos-core]]); schemas `pipoca.perfil.v1`/`pipoca.save.v1` ([[_contratos/schemas-json]]).

## Regras de negócio
1. **Minimização:** só nome/apelido, idade e progresso.
2. **Direito de apagar/exportar** a qualquer momento.
3. **Conteúdo seguro para crianças** e sem dark patterns.
4. Telemetria é privada por construção ([[fase03-03-01]]).

## Passos de implementação
1. Botões de exportar (JSON) e apagar (com confirmação calma).
2. Registro de consentimento.
3. Operar via `RepositorioPersistencia`.

## Estados / edge-cases
- apagar tudo → volta ao estado inicial; sem resíduos.
- exportar sem dados → arquivo vazio coerente.

## Critérios de aceitação / verificação
- [ ] Exportar produz JSON dos schemas.
- [ ] Apagar remove dados do perfil.

## Relações com outros docs
- Depende de: `[[fase02-02-04]]`, `[[fase00-00-12]]`
- É consumido por: `[[fase03-03-03]]`
- Reconcilia / conserta: —
