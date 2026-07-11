/**
 * Pipoca — O realizador (realizar.ts)
 * -----------------------------------
 * `realizar(pacote, opcoes) → { texto, paragrafos, veredito }` (fase12-12-00,
 * + `origem` e `metadados` — a origem do texto é SEMPRE sinalizada, 12-04).
 * Só o Pacote entra: a montagem de prompt é 100% derivada dele (12-01); o
 * provedor é injetável (12-02); a validação é determinística (12-03); a
 * política de falha é a cascata com fallback A+ v3 (12-04).
 * Em produção, provedor/modelo são decididos no SERVIDOR (precedente
 * `functions/proxy-ia/index.ts:266-270`); `opcoes` plena é para
 * teste/calibração. Fiação no app e deploy edge são fase 13.
 */

import { ESQUEMA_PACOTE_COMPOSICAO_V1, type PacoteComposicao } from "../compositor/pacote.js";
import { montarPromptRealizador } from "./prompt_template.js";
import { realizarComCascata, type OpcoesRealizar, type ResultadoRealizar } from "./cascata.js";

export async function realizar(
  pacote: PacoteComposicao,
  opcoes: OpcoesRealizar = {}
): Promise<ResultadoRealizar> {
  // Consumidores rejeitam esquema desconhecido com erro explícito (fase11-11-00).
  if (!pacote || pacote.esquema !== ESQUEMA_PACOTE_COMPOSICAO_V1) {
    throw new Error(
      `realizador: Pacote com esquema desconhecido — esperado "${ESQUEMA_PACOTE_COMPOSICAO_V1}"`
    );
  }
  const provedores = opcoes.provedores ?? [];
  if (provedores.length === 0 && !opcoes.estadoFallback) {
    throw new Error(
      "realizador: nenhum provedor configurado e sem estadoFallback — em produção o servidor decide o provedor (fase 13)"
    );
  }
  const prompt = montarPromptRealizador(pacote);
  return realizarComCascata(pacote, prompt, provedores, opcoes);
}
