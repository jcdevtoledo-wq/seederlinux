// Trilha de auditoria — append-only via API.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auditApi } from "@/lib/api/client";

export type AuditCategory =
  | "bundle"
  | "script"
  | "organizacao"
  | "variavel"
  | "perfil"
  | "hub"
  | "config"
  | "estacao"
  | "auth"
  | "users"
  | "setup";

export interface AuditEvent {
  id: string;
  ts: string;
  ator: string;
  categoria: AuditCategory;
  acao: string;
  alvo?: string;
  detalhes?: string;
}

function apiToEvent(r: any): AuditEvent {
  return {
    id: r.id,
    ts: r.ts,
    ator: r.atorEmail ?? r.ator_email ?? r.atorId ?? r.ator_id,
    categoria: r.categoria as AuditCategory,
    acao: r.acao,
    alvo: r.alvo ?? undefined,
    detalhes: r.detalhes ?? undefined,
  };
}

export const AUDIT_QK = ["audit_events"] as const;

/** Lista os últimos eventos. Apenas admin_gap/auditor. */
export function useAuditLog(limit = 500) {
  return useQuery({
    queryKey: [...AUDIT_QK, limit],
    queryFn: async (): Promise<AuditEvent[]> => {
      const result = await auditApi.list({ limit });
      return (result.events ?? []).map((r: any) => apiToEvent(r));
    },
  });
}

/** Hook conveniente para componentes que registram eventos. */
export function useLogEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: {
      categoria: AuditCategory;
      acao: string;
      alvo?: string;
      detalhes?: string;
    }) => {
      // Audit is now handled server-side via API calls
      // This hook just invalidates the cache
      console.log('[audit]', e.categoria, e.acao, e.alvo, e.detalhes);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AUDIT_QK }),
  });
}

/** Log event helper - wraps the hook for direct use */
export async function logEvent(e: {
  categoria: AuditCategory;
  acao: string;
  alvo?: string;
  detalhes?: string;
}) {
  console.log('[audit]', e.categoria, e.acao, e.alvo, e.detalhes);
}
