-- Audit log (append-only)
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  ator_id uuid NOT NULL,
  ator_email text NOT NULL DEFAULT '',
  categoria text NOT NULL,
  acao text NOT NULL,
  alvo text,
  detalhes text
);

CREATE INDEX idx_audit_events_ts ON public.audit_events (ts DESC);
CREATE INDEX idx_audit_events_categoria ON public.audit_events (categoria);
CREATE INDEX idx_audit_events_ator ON public.audit_events (ator_id);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Insert: usuário autenticado, mas só pode registrar como si mesmo
CREATE POLICY "Authenticated users can insert their own events"
  ON public.audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = ator_id);

-- Select: somente admin_gap ou auditor
CREATE POLICY "Admin GAP and auditor can read audit events"
  ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_gap')
    OR public.has_role(auth.uid(), 'auditor')
  );

-- Sem políticas de UPDATE/DELETE = tabela append-only.