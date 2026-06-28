// SeederLinux v3.0 — Organizações
// API client adaptado ao novo modelo: Organization é apenas metadados; a
// configuração técnica vive em `config` (mapa chave→valor das variáveis).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, variablesApi } from "@/lib/api/client";
import type { Organization } from "./types";

function apiToOrg(data: any): Organization {
  const config: Record<string, string> = data.config ?? {};
  return {
    id: data.id,
    nome: data.nome,
    sigla: data.sigla,
    descricao: data.descricao ?? "",
    ativo: data.ativo ?? true,
    status: (data.status ?? "active") as Organization["status"],
    cor: data.cor ?? "oklch(0.6 0.15 200)",
    serial: Number(data.serial ?? 0),
    estacoes: Number(data.estacoes ?? 0),
    scriptsAtivos: Number(data.scriptsAtivos ?? data.scripts_ativos ?? 0),
    config,
    variaveis: config,
    branding: data.branding ?? null,
    createdAt: data.created_at ?? data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? data.updatedAt ?? new Date().toISOString(),
  };
}

export const ORGS_QK = ["organizations"] as const;

export function useOrganizations() {
  return useQuery({
    queryKey: ORGS_QK,
    queryFn: async (): Promise<Organization[]> => {
      const orgs = await organizationsApi.list();
      return orgs.map((o: any) => apiToOrg(o));
    },
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: [...ORGS_QK, id],
    queryFn: async (): Promise<Organization> => {
      const data = await organizationsApi.get(id);
      return apiToOrg(data);
    },
    enabled: !!id,
  });
}

export interface UpsertOrgInput {
  id?: string;
  nome: string;
  sigla: string;
  descricao?: string;
  ativo?: boolean;
  cor?: string;
  /** Map de variáveis (chave→valor). */
  config?: Record<string, string>;
}

export function useUpsertOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (org: UpsertOrgInput) => {
      const payload: any = {
        nome: org.nome,
        sigla: org.sigla,
        descricao: org.descricao ?? "",
        ativo: org.ativo ?? true,
        cor: org.cor,
        config: org.config ?? undefined,
      };
      if (org.id) {
        return organizationsApi.update(org.id, payload);
      }
      return organizationsApi.create(payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ORGS_QK }),
  });
}

export function useSetOrgVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { orgId: string; key: string; value: string }) => {
      await variablesApi.setOne(p.orgId, p.key, p.value);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ORGS_QK });
      qc.invalidateQueries({ queryKey: [...ORGS_QK, vars.orgId] });
    },
  });
}

export function useBulkUpdateOrgVariables() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { orgId: string; variables: Record<string, string> }) => {
      return variablesApi.bulkUpdate(p.orgId, p.variables);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ORGS_QK });
      qc.invalidateQueries({ queryKey: [...ORGS_QK, vars.orgId] });
    },
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await organizationsApi.delete(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ORGS_QK }),
  });
}
