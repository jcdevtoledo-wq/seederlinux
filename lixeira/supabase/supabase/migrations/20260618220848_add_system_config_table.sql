-- system_config: tabela de controle global do SeederLinux (setup, features, etc.)
CREATE TABLE IF NOT EXISTS public.system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed inicial
INSERT INTO public.system_config (key, value)
VALUES ('setup_completed', 'false')
ON CONFLICT (key) DO NOTHING;

-- RLS: apenas service_role pode escrever; autenticados podem ler
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_system_config" ON public.system_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_system_config" ON public.system_config
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "update_system_config" ON public.system_config
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "delete_system_config" ON public.system_config
  FOR DELETE TO service_role USING (true);
