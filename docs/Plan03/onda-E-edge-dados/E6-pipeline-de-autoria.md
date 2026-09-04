# E6 — Pipeline de autoria: lints no CI, "como adicionar um cenário", arquivamento do prompt colado

> Status: concluída (2026-09-04 · 9f9f0e4)
**Unidade de deploy:** nenhuma (scripts/CI/docs). **Depende de:** E4 (manifesto), D8 (CI).
**Desbloqueia:** a produção de conteúdo dos 4 cenários "Em breve".

## Objetivo
Escrever um cenário novo é um procedimento documentado e verificado por máquina: JSON +
SVG → lints → goldens → aparece na galeria.

## Por quê (evidência)
- Lints existem e não rodam automaticamente: `src/core/fichas/lint_fichas.ts`, `src/core/lint_grafo.ts`,
  `src/admin/validar_grafo.ts:145,194` (usado pela tela `Conteudo` do admin); fumaça
  `tests/fumaca-presenca-v3.ts` (240 histórias, presença 100%) roda em `npm test`.
- Goldens a regenerar quando o conteúdo muda: `src/core/fixtures/{composicao_golden_v2,
  composicao_golden_v3, pacote_golden_v1, prompt_golden_v1}.json`.
- Âncoras por objeto duplicadas repo↔edge (E2 verifica) — objeto novo exige as duas (e redeploy).
- `attached_assets/Pasted--Prompt-Lapida-o-do-realizador-v3-….txt` (5,9 KB): zero refs de código;
  `docs/plans02/fase14_aposentar_banco_de_frases/14-01_arquivamento-em-old.md:38` registra a
  decisão pendente de arquivar "quando o conteúdo estiver destilado em fichas".
- Custo real de um cenário (verificado): grafo v3 com moldura (aberturas/conectivos/desfechos ×4
  níveis), 4 rodadas, N objetos com `conta` (4 níveis × 3 variantes) + `tempera` + `registro`;
  fichas (identidade ×4 níveis, `sensacao`), relações objeto×objeto e objeto×cenário (×4 níveis),
  entrada em `cenarios.v1.json`; SVG; âncoras do validador; fixtures.

## Escopo (arquivos)
- `package.json` (`"lint:conteudo": "bun run src/core/lint_grafo.ts && bun run src/core/fichas/lint_fichas.ts && bun run scripts/lint-manifesto.mjs"`).
- Novo `scripts/lint-manifesto.mjs` (manifesto aponta para arquivos existentes; ids únicos;
  objetos das relações existem em `objetos.v1.json`; âncoras existem para cada objeto no
  `validador.ts`).
- Novo `docs/guia-do-codigo/70-como-adicionar-um-cenario.md`.
- `attached_assets/Pasted-*.txt` → `docs/plans02/fase14…/anexos/` ou remoção.

## Passos
1. Conferir a interface de linha de comando dos lints (aceitam caminho? saída/exit code?) e
   ajustar para receber o manifesto como entrada (iterar todos os cenários).
2. `lint-manifesto.mjs` conforme acima; `npm run lint:conteudo` no CI (D8).
3. Guia passo a passo: (a) copiar `quintal.v3.json` → `<id>.v3.json` e escrever moldura/rodadas/
   objetos; (b) objetos novos em `objetos.v1.json`; (c) `relacoes.<id>.v1.json`; (d) entrada em
   `cenarios.v1.json`; (e) SVG em `Canon.cenas`/`cenas.ts`; (f) âncoras em `validador.ts` **e** na
   edge (E2 acusa se esquecer); (g) manifesto; (h) `npm run lint:conteudo` + `npm test` (goldens);
   (i) liberar na Regras (C7). Incluir um checklist de qualidade de texto (níveis n1–n4, ritmo n1).
4. Arquivar o `Pasted-*.txt` (mover para docs ou remover) e atualizar `14-01_arquivamento-em-old.md`.

## Critérios de aceite
- `npm run lint:conteudo` verde com o quintal; falha com um manifesto quebrado de propósito.
- Guia testado: uma pessoa cria um cenário de fixture seguindo só o guia e ele aparece na galeria.

## Verificação
```
npm run lint:conteudo && npm test
```

## Riscos e cuidados
- Goldens regenerados sem revisão escondem regressão de texto — revisar o diff dos goldens no PR.

## Decisões do dono (default)
- Destino do `Pasted-*.txt` (default: mover para `docs/plans02/fase14…/anexos/`).
- Ordem dos 4 cenários a produzir e quem escreve (fora do escopo técnico).
