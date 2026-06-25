// Cloud-backed CRUD para inventário de estações.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stationsApi } from "@/lib/api/client";
import type { Distro, DesktopEnv } from "./types";

export type StationStatus = "ok" | "atrasada" | "erro" | "nunca";

export interface Station {
  id: string;
  hostname: string;
  orgId: string;
  ip: string;
  distro: Distro;
  desktop: DesktopEnv;
  serialAplicado: number;
  ultimoCheckin: string;
  status: StationStatus;
  perfilAtivo?: string;
  usuario?: string;
  organization?: { sigla: string; nome: string };
}

function apiToStation(r: any): Station {
  return {
    id: r.id,
    hostname: r.hostname,
    orgId: r.orgId ?? r.org_id,
    ip: r.ip,
    distro: r.distro as Distro,
    desktop: r.desktop as DesktopEnv,
    serialAplicado: Number(r.serialAplicado ?? r.serial_aplicado ?? 0),
    ultimoCheckin: r.ultimoCheckin ?? r.ultimo_checkin ?? "",
    status: (r.status as StationStatus) ?? "nunca",
    perfilAtivo: r.perfilAtivo ?? r.perfil_ativo ?? undefined,
    usuario: r.usuario ?? undefined,
    organization: r.organization,
  };
}

export const STATIONS_QK = ["stations"] as const;

export function useStations(orgId?: string) {
  return useQuery({
    queryKey: orgId ? [...STATIONS_QK, orgId] : STATIONS_QK,
    queryFn: async (): Promise<Station[]> => {
      const data = await stationsApi.list(orgId);
      return data.map((r: any) => apiToStation(r));
    },
  });
}

export function useStation(id: string) {
  return useQuery({
    queryKey: [...STATIONS_QK, id],
    queryFn: async (): Promise<Station> => {
      const data = await stationsApi.get(id);
      return apiToStation(data);
    },
    enabled: !!id,
  });
}

export function useUpsertStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Station) => {
      const data: any = {
        hostname: s.hostname,
        orgId: s.orgId,
        ip: s.ip,
        distro: s.distro,
        desktop: s.desktop,
        perfilAtivo: s.perfilAtivo ?? null,
        usuario: s.usuario ?? null,
      };

      if (s.id) {
        await stationsApi.update(s.id, data);
      } else {
        await stationsApi.create(data);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: STATIONS_QK }),
  });
}

export function useDeleteStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await stationsApi.delete(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: STATIONS_QK }),
  });
}

/** Registra check-in de uma estação (atualiza serial, timestamp e status). */
export function useStationCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; serialAplicado: number; status?: StationStatus }) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/stations/${input.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialAplicado: input.serialAplicado,
          status: input.status ?? 'ok',
        }),
      });
      if (!res.ok) throw new Error('Checkin failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: STATIONS_QK }),
  });
}
