CREATE TABLE public.station_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL,
  profile_id text,
  serial_alvo bigint NOT NULL DEFAULT 0,
  serial_anterior bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  scripts_total integer NOT NULL DEFAULT 0,
  scripts_ok integer NOT NULL DEFAULT 0,
  duracao_ms integer NOT NULL DEFAULT 0,
  agent_version text,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_station_runs_station ON public.station_runs (station_id, finished_at DESC);

ALTER TABLE public.station_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or org operator can read station runs"
ON public.station_runs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stations s
    JOIN public.organizations o ON o.id = s.org_id
    WHERE s.id = station_runs.station_id
      AND (
        public.has_role(auth.uid(), 'admin_gap')
        OR public.has_role(auth.uid(), 'auditor')
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'operador_om'
            AND ur.org_sigla = o.sigla
        )
      )
  )
);