/**
 * Pipoca — Provedor simulado (MVP local da fase05)
 * -------------------------------------------------
 * Implementa `ProvedorIA` SEM rede e SEM chave: gera um Trecho
 * determinístico a partir do próprio prompt (formato do montarPrompt, 05-02)
 * e do tom do grafo. É o provedor do runtime da criança até a fase 06
 * (ProxyIA server-side + adaptadores reais).
 *
 * Propriedades que os testes/e2e exigem:
 *   - determinístico: mesmo prompt → mesmo Trecho;
 *   - distinguível do texto autoral do grafo (prefixo "✨");
 *   - ehFinal espelha o que o prompt pediu;
 *   - passa nos guardrails (vocabulário seguro, curto);
 *   - `falhar: true` → rejeita sempre (demo/teste de degradação p/ Motor A).
 */

import type { GrafoAutoral } from "../core/grafo/tipos.js";
import type { JsonSchema, OptsGeracao, ProvedorIA } from "./provedor.js";
import type { Trecho } from "../core/grafo/tipos.js";

export interface OpcoesSimulado {
  falhar?: boolean;
}

/** FNV-1a — variação estável entre templates sem aleatoriedade. */
function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function escolher<T>(opcoes: T[], semente: string): T {
  return opcoes[fnv(semente) % opcoes.length] as T;
}

export function criarProvedorSimulado(grafo: GrafoAutoral, opts?: OpcoesSimulado): ProvedorIA {
  const cen = grafo.cenario;
  const personagem = cen.personagem || "a criança";

  return {
    async gerar(prompt: string, _schema: JsonSchema, _opts?: OptsGeracao): Promise<Trecho> {
      if (opts && opts.falhar) {
        throw new Error("Provedor simulado em modo falha (teste de degradação).");
      }

      const ehFinal = prompt.indexOf('"ehFinal": true') >= 0;
      const nivelM = /NÍVEL DE LEITURA: (n[1-4])/.exec(prompt);
      const nivel = nivelM ? nivelM[1] : "n2";
      const curto = nivel === "n1" || nivel === "n2";

      const objetoM = /objeto (\S+) "([^"]+)"/.exec(prompt);
      const abertura = prompt.indexOf("PEDIDO: escreva a ABERTURA") >= 0;

      let texto: string;
      if (abertura) {
        texto = curto
          ? `✨ ${personagem} olha em volta. Hoje tem história nova.`
          : `✨ ${personagem} olha devagar em volta: alguma coisa pequenina está para acontecer, e hoje a história é novinha.`;
      } else if (objetoM) {
        const emoji = objetoM[1];
        const nome = objetoM[2];
        const verbo = escolher(["chega", "aparece", "acorda"], prompt);
        texto = curto
          ? `✨ ${emoji} ${nome} ${verbo} na história. ${personagem} sorri.`
          : `✨ ${emoji} ${nome} ${verbo} bem no meio da história, e ${personagem} sorri como quem guarda um segredo bom.`;
      } else if (ehFinal) {
        texto = curto
          ? `✨ A história se aninha. ${personagem} respira fundo. Fim por hoje.`
          : `✨ A história inteira se aninha como um bicho de estimação, e ${personagem} respira fundo: fim por hoje, com gosto de amanhã.`;
      } else {
        texto = `✨ A história continua, um passinho de cada vez.`;
      }

      return { texto, ehFinal };
    },
  };
}
