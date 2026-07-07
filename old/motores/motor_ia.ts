/**
 * Pipoca — Motor B: MotorIA (MB) · docs fase05-05-01 / 05-03
 * -----------------------------------------------------------
 * `MotorIA implements MotorNarrativa` com as MESMAS assinaturas síncronas
 * do Motor A — e `ProvedorIA.gerar` é assíncrono. A ponte é o CACHE
 * pré-aquecido: `aquecer(historia, nivel)` gera pelos provedores os
 * trechos prováveis (abertura → objetos restantes na ordem canônica com a
 * história acumulada, como no fluxo real → desfechos nos dois modos) e os
 * três métodos síncronos servem do cache.
 *
 * Miss → resposta do Motor A interno, MEMOIZADA na mesma chave: a mesma
 * pergunta nunca muda de texto depois (determinismo observável), e falha
 * total do provedor ⇒ saída IDÊNTICA ao Motor A (critério do 05-01).
 * O motor garante o contrato sem confiar na IA: `ehFinal` é imposto por
 * tipo (true SÓ em desfecho) e `objetoId` é ecoado pelo motor, nunca
 * pela IA. Guardrails NÃO vivem aqui — vêm embrulhados no provedor
 * (composição 05-04/05-08). Sem Date/aleatório (pureza da borda); o
 * aquecimento é disparado pela borda (estado.js), fire-and-forget.
 *
 * Nota de caminho: o 05-01 cita `src/motores/MotorIA.ts` + index.ts; o
 * arquivo real segue o 05-03 (`motor_ia.ts`, convenção do motor_a.ts).
 */

import type { GrafoAutoral, ModoDesfecho, MotorNarrativa, Nivel, Trecho } from "../core/grafo/tipos.js";
import { MotorGrafoAutoral } from "./motor_a.js";
import { montarPrompt, PROMPT_BASE, type TipoPedido } from "../ia/prompt.js";
import { TRECHO_JSON_SCHEMA, type ProvedorIA } from "../ia/provedor.js";

interface AlvoAquecimento {
  tipo: TipoPedido;
  historia: string[];
  objetoId?: string;
  modo: ModoDesfecho;
}

function chaveDe(tipo: TipoPedido, nivel: Nivel, modo: string, historia: string[], objetoId?: string): string {
  return tipo + "|" + nivel + "|" + modo + "|" + historia.join(",") + "|" + (objetoId || "");
}

export class MotorIA implements MotorNarrativa {
  private readonly provedor: ProvedorIA;
  private readonly grafo: GrafoAutoral;
  private readonly modoDesfecho: ModoDesfecho; // default do aquecimento; o modo da CHAMADA manda
  private readonly motorA: MotorGrafoAutoral;
  private readonly cache = new Map<string, Trecho>();

  constructor(provedor: ProvedorIA, grafo: GrafoAutoral, modoDesfecho: ModoDesfecho) {
    this.provedor = provedor;
    this.grafo = grafo;
    this.modoDesfecho = modoDesfecho;
    this.motorA = new MotorGrafoAutoral(grafo);
  }

  abertura(nivel: Nivel): Trecho {
    return this.servir(chaveDe("abertura", nivel, "", []), () => this.motorA.abertura(nivel));
  }

  aoAdicionarObjeto(historia: string[], objetoId: string, nivel: Nivel): Trecho {
    return this.servir(chaveDe("objeto", nivel, "", historia, objetoId), () =>
      this.motorA.aoAdicionarObjeto(historia, objetoId, nivel)
    );
  }

  desfecho(historia: string[], modo: ModoDesfecho, nivel: Nivel): Trecho {
    return this.servir(chaveDe("desfecho", nivel, modo, historia), () =>
      this.motorA.desfecho(historia, modo, nivel)
    );
  }

  /**
   * Pré-gera os trechos prováveis a partir da história atual. Nunca
   * sobrescreve entrada existente (nem a degradação memoizada); falha
   * individual é engolida — o que não gerou degrada no miss. Nunca rejeita.
   */
  async aquecer(historia: string[], nivel: Nivel): Promise<void> {
    const alvos: AlvoAquecimento[] = [];
    if (historia.length === 0) {
      alvos.push({ tipo: "abertura", historia: [], modo: this.modoDesfecho });
    }
    // ordem_canonica é opcional no grafo: sem ela, só abertura + desfechos.
    const ordem = this.grafo.cenario.ordem_canonica || [];
    const acumulada = historia.slice();
    for (const id of ordem) {
      if (acumulada.indexOf(id) >= 0) continue;
      alvos.push({ tipo: "objeto", historia: acumulada.slice(), objetoId: id, modo: this.modoDesfecho });
      acumulada.push(id);
    }
    alvos.push({ tipo: "desfecho", historia: acumulada.slice(), modo: "convergente" });
    alvos.push({ tipo: "desfecho", historia: acumulada.slice(), modo: "aberto" });

    for (const alvo of alvos) {
      await this.gerarEArmazenar(alvo, nivel);
    }
  }

  private servir(chave: string, deMotorA: () => Trecho): Trecho {
    const pronto = this.cache.get(chave);
    if (pronto) return { ...pronto };
    const doA = deMotorA();
    this.cache.set(chave, doA); // memoiza a degradação: a resposta não muda depois
    return { ...doA };
  }

  private async gerarEArmazenar(alvo: AlvoAquecimento, nivel: Nivel): Promise<void> {
    const chave = chaveDe(alvo.tipo, nivel, alvo.tipo === "desfecho" ? alvo.modo : "", alvo.historia, alvo.objetoId);
    if (this.cache.has(chave)) return;
    try {
      const prompt = montarPrompt({
        tipo: alvo.tipo,
        historia: alvo.historia,
        objetoId: alvo.objetoId,
        nivel,
        modoDesfecho: alvo.modo,
        grafo: this.grafo,
      });
      const gerado = await this.provedor.gerar(prompt, TRECHO_JSON_SCHEMA, { system: PROMPT_BASE });
      if (!gerado || typeof gerado.texto !== "string" || gerado.texto.trim() === "") return;
      const trecho: Trecho = { texto: gerado.texto, ehFinal: alvo.tipo === "desfecho" };
      if (alvo.tipo === "objeto" && alvo.objetoId) trecho.objetoId = alvo.objetoId;
      if (!this.cache.has(chave)) this.cache.set(chave, trecho);
    } catch {
      /* falha/recusa/guardrails → sem cache → o miss degrada p/ Motor A */
    }
  }
}
