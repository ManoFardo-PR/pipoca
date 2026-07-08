/**
 * Experimento B1.5 — adapta a mecânica real do motor A+
 * (tests/fumaca-presenca-v3.ts é o padrão de referência, NÃO tocado aqui)
 * para escolhas ALEATÓRIAS (via rng seedado), emitindo um snapshot de
 * `montar()` ao final de CADA rodada — não só a linha final — porque a
 * matriz de amostragem do experimento é rodada×nível, não só o resultado
 * da R4.
 */

import {
  iniciar,
  ordenarR1,
  abrirProximaRodada,
  inserir,
  podeInserir,
  montar,
  type CenarioV2,
  type NivelKey,
} from "../../src/core/composicao.js";
import { embaralhar, indiceAleatorio, type Rng } from "./rng.js";
import type { Desfecho } from "./tipos.js";

export interface EstadoSnapshot {
  rodada: number;
  objetosDaLinha: string[];
  nivel: NivelKey;
  modos: { desfecho: Desfecho };
  texto: string;
}

/** Roda a mecânica real uma vez com escolhas sorteadas; 1 snapshot por rodada. */
export function gerarPartida(cenario: CenarioV2, nivel: NivelKey, rng: Rng): EstadoSnapshot[] {
  const desfecho: Desfecho = rng() < 0.5 ? "convergente" : "aberto";
  let estado = iniciar(cenario, { desfecho });

  const rodada1 = cenario.rodadas.find((r) => r.n === 1);
  const revelaR1 = rodada1?.revela ?? [];
  const escolhe = rodada1?.escolhe ?? 3;
  const ordem = embaralhar(revelaR1, rng).slice(0, escolhe);
  estado = ordenarR1(estado, ordem);

  const snapshots: EstadoSnapshot[] = [
    { rodada: 1, objetosDaLinha: estado.linha.slice(), nivel, modos: { desfecho }, texto: montar(estado, nivel) },
  ];

  const totalRodadas = cenario.rodadas.length;
  for (let r = 2; r <= totalRodadas; r++) {
    estado = abrirProximaRodada(estado);
    if (estado.banco.length === 0) {
      throw new Error(`gerarPartida: banco vazio na rodada ${r} (invariante do grafo violada)`);
    }
    const objetoId = estado.banco[indiceAleatorio(estado.banco.length, rng)]!;
    const slot = 1 + indiceAleatorio(estado.linha.length - 1, rng);
    if (!podeInserir(estado, objetoId, slot)) {
      throw new Error(`gerarPartida: slot inválido sorteado na rodada ${r} (objeto=${objetoId}, slot=${slot})`);
    }
    estado = inserir(estado, objetoId, slot);
    snapshots.push({
      rodada: r,
      objetosDaLinha: estado.linha.slice(),
      nivel,
      modos: { desfecho },
      texto: montar(estado, nivel),
    });
  }

  if (estado.linha.length !== 6) {
    throw new Error(`gerarPartida: linha final com ${estado.linha.length} objetos (esperado 6)`);
  }
  return snapshots;
}

/**
 * Texto citado em docs/revisao-quintal-v3-A2.md:57-72 como "a tira real" —
 * exemplo-régua do registro correto (linha vagalume→frasco→lua→gato→vento→
 * folha, n3, convergente). Referência de comparação, não fonte de verdade:
 * o grafo pode ter evoluído desde a revisão.
 */
export const TEXTO_ESPERADO_TESTEMUNHA =
  "A última luz do dia some atrás do muro, e o quintal começa a sussurrar. A Joana sai sem fazer barulho, pra ver o que ele esconde de noite. A faísca entra no pote de vidro e fica piscando lá dentro — uma lanterninha viva que a Joana carrega. De repente, a Joana acha um pote de vidro e ergue contra o céu, vendo o quintal ficar todo torto lá dentro. Pouco depois, a noite tem duas luzes: a lua enorme lá no alto e a faísca pequenininha aqui embaixo, piscando uma pra outra, e a Joana bem no meio da conversa. Foi então que o gato encontra a luzinha piscando no escuro e fica espiando, a cabeça indo de um lado pro outro, enquanto a Joana espia os dois. E, sem aviso, o vento sobe, sacode os galhos lá no alto, e ela olha pra cima: alguma coisinha se solta e começa a descer rodando. A folha desce rodando bem na frente do gato, e ele acompanha cada volta com os olhos arregalados — a Joana prende o riso, quietinha. O quintal contou tudo o que sabia, e a Joana guarda cada pedacinho no peito, pra sonhar com eles a noite toda.";

/**
 * Reconstrói o estado-testemunha pela mecânica real (não cola o texto acima
 * — só usa ele como referência de comparação no chamador). Sequência fixa
 * verificada contra podeInserir/bancoDaRodada: R1 escolhe [vagalume,frasco,
 * folha] (deixa vento como sobra no banco); R2 insere o próprio vento (slot
 * 2); R3 insere gato (slot 2); R4 insere lua (slot 2) — resultando em
 * [vagalume,frasco,lua,gato,vento,folha].
 */
export function gerarTestemunha(cenario: CenarioV2): EstadoSnapshot {
  let estado = iniciar(cenario, { desfecho: "convergente" });
  estado = ordenarR1(estado, ["vagalume", "frasco", "folha"]);

  estado = abrirProximaRodada(estado); // rodada 2
  if (!podeInserir(estado, "vento", 2)) throw new Error("gerarTestemunha: falha ao inserir vento (R2)");
  estado = inserir(estado, "vento", 2);

  estado = abrirProximaRodada(estado); // rodada 3
  if (!podeInserir(estado, "gato", 2)) throw new Error("gerarTestemunha: falha ao inserir gato (R3)");
  estado = inserir(estado, "gato", 2);

  estado = abrirProximaRodada(estado); // rodada 4
  if (!podeInserir(estado, "lua", 2)) throw new Error("gerarTestemunha: falha ao inserir lua (R4)");
  estado = inserir(estado, "lua", 2);

  const esperada = "vagalume,frasco,lua,gato,vento,folha";
  if (estado.linha.join(",") !== esperada) {
    throw new Error(`gerarTestemunha: linha final "${estado.linha.join(",")}" difere da esperada "${esperada}"`);
  }

  return {
    rodada: 4,
    objetosDaLinha: estado.linha.slice(),
    nivel: "n3",
    modos: { desfecho: "convergente" },
    texto: montar(estado, "n3"),
  };
}
