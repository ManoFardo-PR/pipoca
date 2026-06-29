import type { MotorNarrativa, ModoDesfecho, Nivel } from "./contrato.js";

export function jogar(
  motor: MotorNarrativa,
  objetos: string[],
  modo: ModoDesfecho,
  nivel: Nivel
): string {
  const historia: string[] = [];
  const linhas: string[] = [motor.abertura(nivel).texto];

  for (const id of objetos) {
    const t = motor.aoAdicionarObjeto(historia, id, nivel);
    historia.push(id);
    linhas.push(t.texto);
  }

  linhas.push(motor.desfecho(historia, modo, nivel).texto);
  return linhas.map((l) => "— " + l).join("\n");
}
