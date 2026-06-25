-- Tokens de check-in por estação (armazenados como hash sha256)
create table public.station_tokens (
  id uuid primary key default gen_random_uuid(),
  station_id text not null references public.stations(id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'agente',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index idx_station_tokens_station on public.station_tokens(station_id);

alter table public.station_tokens enable row level security;

-- Visibilidade: admin_gap ou operador da OM da estação
create policy "Admin or org operator can read station tokens"
  on public.station_tokens for select
  to authenticated
  using (
    exists (
      select 1 from public.stations s
      join public.organizations o on o.id = s.org_id
      where s.id = station_tokens.station_id
        and (
          public.has_role(auth.uid(), 'admin_gap')
          or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role = 'operador_om'
              and ur.org_sigla = o.sigla
          )
        )
    )
  );

create policy "Admin or org operator can insert station tokens"
  on public.station_tokens for insert
  to authenticated
  with check (
    exists (
      select 1 from public.stations s
      join public.organizations o on o.id = s.org_id
      where s.id = station_tokens.station_id
        and (
          public.has_role(auth.uid(), 'admin_gap')
          or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role = 'operador_om'
              and ur.org_sigla = o.sigla
          )
        )
    )
  );

create policy "Admin or org operator can update station tokens"
  on public.station_tokens for update
  to authenticated
  using (
    exists (
      select 1 from public.stations s
      join public.organizations o on o.id = s.org_id
      where s.id = station_tokens.station_id
        and (
          public.has_role(auth.uid(), 'admin_gap')
          or exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid()
              and ur.role = 'operador_om'
              and ur.org_sigla = o.sigla
          )
        )
    )
  );

create policy "Admin GAP can delete station tokens"
  on public.station_tokens for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin_gap'));

-- Habilitar Realtime para inventário ao vivo
alter table public.stations replica identity full;
alter publication supabase_realtime add table public.stations;