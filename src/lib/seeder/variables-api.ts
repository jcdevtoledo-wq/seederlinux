// SeederLinux v3.0 — Variáveis (catálogo + variáveis por OM)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { variablesApi, organizationConfigApi } from "@/lib/api/client";
import type { VariableDefinition, VarType } from "./types";

function apiToDef(r: any): VariableDefinition {
  return {
    id: r.id,
    key: r.key,
    label: r.label,
    category: r.category,
    description: r.description,
    type: r.type as VarType,
    required: !!r.required,
    editable: r.editable ?? true,
    oficial: !!r.oficial,
    defaultValue: r.defaultValue ?? null,
    exemplo: r.exemplo ?? null,
    validation: r.validation ?? null,
    coreModule: r.coreModule ?? null,
    value: r.value ?? r.defaultValue ?? "",
  };
}

export const CATALOG_QK = ["variable_catalog"] as const;
export const ORG_VARS_QK = ["org_variables"] as const;

/** Catálogo global de definições (sem valor por OM). */
export function useVariableCatalog() {
  return useQuery({
    queryKey: CATALOG_QK,
    queryFn: async (): Promise<VariableDefinition[]> => {
      const data = await variablesApi.catalog();
      return data.map(apiToDef);
    },
  });
}

/**
 * Variáveis de uma OM — retorna o catálogo COMPLETO com o valor atual.
 * Esta é a fonte que as telas devem usar (refatoração v3.0).
 */
export function useVariables(orgId: string) {
  return useQuery({
    queryKey: [...ORG_VARS_QK, orgId],
    queryFn: async (): Promise<VariableDefinition[]> => {
      if (!orgId) return [];
      const data = await variablesApi.listForOrg(orgId);
      return data.map(apiToDef);
    },
    enabled: !!orgId,
  });
}

/** Lança ações de criação de variável customizada no catálogo. */
export function useAddVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: VariableDefinition) => {
      await variablesApi.addToCatalog({
        key: v.key,
        label: v.label,
        category: v.category,
        description: v.description,
        type: v.type,
        required: v.required,
        editable: v.editable,
        defaultValue: v.defaultValue ?? null,
        exemplo: v.exemplo ?? null,
        validation: v.validation ?? null,
        coreModule: v.coreModule ?? null,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATALOG_QK }),
  });
}

export function useDeleteVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      await variablesApi.deleteFromCatalog(key);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATALOG_QK }),
  });
}

/** Atualiza múltiplas variáveis da OM em uma chamada (incrementa o serial). */
export function useBulkUpdateVariables() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { orgId: string; variables: Record<string, string> }) => {
      return variablesApi.bulkUpdate(p.orgId, p.variables);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [...ORG_VARS_QK, vars.orgId] });
      qc.invalidateQueries({ queryKey: ["organizations", vars.orgId] });
      qc.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

/** Validação da OM contra catálogo de variáveis obrigatórias. */
export function useOrgValidation(orgId: string) {
  return useQuery({
    queryKey: ["org_validation", orgId],
    queryFn: async () => organizationConfigApi.validate(orgId),
    enabled: !!orgId,
  });
}

/** Solicita ao backend a geração do arquivo .conf da OM. */
export function useExportOrgConf() {
  return useMutation({
    mutationFn: async (orgId: string) => organizationConfigApi.exportConf(orgId),
  });
}
