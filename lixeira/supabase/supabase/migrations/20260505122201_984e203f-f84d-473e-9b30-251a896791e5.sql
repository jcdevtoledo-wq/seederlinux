ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS compatibilidade text[] NOT NULL DEFAULT ARRAY['ubuntu','linuxmint','debian']::text[];

CREATE INDEX IF NOT EXISTS idx_scripts_compatibilidade ON public.scripts USING GIN(compatibilidade);
CREATE INDEX IF NOT EXISTS idx_station_runs_station_finished ON public.station_runs(station_id, finished_at DESC);