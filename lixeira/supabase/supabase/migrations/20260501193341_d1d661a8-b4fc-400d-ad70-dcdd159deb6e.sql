-- ============ SCRIPTS ============
create table public.scripts (
  id text primary key,
  nome text not null,
  descricao text not null default '',
  categoria text not null,
  versao text not null default '1.0.0',
  status text not null default 'rascunho',
  conteudo text not null default '',
  variaveis_usadas text[] not null default '{}',
  autor text not null default '',
  oficial boolean not null default false,
  criado_em date not null default current_date,
  atualizado_em date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scripts enable row level security;

create policy "Auth users can read scripts"
  on public.scripts for select
  to authenticated
  using (true);

create policy "Admin GAP can insert scripts"
  on public.scripts for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin_gap'));

create policy "Admin GAP can update scripts"
  on public.scripts for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin_gap'))
  with check (public.has_role(auth.uid(), 'admin_gap'));

create policy "Admin GAP can delete scripts"
  on public.scripts for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin_gap'));

create trigger scripts_touch_updated
  before update on public.scripts
  for each row execute function public.touch_updated_at();

-- ============ PROFILES (templates) ============
create table public.profiles_seeder (
  id text primary key,
  nome text not null,
  descricao text not null default '',
  script_ids text[] not null default '{}',
  organizacao_origem text,
  publico boolean not null default false,
  criado_em date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles_seeder enable row level security;

create policy "Auth users can read profiles_seeder"
  on public.profiles_seeder for select
  to authenticated
  using (true);

create policy "Admin GAP can insert profiles_seeder"
  on public.profiles_seeder for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin_gap'));

create policy "Admin GAP can update profiles_seeder"
  on public.profiles_seeder for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin_gap'))
  with check (public.has_role(auth.uid(), 'admin_gap'));

create policy "Admin GAP can delete profiles_seeder"
  on public.profiles_seeder for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin_gap'));

create trigger profiles_seeder_touch_updated
  before update on public.profiles_seeder
  for each row execute function public.touch_updated_at();

-- ============ VARIABLE CATALOG ============
create table public.variable_catalog (
  key text primary key,
  label text not null,
  descricao text not null default '',
  tipo text not null default 'string',
  escopo text not null default 'custom',
  oficial boolean not null default false,
  obrigatoria boolean not null default false,
  exemplo text,
  default_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.variable_catalog enable row level security;

create policy "Auth users can read variable_catalog"
  on public.variable_catalog for select
  to authenticated
  using (true);

create policy "Admin GAP can insert variable_catalog"
  on public.variable_catalog for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin_gap'));

create policy "Admin GAP can update variable_catalog"
  on public.variable_catalog for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin_gap'))
  with check (public.has_role(auth.uid(), 'admin_gap'));

create policy "Admin GAP can delete variable_catalog"
  on public.variable_catalog for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin_gap'));

create trigger variable_catalog_touch_updated
  before update on public.variable_catalog
  for each row execute function public.touch_updated_at();