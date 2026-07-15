/**
 * [carregar-env.ts] — loader de .env mínimo do experimento B1.5: lê um arquivo
 *   .env e injeta em process.env sem sobrescrever o que já veio do shell.
 *
 * PAPEL: experimento (B1.5 · offline)
 * POR QUE EXISTE: dar aos scripts as chaves/params (GEMINI_/OPENAI_) sem
 *   depender de nenhum pacote de runtime (o projeto não usa dotenv).
 * ENTRA: caminhoArquivo (o .env, resolvido pelos chamadores via import.meta.dir).
 * SAI: nada — efeito colateral em process.env (não sobrescreve o shell).
 * CHAMA: node:fs (readFileSync).
 * É CHAMADO POR: gerar-historias.ts e avaliar/avaliar-pares.ts.
 * RODA POR: importado por gerar-historias.ts e avaliar-pares.ts.
 * CUIDADO: OFFLINE (o loader é grátis) — mas é por aqui que as chaves PAGAS
 *   (GEMINI_API_KEY/OPENAI_API_KEY) entram no processo. Shell sempre tem
 *   prioridade: variável já definida NÃO é sobrescrita; .env ausente é ignorado.
 *
 * — detalhe preservado —
 * Experimento B1.5 — loader de .env mínimo, sem dependência nova (o projeto
 * não usa nenhum pacote de runtime). Resolve o caminho pelo diretório do
 * PRÓPRIO script (import.meta.dir), não pelo cwd — funciona igual rodando
 * `bun run gerar-historias.ts` de dentro da pasta ou
 * `bun run experimentos/beats-para-paragrafos/gerar-historias.ts` da raiz
 * do repo. Nunca sobrescreve uma variável já definida no shell.
 */

import { readFileSync } from "node:fs";

export function carregarEnv(caminhoArquivo: string): void {
  let conteudo: string;
  try {
    conteudo = readFileSync(caminhoArquivo, "utf8");
  } catch {
    return; // .env é opcional — sem arquivo, segue só com o ambiente do shell
  }

  for (const linhaBruta of conteudo.split("\n")) {
    const linha = linhaBruta.trim();
    if (!linha || linha.startsWith("#")) continue;
    const igual = linha.indexOf("=");
    if (igual === -1) continue;

    const chave = linha.slice(0, igual).trim();
    let valor = linha.slice(igual + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    if (!chave || process.env[chave] !== undefined) continue; // shell tem prioridade
    process.env[chave] = valor;
  }
}
