-- =========================================================
-- Organizations + OM variables
-- =========================================================

create table if not exists public.organizations (
  id text primary key,                          -- slug ex: "comara"
  nome text not null,
  sigla text not null unique,
  dominio text not null default '',
  dc_hostname text not null default '',
  dc_ip text not null default '',
  metodo_ad text not null default 'auto' check (metodo_ad in ('sssd','winbind','auto')),
  distros_suportadas text[] not null default '{}',
  ambientes_suportados text[] not null default '{}',
  serial bigint not null default 0,
  cor text not null default 'oklch(0.6 0.15 200)',
  estacoes integer not null default 0,
  scripts_ativos integer not null default 0,
  criado_em date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

create trigger trg_organizations_updated
before update on public.organizations
for each row execute function public.touch_updated_at();

-- Variáveis da OM: linha por (org_id, key)
create table if not exists public.org_variables (
  org_id text not null references public.organizations(id) on delete cascade,
  key text not null,
  value text not null default '',
  updated_at timestamptz not null default now(),
  primary key (org_id, key)
);

alter table public.org_variables enable row level security;

create trigger trg_org_variables_updated
before update on public.org_variables
for each row execute function public.touch_updated_at();

-- Helper: usuário tem acesso à OM? (admin_gap e auditor: todas; operador_om: só a sua)
create or replace function public.can_access_org(_user_id uuid, _sigla text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_role(_user_id, 'admin_gap')
    or public.has_role(_user_id, 'auditor')
    or exists (
      select 1 from public.user_roles
      where user_id = _user_id
        and role = 'operador_om'
        and org_sigla = _sigla
    )
$$;

-- ---------- RLS: organizations ----------
create policy "Auth users can read organizations they access"
  on public.organizations for select
  to authenticated
  using (public.can_access_org(auth.uid(), sigla));

create policy "Admin GAP can insert organizations"
  on public.organizations for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin_gap'));

create policy "Admin GAP or org operator can update"
  on public.organizations for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin_gap')
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'operador_om'
        and org_sigla = organizations.sigla
    )
  )
  with check (
    public.has_role(auth.uid(), 'admin_gap')
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'operador_om'
        and org_sigla = organizations.sigla
    )
  );

create policy "Admin GAP can delete organizations"
  on public.organizations for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin_gap'));

-- ---------- RLS: org_variables ----------
create policy "Auth users read variables of accessible orgs"
  on public.org_variables for select
  to authenticated
  using (
    exists (
      select 1 from public.organizations o
      where o.id = org_variables.org_id
        and public.can_access_org(auth.uid(), o.sigla)
    )
  );

create policy "Admin or org operator can insert variables"
  on public.org_variables for insert
  to authenticated
  with check (
    exists (
      select 1 from public.organizations o
      where o.id = org_variables.org_id
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

create policy "Admin or org operator can update variables"
  on public.org_variables for update
  to authenticated
  using (
    exists (
      select 1 from public.organizations o
      where o.id = org_variables.org_id
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

create policy "Admin or org operator can delete variables"
  on public.org_variables for delete
  to authenticated
  using (
    exists (
      select 1 from public.organizations o
      where o.id = org_variables.org_id
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

-- ---------- Seed inicial das 3 OMs (idempotente) ----------
insert into public.organizations
  (id, nome, sigla, dominio, dc_hostname, dc_ip, metodo_ad, distros_suportadas, ambientes_suportados, serial, cor, estacoes, scripts_ativos, criado_em)
values
  ('comara','Comissão de Aeroportos da Amazônia','COMARA','comara.intraer','dc-comara','10.108.64.51','sssd',
    array['linuxmint','ubuntu','debian'], array['Cinnamon','MATE','XFCE'], 2025033101,'oklch(0.62 0.16 155)',184,12,'2024-01-12'),
  ('gapbe','Grupamento de Apoio de Belém','GAPBE','gapbe.intraer','dc01-gapbe','10.108.10.5','auto',
    array['ubuntu','linuxmint'], array['Cinnamon','GNOME'], 2025021500,'oklch(0.55 0.12 200)',312,9,'2024-03-04'),
  ('dcta','Departamento de Ciência e Tecnologia Aeroespacial','DCTA','dcta.intraer','ad-dcta','10.20.0.10','winbind',
    array['rocky','almalinux','ubuntu'], array['GNOME','KDE'], 2024112000,'oklch(0.6 0.18 30)',96,7,'2024-08-21')
on conflict (id) do nothing;

-- Seed das variáveis principais
insert into public.org_variables (org_id, key, value) values
  ('comara','DOMINIO','comara.intraer'),
  ('comara','DOMINIO_NETBIOS','COMARA'),
  ('comara','DC_HOSTNAME','dc-comara'),
  ('comara','DC_IP','10.108.64.51'),
  ('comara','METODO_AD','sssd'),
  ('comara','DNS_PRIMARIO','10.108.64.27'),
  ('comara','DNS_SECUNDARIO','10.108.64.28'),
  ('comara','PROXY_HTTP','10.108.88.4'),
  ('comara','PROXY_PORTA','8080'),
  ('comara','NTP','ntp.comara.intraer'),
  ('comara','SERVIDOR_ARQUIVOS','fs.comara.intraer'),
  ('comara','SERVIDOR_OCS','http://ocs.comara.intraer/ocsinventory'),
  ('comara','TAG_OCS','GAPBE-COMARA'),
  ('comara','SERVIDOR_VNC','vnc.comara.intraer'),
  ('comara','SIGLA','COMARA'),
  ('comara','HOMEPAGE','http://www.comara.intraer/'),
  ('comara','TEMA_GTK','Mint-Y-Dark'),
  ('gapbe','DOMINIO','gapbe.intraer'),
  ('gapbe','DOMINIO_NETBIOS','GAPBE'),
  ('gapbe','DC_HOSTNAME','dc01-gapbe'),
  ('gapbe','DC_IP','10.108.10.5'),
  ('gapbe','METODO_AD','auto'),
  ('gapbe','DNS_PRIMARIO','10.108.10.5'),
  ('gapbe','PROXY_HTTP','proxy.gapbe.intraer'),
  ('gapbe','PROXY_PORTA','3128'),
  ('gapbe','SERVIDOR_OCS','http://ocs.gapbe.intraer/ocsinventory'),
  ('gapbe','TAG_OCS','GAPBE'),
  ('gapbe','SIGLA','GAPBE'),
  ('gapbe','HOMEPAGE','http://intranet.gapbe.intraer/'),
  ('dcta','DOMINIO','dcta.intraer'),
  ('dcta','DOMINIO_NETBIOS','DCTA'),
  ('dcta','DC_HOSTNAME','ad-dcta'),
  ('dcta','DC_IP','10.20.0.10'),
  ('dcta','METODO_AD','winbind'),
  ('dcta','DNS_PRIMARIO','10.20.0.10'),
  ('dcta','SIGLA','DCTA'),
  ('dcta','HOMEPAGE','http://portal.dcta.intraer/')
on conflict (org_id, key) do nothing;
