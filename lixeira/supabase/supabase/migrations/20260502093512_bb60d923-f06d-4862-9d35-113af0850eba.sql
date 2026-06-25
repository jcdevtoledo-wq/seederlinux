CREATE TABLE public.stations (
  id text PRIMARY KEY,
  hostname text NOT NULL,
  org_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ip text NOT NULL DEFAULT '',
  distro text NOT NULL DEFAULT 'ubuntu',
  desktop text NOT NULL DEFAULT 'GNOME',
  serial_aplicado bigint NOT NULL DEFAULT 0,
  ultimo_checkin timestamptz,
  status text NOT NULL DEFAULT 'nunca',
  perfil_ativo text,
  usuario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stations_org ON public.stations (org_id);
CREATE INDEX idx_stations_status ON public.stations (status);

CREATE TRIGGER trg_stations_touch
  BEFORE UPDATE ON public.stations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read stations of accessible orgs"
  ON public.stations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = stations.org_id AND public.can_access_org(auth.uid(), o.sigla)
    )
  );

CREATE POLICY "Admin or org operator can insert stations"
  ON public.stations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = stations.org_id
        AND (
          public.has_role(auth.uid(), 'admin_gap')
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role = 'operador_om'
              AND ur.org_sigla = o.sigla
          )
        )
    )
  );

CREATE POLICY "Admin or org operator can update stations"
  ON public.stations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = stations.org_id
        AND (
          public.has_role(auth.uid(), 'admin_gap')
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role = 'operador_om'
              AND ur.org_sigla = o.sigla
          )
        )
    )
  );

CREATE POLICY "Admin GAP can delete stations"
  ON public.stations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_gap'));