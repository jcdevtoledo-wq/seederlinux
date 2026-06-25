-- Habilitar pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Função que marca estações ok como atrasadas se passou de 1h sem check-in
CREATE OR REPLACE FUNCTION public.mark_stale_stations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.stations
  SET status = 'atrasada'
  WHERE status = 'ok'
    AND ultimo_checkin IS NOT NULL
    AND ultimo_checkin < (now() - interval '1 hour');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Remover job antigo, se existir
SELECT cron.unschedule('mark-stale-stations')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mark-stale-stations');

-- Agendar a cada 5 minutos
SELECT cron.schedule(
  'mark-stale-stations',
  '*/5 * * * *',
  $$ SELECT public.mark_stale_stations(); $$
);