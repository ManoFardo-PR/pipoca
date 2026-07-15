/**
 * [repositorioTenant.ts] — repositório de tenants com o ESCOPO da sessão preso na
 *   instância (toda leitura/escrita filtra por escopo) + o vínculo conta→tenants.
 *
 * PAPEL: admin (SA_TENANT — persistência de tenants; MVP local)
 * POR QUE EXISTE: isolar tenants entre si (um operador restrito nunca vê/altera
 *   fora do seu escopo) e concentrar criação/leitura de tenants num seam trocável
 *   pelo backend.
 * ENTRA: escopo da sessão, Tenant/TenantId, email; localStorage (chaves
 *   "pipoca.admin.tenants.v1" e "…contas.v1").
 * SAI: RepositorioTenant (listar/obter/salvar/planos/limites), novoTenant, contas,
 *   substituirTenantsLocais; ERRO_FORA_DE_ESCOPO.
 * CHAMA: ../auth/tiposAdmin, ../auth/sessaoSuperAdmin:escopoAutoriza, ./tiposTenant
 *   (planos, limites, validação de envelope).
 * É CHAMADO POR: bridge_admin.ts (PipocaAdminCanonico.tenants), estadoAdmin.js
 *   (criarRepositorioTenant via canônico), ../../backend/espelho_admin.ts (envolve
 *   com espelho remoto), backend.test.ts, admin.test.ts.
 * RODA POR: boot do admin — bundled em pipoca.admin.bundle.js via `bun run build:admin`.
 * CUIDADO: isolamento fail-closed — fora do escopo: obter → null (não revela
 *   existência), salvar → erro NEUTRO sem gravar; criar tenant novo exige escopo
 *   "todos". Tenant novo nasce no Freemium (60d de Família); vencido degrada aos
 *   limites do Grátis SEM apagar dados. substituirTenantsLocais é pull do servidor
 *   (servidor vence).
 *
 * — detalhe preservado —
 * Pipoca — Repositório de tenants (SA_TENANT) · doc fase04-04-03
 * ---------------------------------------------------------------
 * Seam `RepositorioTenant` com o ESCOPO da sessão preso na instância: TODA
 * leitura/escrita filtra por ele (isolamento entre tenants). Fora do escopo:
 * obter → null; salvar → erro NEUTRO sem gravar. Criar tenant exige escopo
 * "todos" (operador raiz). Implementação local (MVP): envelopes
 * `esquema: "pipoca.tenant.v1"` em storage versionado; backend real é fase06-04.
 */

import type { StorageLike, TenantId } from "../auth/tiposAdmin.js";
import { escopoAutoriza } from "../auth/sessaoSuperAdmin.js";
import {
  type Conta,
  type LimitesPlano,
  type Plano,
  type Tenant,
  PLANOS_PADRAO,
  PLANO_MAIS_RESTRITIVO,
  PLANO_INICIAL,
  ESQUEMA_TENANT,
  limitesDoPlano,
  limitesVigentes,
  tenantValido,
  validarEnvelopeTenant,
} from "./tiposTenant.js";

// A validação do envelope vive no módulo PURO (tiposTenant) — o app da
// família a consome sem arrastar este repositório; reexportada por compat.
export { validarEnvelopeTenant };

/** Seam consumido pelas telas (ipsis litteris doc 04-03). */
export interface RepositorioTenant {
  listarTenants(escopo: TenantId[] | "todos"): Promise<Tenant[]>;
  obterTenant(id: TenantId): Promise<Tenant | null>;
  salvarTenant(t: Tenant): Promise<void>;
  listarPlanos(): Promise<Plano[]>;
  /** Limites vigentes AGORA (Freemium vencido degrada). `agora` injetável nos testes. */
  obterLimitesEfetivos(id: TenantId, agora?: number): Promise<LimitesPlano>;
}

/** Mensagem neutra (regra 2 do doc: erro fora do escopo não revela nada). */
export const ERRO_FORA_DE_ESCOPO = "Não foi possível concluir a ação.";

const CHAVE_TENANTS = "pipoca.admin.tenants.v1";
const CHAVE_CONTAS = "pipoca.admin.contas.v1";

interface EnvelopeTenant {
  esquema: typeof ESQUEMA_TENANT;
  tenant: Tenant;
}

