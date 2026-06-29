# fase00 · 00-04 · Folha de componentes

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/componentes/{Botao,CartaoHistoria,Vagalume,ChipObjeto,BarraLeitura,ModalCuidador}.dc.html` + `EsqueletoRef`; alvos ≥44px; sem X vermelho. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase00-00-04`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Definir os componentes reutilizáveis (.dc.html) e seus estados, conforme a "folha de componentes" do brief.

## Pré-requisitos / Depende de
- `[[fase00-00-02]]` — convenções de componente dc-runtime.
- `[[fase00-00-03]]` — design tokens.

## Arquivos afetados
- `src/componentes/Botao.dc.html`, `CartaoHistoria.dc.html`, `Vagalume.dc.html`, `ChipObjeto.dc.html`, `BarraLeitura.dc.html`, `ModalCuidador.dc.html` (criar).

## Nomes & variáveis
- `Botao` (props: `rotulo`, `onClick`, `variante`: primario/secundario, `tamanho`).
- `CartaoHistoria` (texto do `Trecho`, número da frase).
- `Vagalume` (o token/ponto: `quantidade`, glow).
- `ChipObjeto` (objeto da bandeja: `emoji`, `nome`, `bloqueado`).
- `BarraLeitura` (`fraseAtual`/`totalFrases`).
- `ModalCuidador` (overlay sóbrio para fluxos adultos).

## Interfaces / contratos
- Consome tokens de [[fase00-00-03]]; renderiza `Trecho`/`Objeto` ([[_contratos/tipos-core]]) por props.

## Regras de negócio
1. **Estados obrigatórios** (brief): vazio, lendo, sucesso, **re-tentativa acolhedora** — nunca X vermelho.
2. **Alvos de toque grandes**, espaçados (mãos pequenas).
3. **Ícone antes de palavra** (pré-leitores), rótulo opcional.
4. **Calmo:** profundidade por luz/textura, não por quantidade.

## Passos de implementação
1. Criar cada componente com `<x-dc>` + `class Component extends DCLogic` e contrato de props.
2. Documentar os estados de cada um.
3. Usar `ref`+`_inject` para SVGs (vaga-lume, objeto).

## Estados / edge-cases
- `ChipObjeto` bloqueado → cadeado, sem ação.
- `Botao` desabilitado → sem cor punitiva.

## Critérios de aceitação / verificação
- [ ] Cada componente cobre os 4 estados do brief.
- [ ] Reuso nas telas (T4/T5/T7) sem duplicar marcação.

## Relações com outros docs
- Depende de: `[[fase00-00-02]]`, `[[fase00-00-03]]`
- É consumido por: `[[fase01-01-06]]`, `[[fase01-01-10]]`, `[[fase01-01-11]]`
- Reconcilia / conserta: —
