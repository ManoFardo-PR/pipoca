# fase05 · 05-02 · Prompt base (Motor B)

> 🟢 **STATUS · 2026-07-02 · IMPLEMENTADO** — `PROMPT_BASE` + `montarPrompt(ctx)` puros em `src/ia/prompt.ts` (caminho consolidado: os arquivos `src/motores/ia/promptBase.ts`/`niveisPrompt.ts` citados abaixo viraram um módulo só; `descricaoNivel` vive nele). Bloco de segurança infantil, um nível por chamada, ehFinal por tipo, edge-cases (comecinho, aberto sem ramo, tom neutro) cobertos em `src/ia/ia.test.ts`.

## Identidade
- id: `fase05-05-02`
- nó(s) da arquitetura: AIMODEL
- tela(s) do brief: —
- classe: f2

## Objetivo
Definir o prompt base (system + montagem por chamada) que mapeia `(historia, objeto, nivel, modoDesfecho)` em um `Trecho` `{ texto, ehFinal }`, espelhando o tom e os níveis do grafo autoral e impondo restrições de segurança infantil.

## Pré-requisitos / Depende de
- `[[fase05-05-01]]`
- `[[fase00-00-13]]`
- `[[fase00-00-15]]`

## Arquivos afetados
- `src/motores/ia/promptBase.ts` (criar — system prompt + função `montarPrompt`)
- `src/motores/ia/niveisPrompt.ts` (criar — descrição de cada `Nivel` espelhando o grafo)
- `docs/plans/_contratos/schemas-json.md` (referência — `Trecho`)

## Nomes & variáveis
- `PROMPT_BASE` — string do system prompt (instruções fixas de tom/segurança).
- `montarPrompt(ctx)` — função pura que devolve a string de usuário por chamada.
- `ctx` — `{ tipo, historia, objetoId?, nivel, modoDesfecho, grafo }`:
  - `tipo: "abertura" | "objeto" | "desfecho"` — qual método de `MotorNarrativa` chamou.
  - `historia: string[]` — ids dos objetos commitados (= `HistoriaState.objetos`).
  - `objetoId?: string` — objeto recém-colocado (só em `tipo="objeto"`).
  - `nivel: Nivel` — `"n1".."n4"` ([[_contratos/tipos-core]]).
  - `modoDesfecho: ModoDesfecho` — `"convergente" | "aberto"`.
  - `grafo: GrafoAutoral` — fonte do tom (cenário, personagem, paleta) e dos níveis.
- `descricaoNivel: Record<Nivel, string>` — espelha `GrafoAutoral.niveis` (ex.: n1 = sílabas/palavras soltas).
- `Fragmento4` — formato `{ n1, n2, n3, n4 }` ([[_contratos/tipos-core]]); o prompt pede UM nível por vez, não os quatro.

## Interfaces / contratos
- `Trecho` ([[_contratos/tipos-core]]) — o que o prompt deve produzir (`{ texto, ehFinal }`; `objetoId` é injetado pelo motor, não pela IA).
- `GrafoAutoral`, `Cenario`, `Objeto`, `Fragmento4` ([[_contratos/tipos-core]]) — fonte do tom; schema `pipoca.grafo-autoral.v1` ([[_contratos/schemas-json]]).
- `Nivel` ([[_contratos/tipos-core]]) — definido por [[fase00-00-15]].
- `Trecho` ([[_contratos/schemas-json]]) — schema JSON que restringe a saída (ver [[fase05-05-03]]).

