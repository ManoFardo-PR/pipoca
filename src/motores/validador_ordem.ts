import type { Cenario } from "../core/grafo/tipos.js";

export interface ResultadoValidacao {
  ok: boolean;
  dica?: string;
}

export interface ValidadorOrdem {
  ordemCanonica(): string[];
  validar(ordemJogador: string[]): ResultadoValidacao;
}

const RE_TEM = /^tem:(\w+)$/;

function topoSort(cenario: Cenario): string[] {
  const ids = cenario.objetos.map((o) => o.id);
  const deps = new Map<string, Set<string>>();
  for (const id of ids) deps.set(id, new Set());

  for (const obj of cenario.objetos) {
    for (const regra of obj.regras) {
      const m = RE_TEM.exec(regra.se);
      if (m) {
        const dependeDe = m[1];
        if (deps.has(dependeDe)) {
          deps.get(obj.id)!.add(dependeDe);
        }
      }
    }
  }

  const resultado: string[] = [];
  const visitado = new Set<string>();
  const emPilha = new Set<string>();

  function visitar(id: string): void {
    if (visitado.has(id)) return;
    if (emPilha.has(id)) {
      throw new Error(`validador_ordem: ciclo de dependência detectado em "${id}"`);
    }
    emPilha.add(id);
    for (const dep of deps.get(id) ?? []) {
      visitar(dep);
    }
    emPilha.delete(id);
    visitado.add(id);
    resultado.push(id);
  }

  for (const id of ids) visitar(id);

  return resultado;
}

export function criarValidadorOrdem(cenario: Cenario): ValidadorOrdem {
  const _ordemCanonica: string[] = cenario.ordem_canonica
    ? [...cenario.ordem_canonica]
    : topoSort(cenario);

  const deps = new Map<string, Set<string>>();
  for (const obj of cenario.objetos) {
    const d = new Set<string>();
    for (const regra of obj.regras) {
      const m = RE_TEM.exec(regra.se);
      if (m) {
        const depId = m[1];
        if (cenario.objetos.some((o) => o.id === depId)) {
          d.add(depId);
        }
      }
    }
    deps.set(obj.id, d);
  }

  return {
    ordemCanonica(): string[] {
      return [..._ordemCanonica];
    },

    validar(ordemJogador: string[]): ResultadoValidacao {
      if (ordemJogador.length === 0) {
        return {
          ok: false,
          dica: "Quase! Arraste os quadros para montar a história.",
        };
      }

      const colocados = new Set<string>();
      for (const id of ordemJogador) {
        const necessarios = deps.get(id);
        if (necessarios) {
          for (const dep of necessarios) {
            if (!colocados.has(dep)) {
              const objDep = cenario.objetos.find((o) => o.id === dep);
              const nomeDep = objDep ? objDep.nome : dep;
              return {
                ok: false,
                dica: `Quase! O "${nomeDep}" precisa aparecer antes. Tente reorganizar os quadros.`,
              };
            }
          }
        }
        colocados.add(id);
      }

      const totalEsperado = _ordemCanonica.length;
      if (ordemJogador.length < totalEsperado) {
        return {
          ok: false,
          dica: "Quase! Ainda faltam alguns quadros. Você consegue!",
        };
      }

      return { ok: true };
    },
  };
}