function storagePadrao(): StorageLike | null {
  try {
    const g = globalThis as unknown as { localStorage?: StorageLike };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Id opaco e determinístico (FNV-1a de nome+instante). */
function idDoTenant(nome: string, agora: number): string {
  const s = String(nome).trim().toLowerCase() + ":" + String(agora);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "ten_" + (h >>> 0).toString(16);
}

/**
 * Núcleo puro de criação: nasce no FREEMIUM (60 dias com os limites do
 * Família; expirado degrada aos do Grátis) e ativo. A postura segura da
 * regra 7 continua no tempo: o prazo é a trava, não a IA de partida.
 */
export function novoTenant(nome: string, agora: number): Tenant {
  return {
    id: idDoTenant(nome, agora),
    nome: String(nome).trim(),
    planoId: PLANO_INICIAL,
    ativo: true,
    criadoEm: agora,
  };
}

/**
 * Substituição INTEGRAL da chave local (pull do servidor — servidor vence).
 * Inválidos são filtrados; nunca lança.
 */
export function substituirTenantsLocais(tenants: Tenant[], armazem?: StorageLike): void {
  const st = armazem ?? storagePadrao();
  if (!st) return;
  gravarTenants(st, (Array.isArray(tenants) ? tenants : []).filter(tenantValido));
}

/** Parsing defensivo: envelopes fora do esquema/da forma são descartados em silêncio. */
function lerTenants(st: StorageLike): Tenant[] {
  try {
    const raw = st.getItem(CHAVE_TENANTS);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    const out: Tenant[] = [];
    for (const e of arr) {
      const env = e as Partial<EnvelopeTenant>;
      if (env && env.esquema === ESQUEMA_TENANT && tenantValido(env.tenant)) out.push(env.tenant);
    }
    return out;
  } catch {
    return [];
  }
}

function gravarTenants(st: StorageLike, tenants: Tenant[]): void {
  try {
    const envelopes: EnvelopeTenant[] = tenants.map((t) => ({ esquema: ESQUEMA_TENANT, tenant: t }));
    st.setItem(CHAVE_TENANTS, JSON.stringify(envelopes));
  } catch {
    /* degradação silenciosa */
  }
}

/**
 * Fábrica do seam: o escopo fica preso na instância (vem da SessaoSuperAdmin).
 * `listarTenants` recebe o escopo de novo por contrato do doc, mas a instância
 * NUNCA devolve além do próprio escopo (interseção — fail-closed).
 */
export function criarRepositorioTenant(
  escopoDaSessao: TenantId[] | "todos",
  armazem?: StorageLike
): RepositorioTenant {
  const st = armazem ?? storagePadrao();

  function autorizado(id: TenantId): boolean {
    return escopoAutoriza(escopoDaSessao, id);
  }

  return {
    async listarTenants(escopo: TenantId[] | "todos"): Promise<Tenant[]> {
      if (!st) return [];
      return lerTenants(st).filter((t) => autorizado(t.id) && escopoAutoriza(escopo, t.id));
    },
    async obterTenant(id: TenantId): Promise<Tenant | null> {
      if (!st || !autorizado(id)) return null; // fora do escopo → null (não revela existência)
      return lerTenants(st).find((t) => t.id === id) ?? null;
    },
    async salvarTenant(t: Tenant): Promise<void> {
      if (!st || !tenantValido(t)) throw new Error(ERRO_FORA_DE_ESCOPO);
      const atuais = lerTenants(st);
      const existe = atuais.some((x) => x.id === t.id);
      // Criar tenant novo é ato de plataforma inteira (operador raiz).
      if (!existe && escopoDaSessao !== "todos") throw new Error(ERRO_FORA_DE_ESCOPO);
      if (existe && !autorizado(t.id)) throw new Error(ERRO_FORA_DE_ESCOPO);
      const semEste = atuais.filter((x) => x.id !== t.id);
      gravarTenants(st, [...semEste, { ...t }]);
    },
    async listarPlanos(): Promise<Plano[]> {
      return PLANOS_PADRAO.map((p) => ({ ...p, limites: { ...p.limites } }));
    },
    async obterLimitesEfetivos(id: TenantId, agora?: number): Promise<LimitesPlano> {
      // Fail-closed: fora do escopo/desconhecido → limites do plano mais restritivo.
      if (!st || !autorizado(id)) return limitesDoPlano(PLANO_MAIS_RESTRITIVO);
      const t = lerTenants(st).find((x) => x.id === id);
      if (!t) return limitesDoPlano(PLANO_MAIS_RESTRITIVO);
      // Vigência: Freemium vencido (60d do criadoEm) degrada aos limites do Grátis.
      return limitesVigentes(t, typeof agora === "number" ? agora : Date.now());
    },
  };
}

// ─── Contas (metadados de vínculo conta→tenants; sem PII de criança) ─────────

function lerContas(st: StorageLike): Conta[] {
  try {
    const raw = st.getItem(CHAVE_CONTAS);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (c): c is Conta =>
        !!c && typeof c === "object" &&
        typeof (c as Conta).id === "string" &&
        typeof (c as Conta).email === "string" &&
        Array.isArray((c as Conta).tenants)
    );
  } catch {
    return [];
  }
}

export function listarContas(armazem?: StorageLike): Conta[] {
  const st = armazem ?? storagePadrao();
  return st ? lerContas(st) : [];
}

/** Vincula (ou cria) a conta ao tenant — agrega tenants na mesma conta por e-mail. */
export function vincularConta(email: string, tenantId: TenantId, armazem?: StorageLike): Conta {
  const st = armazem ?? storagePadrao();
  const e = String(email).trim().toLowerCase();
  const contas = st ? lerContas(st) : [];
  let conta = contas.find((c) => c.email === e);
  if (!conta) {
    conta = { id: "cta_" + e.replace(/[^a-z0-9]/g, "").slice(0, 24), email: e, tenants: [] };
    contas.push(conta);
  }
  if (conta.tenants.indexOf(tenantId) < 0) conta.tenants.push(tenantId);
  if (st) {
    try {
      st.setItem(CHAVE_CONTAS, JSON.stringify(contas));
    } catch {
      /* silencioso */
    }
  }
  return { ...conta, tenants: conta.tenants.slice() };
}