## Regras de negócio
1. **Espelhar o tom do grafo**: o prompt usa `cenario.nome`, `cenario.personagem` e `cenario.paleta` do `GrafoAutoral` para manter a voz autoral. Um objeto novo gera texto coerente com o que o grafo geraria.
2. **Um nível por vez**: o prompt pede o fragmento **apenas** no `nivel` pedido (espelha `Fragmento4[nivel]`), com a complexidade descrita em `descricaoNivel` (de [[fase00-00-15]] / `GrafoAutoral.niveis`).
3. **A regra de ouro continua**: o texto gerado é curto o bastante para ser lido no portão antes de soltar o próximo objeto.
4. **`ehFinal`**: o prompt marca `ehFinal=true` somente em `tipo="desfecho"`; nos demais `ehFinal=false`.
5. **Restrições de segurança infantil (no prompt)**: conteúdo sempre adequado a 3–12 anos; sem violência gráfica, medo extremo, temas adultos, marcas, links, dados pessoais; tom acolhedor, nunca condescendente nem clínico; nunca envergonha a criança.
6. **Sem PII no prompt**: não inclui nome real, idade exata como identificador, nem dados do `Perfil` além do necessário ao tom (o nome da criança, se usado, é tratado como apelido).
7. **Saída estruturada**: o prompt instrui a responder **somente** no formato `Trecho` (texto + ehFinal). A imposição forte (JSON schema) é do provedor ([[fase05-05-03]], [[fase05-05-04]], [[fase05-05-05]]).
8. **Determinismo de borda**: o prompt não pede timestamps nem números aleatórios; variação fica a cargo do provedor.

## Passos de implementação
1. Escrever `PROMPT_BASE` (system): papel ("narrador de histórias para crianças"), tom (calmo, rico mas focado), e o bloco de restrições de segurança (regra 5).
2. Criar `descricaoNivel` espelhando `GrafoAutoral.niveis` (n1..n4), reaproveitando [[fase00-00-15]].
3. Implementar `montarPrompt(ctx)`:
   - injetar contexto do cenário (`nome`, `personagem`, `paleta`);
   - injetar `historia` (lista legível dos objetos já colocados, em ordem);
   - para `tipo="objeto"`, injetar `objetoId` e o papel/significado do objeto a partir do `grafo`;
   - para `tipo="desfecho"`, injetar `modoDesfecho` e o último objeto da `historia`;
   - injetar `nivel` + `descricaoNivel[nivel]`;
   - instruir a responder no formato `Trecho`.
4. Garantir que `montarPrompt` é **pura** (sem `Date.now()`, sem rede).
5. Exportar `PROMPT_BASE` e `montarPrompt` para uso por [[fase05-05-03]].

## Estados / edge-cases
- `historia=[]` em `tipo="objeto"`: prompt de "primeiro objeto" (sem contexto anterior).
- `tipo="desfecho"` com `modoDesfecho="aberto"` mas último objeto sem ramo: instruir desfecho convergente acolhedor (espelha degradação do Motor A).
- `nivel="n1"`: pedir sílabas/palavras curtas; texto mínimo.
- Cenário sem `paleta`/`personagem`: prompt degrada para tom neutro acolhedor.
- Conteúdo potencialmente inseguro: o prompt pede recusa/reformulação; a barreira dura é [[fase05-05-08]].

## Critérios de aceitação / verificação
- [ ] `montarPrompt` é função pura (sem efeitos, sem timestamp/aleatório).
- [ ] O prompt pede UM nível (`Fragmento4[nivel]`), não os quatro.
- [ ] `PROMPT_BASE` contém o bloco de segurança infantil (regra 5) e a postura "nunca envergonha".
- [ ] Para `tipo="desfecho"`, o prompt produz `ehFinal=true`; senão `ehFinal=false`.
- [ ] O prompt referencia o formato `Trecho`.
- [ ] Comparado ao Motor A nas fixtures de [[fase00-00-21]], a saída mantém tom e nível equivalentes.

## Relações com outros docs
- Depende de: `[[fase05-05-01]]`, `[[fase00-00-13]]`, `[[fase00-00-15]]`
- É consumido por: `[[fase05-05-03]]` (montagem e chamada), `[[fase05-05-01]]` (MotorIA)
- Consome: `[[fase00-00-13]]` (grafo/tom), `[[fase00-00-15]]` (níveis)
- Segurança reforçada por: `[[fase05-05-08]]`
