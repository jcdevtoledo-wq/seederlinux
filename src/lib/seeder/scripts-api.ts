// Cloud-backed CRUD para scripts.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scriptsApi } from "@/lib/api/client";
import type { SeederScript, ScriptCategory, ScriptStatus, Distro } from "./types";

function apiToScript(r: any): SeederScript {
  return {
    id: r.id,
    nome: r.nome,
    categoria: r.categoria as ScriptCategory,
    descricao: r.descricao,
    finalidade: "",
    localExecucao: "root",
    momento: "Implantação",
    permissoes: "sudo",
    compatibilidade: ((r.compatibilidade ?? ["ubuntu", "linuxmint", "debian"]) as Distro[]),
    dependencias: [],
    impacto: "baixo",
    reinicializacao: false,
    autor: r.autor,
    variaveisUsadas: r.variaveisUsadas ?? r.variaveis_usadas ?? [],
    oficial: r.oficial,
    versao: r.versao,
    serial: 0,
    status: r.status as ScriptStatus,
    compartilhado: false,
    conteudo: r.conteudo,
    atualizadoEm: r.atualizadoEm ?? r.atualizado_em,
  };
}

export const SCRIPTS_QK = ["scripts"] as const;

export function useScripts() {
  return useQuery({
    queryKey: SCRIPTS_QK,
    queryFn: async (): Promise<SeederScript[]> => {
      const data = await scriptsApi.list();
      return data.map((r: any) => apiToScript(r));
    },
  });
}

export function useScript(id: string) {
  return useQuery({
    queryKey: [...SCRIPTS_QK, id],
    queryFn: async (): Promise<SeederScript> => {
      const data = await scriptsApi.get(id);
      return apiToScript(data);
    },
    enabled: !!id,
  });
}

export function useUpsertScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: SeederScript) => {
      const data: any = {
        nome: s.nome,
        descricao: s.descricao,
        categoria: s.categoria,
        versao: s.versao,
        status: s.status,
        conteudo: s.conteudo,
        variaveisUsadas: s.variaveisUsadas,
        compatibilidade: s.compatibilidade ?? [],
        autor: s.autor,
        oficial: s.oficial,
      };

      if (s.id) {
        await scriptsApi.update(s.id, data);
      } else {
        await scriptsApi.create(data);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SCRIPTS_QK }),
  });
}

export function useDeleteScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await scriptsApi.delete(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SCRIPTS_QK }),
  });
}
