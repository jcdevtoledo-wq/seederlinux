// API para histórico de execuções (station_runs).
import { useQuery } from "@tanstack/react-query";
import { stationsApi } from "@/lib/api/client";

export interface ScriptLogEntry {
  id: string;
  nome: string;
  ordem: number;
  exit_code: number;
  duracao_ms: number;
  stdout_tail?: string;
  stderr_tail?: string;
}

export interface StationRun {
  id: string;
  stationId: string;
  profileId: string | null;
  serialAlvo: number;
  serialAnterior: number;
  status: "ok" | "erro";
  scriptsTotal: number;
  scriptsOk: number;
  duracaoMs: number;
  agentVersion: string | null;
  startedAt: string;
  finishedAt: string;
  log: ScriptLogEntry[];
}

function apiToRun(r: any): StationRun {
  return {
    id: r.id,
    stationId: r.stationId ?? r.station_id,
    profileId: r.profileId ?? r.profile_id,
    serialAlvo: Number(r.serialAlvo ?? r.serial_alvo ?? 0),
    serialAnterior: Number(r.serialAnterior ?? r.serial_anterior ?? 0),
    status: (r.status as "ok" | "erro") ?? "ok",
    scriptsTotal: r.scriptsTotal ?? r.scripts_total ?? 0,
    scriptsOk: r.scriptsOk ?? r.scripts_ok ?? 0,
    duracaoMs: r.duracaoMs ?? r.duracao_ms ?? 0,
    agentVersion: r.agentVersion ?? r.agent_version,
    startedAt: r.startedAt ?? r.started_at,
    finishedAt: r.finishedAt ?? r.finished_at,
    log: Array.isArray(r.log) ? r.log : [],
  };
}

export function useStationRuns(stationId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ["station_runs", stationId, limit],
    enabled: !!stationId,
    queryFn: async (): Promise<StationRun[]> => {
      const data = await stationsApi.runs(stationId!);
      return (Array.isArray(data) ? data : []).map((r: any) => apiToRun(r));
    },
  });
}
