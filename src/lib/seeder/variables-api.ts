// Cloud-backed CRUD para o catálogo global de variáveis.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { variablesApi } from "@/lib/api/client";
import type { VariableDef, VarType, VarScope } from "./types";

function apiToVar(r: any): VariableDef {
  return {
    key: r.key,
    label: r.label,
    descricao: r.descricao,
    tipo: r.tipo as VarType,
    escopo: r.escopo as VarScope,
    oficial: r.oficial,
    obrigatoria: r.obrigatoria,
    exemplo: r.exemplo ?? undefined,
    default: r.defaultValue ?? r.default_value ?? undefined,
  };
}

export const VARS_QK = ["variable_catalog"] as const;

export function useVariables() {
  return useQuery({
    queryKey: VARS_QK,
    queryFn: async (): Promise<VariableDef[]> => {
      const data = await variablesApi.catalog();
      return data.map((r: any) => apiToVar(r));
    },
  });
}

export function useAddVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: VariableDef) => {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/variables/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: v.key,
          label: v.label,
          descricao: v.descricao,
          tipo: v.tipo,
          escopo: v.escopo,
          oficial: false,
          obrigatoria: v.obrigatoria,
          exemplo: v.exemplo ?? null,
          default_value: v.default ?? null,
        }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: VARS_QK }),
  });
}

export function useDeleteVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      // Variable catalog delete not implemented yet
      console.log('Delete variable:', key);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: VARS_QK }),
  });
}
