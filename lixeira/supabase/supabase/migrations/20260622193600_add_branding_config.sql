-- Branding configuration table for per-organization customization
CREATE TABLE IF NOT EXISTS public.branding_config (
  org_id text PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  wallpaper_url text,
  logo_url text,
  conky_enabled boolean NOT NULL DEFAULT false,
  conky_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme text NOT NULL DEFAULT 'Mint-Y-Dark',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branding_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies using the existing pattern from organizations
CREATE POLICY "select_branding" ON public.branding_config FOR SELECT
  TO authenticated USING (
    public.has_role(auth.uid(), 'admin_gap')
    OR public.has_role(auth.uid(), 'auditor')
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      JOIN public.user_roles ur ON ur.org_sigla = o.sigla
      WHERE o.id = branding_config.org_id
        AND ur.user_id = auth.uid()
        AND ur.role = 'operador_om'
    )
  );

CREATE POLICY "insert_branding" ON public.branding_config FOR INSERT
  TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin_gap')
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      JOIN public.user_roles ur ON ur.org_sigla = o.sigla
      WHERE o.id = branding_config.org_id
        AND ur.user_id = auth.uid()
        AND ur.role = 'operador_om'
    )
  );

CREATE POLICY "update_branding" ON public.branding_config FOR UPDATE
  TO authenticated USING (
    public.has_role(auth.uid(), 'admin_gap')
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      JOIN public.user_roles ur ON ur.org_sigla = o.sigla
      WHERE o.id = branding_config.org_id
        AND ur.user_id = auth.uid()
        AND ur.role = 'operador_om'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_gap')
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      JOIN public.user_roles ur ON ur.org_sigla = o.sigla
      WHERE o.id = branding_config.org_id
        AND ur.user_id = auth.uid()
        AND ur.role = 'operador_om'
    )
  );

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_branding_config_org ON public.branding_config(org_id);