-- =============================================================================
-- SeederLinux — Inicialização COMPLETA do PostgreSQL
-- Inclui: roles, schemas, extensões, tabelas, seeds
-- =============================================================================

-- Role 'postgres' (GoTrue espera que exista)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';
    END IF;
END $$;

-- Roles Supabase
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN NOINHERIT; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN NOINHERIT; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin NOLOGIN CREATEROLE; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN CREATE ROLE supabase_storage_admin NOLOGIN CREATEROLE; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_read_only_user') THEN CREATE ROLE supabase_read_only_user BYPASSRLS NOLOGIN; END IF;
END $$;

-- =============================================================================
-- CRITICAL: supabase_replication_admin MUST be SUPERUSER for Realtime v2.28.32
-- Realtime ignores DB_SCHEMA and requires SUPERUSER to create schema_migrations
-- =============================================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_replication_admin') THEN
        CREATE ROLE supabase_replication_admin WITH LOGIN SUPERUSER REPLICATION PASSWORD 'replication_password';
    ELSE
        ALTER ROLE supabase_replication_admin WITH LOGIN SUPERUSER REPLICATION PASSWORD 'replication_password';
    END IF;
END $$;

-- =============================================================================
-- CRITICAL: Pre-create schema_migrations table for Realtime
-- Realtime v2.28.32 requires this table to exist in PUBLIC schema
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version BIGINT PRIMARY KEY,
    inserted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.schema_migrations OWNER TO supabase_replication_admin;
GRANT ALL ON TABLE public.schema_migrations TO supabase_replication_admin;

-- Schemas
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Grants auth
GRANT ALL ON SCHEMA auth TO supabase_admin;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT CREATE ON SCHEMA auth TO supabase_admin;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;

-- Grants storage
GRANT ALL ON SCHEMA storage TO supabase_admin;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT USAGE ON SCHEMA storage TO authenticated, anon, service_role;

-- Grants _realtime
GRANT ALL ON SCHEMA _realtime TO supabase_replication_admin;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;
GRANT USAGE ON SCHEMA _realtime TO authenticated, service_role;

-- Grants public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Conexão replication
GRANT CONNECT ON DATABASE postgres TO supabase_replication_admin;
GRANT USAGE ON SCHEMA public TO supabase_replication_admin;

-- Publication Realtime
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- =============================================================================
-- TABELAS DA APLICAÇÃO
-- =============================================================================

CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin_gap', 'operador_om', 'auditor');

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text, display_name text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL, org_sigla text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, org_sigla)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$ BEGIN new.updated_at = now(); RETURN new; END; $$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles (id, email, display_name) VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))); RETURN new; END; $$;
CREATE OR REPLACE FUNCTION public.can_access_org(_user_id uuid, _sigla text) RETURNS boolean LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.has_role(_user_id, 'admin_gap') OR public.has_role(_user_id, 'auditor') OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'operador_om' AND org_sigla = _sigla) $$;

CREATE TRIGGER profiles_touch_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
CREATE POLICY IF NOT EXISTS "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_roles_select_admin" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin_gap'));
CREATE POLICY IF NOT EXISTS "user_roles_manage_admin" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_gap')) WITH CHECK (public.has_role(auth.uid(), 'admin_gap'));

-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id text PRIMARY KEY, nome text NOT NULL, sigla text NOT NULL UNIQUE,
  dominio text NOT NULL DEFAULT '', dc_hostname text NOT NULL DEFAULT '', dc_ip text NOT NULL DEFAULT '',
  metodo_ad text NOT NULL DEFAULT 'auto' CHECK (metodo_ad IN ('sssd','winbind','auto')),
  distros_suportadas text[] NOT NULL DEFAULT '{}', ambientes_suportados text[] NOT NULL DEFAULT '{}',
  serial bigint NOT NULL DEFAULT 0, cor text NOT NULL DEFAULT 'oklch(0.6 0.15 200)',
  estacoes integer NOT NULL DEFAULT 0, scripts_ativos integer NOT NULL DEFAULT 0,
  criado_em date NOT NULL DEFAULT current_date, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- org_variables
CREATE TABLE IF NOT EXISTS public.org_variables (
  org_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL, value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (org_id, key)
);
ALTER TABLE public.org_variables ENABLE ROW LEVEL SECURITY;

-- audit_events
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ts timestamptz NOT NULL DEFAULT now(),
  ator_id uuid NOT NULL, ator_email text NOT NULL DEFAULT '',
  categoria text NOT NULL, acao text NOT NULL, alvo text, detalhes text
);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- stations
CREATE TABLE IF NOT EXISTS public.stations (
  id text PRIMARY KEY, hostname text NOT NULL,
  org_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ip text NOT NULL DEFAULT '', distro text NOT NULL DEFAULT 'ubuntu', desktop text NOT NULL DEFAULT 'GNOME',
  serial_aplicado bigint NOT NULL DEFAULT 0, ultimo_checkin timestamptz,
  status text NOT NULL DEFAULT 'nunca', perfil_ativo text, usuario text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stations;

-- station_tokens
CREATE TABLE IF NOT EXISTS public.station_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, label text NOT NULL DEFAULT 'agente',
  created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz, revoked_at timestamptz
);
ALTER TABLE public.station_tokens ENABLE ROW LEVEL SECURITY;

-- station_runs
CREATE TABLE IF NOT EXISTS public.station_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), station_id text NOT NULL, profile_id text,
  serial_alvo bigint NOT NULL DEFAULT 0, serial_anterior bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok', scripts_total integer NOT NULL DEFAULT 0,
  scripts_ok integer NOT NULL DEFAULT 0, duracao_ms integer NOT NULL DEFAULT 0,
  agent_version text, log jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.station_runs ENABLE ROW LEVEL SECURITY;

-- scripts
CREATE TABLE IF NOT EXISTS public.scripts (
  id text PRIMARY KEY, nome text NOT NULL, descricao text NOT NULL DEFAULT '',
  categoria text NOT NULL, versao text NOT NULL DEFAULT '1.0.0', status text NOT NULL DEFAULT 'rascunho',
  conteudo text NOT NULL DEFAULT '', variaveis_usadas text[] NOT NULL DEFAULT '{}',
  autor text NOT NULL DEFAULT '', oficial boolean NOT NULL DEFAULT false,
  compatibilidade text[] NOT NULL DEFAULT ARRAY['ubuntu','linuxmint','debian']::text[],
  criado_em date NOT NULL DEFAULT current_date, atualizado_em date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- profiles_seeder
CREATE TABLE IF NOT EXISTS public.profiles_seeder (
  id text PRIMARY KEY, nome text NOT NULL, descricao text NOT NULL DEFAULT '',
  script_ids text[] NOT NULL DEFAULT '{}', organizacao_origem text, publico boolean NOT NULL DEFAULT false,
  criado_em date NOT NULL DEFAULT current_date, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles_seeder ENABLE ROW LEVEL SECURITY;

-- variable_catalog
CREATE TABLE IF NOT EXISTS public.variable_catalog (
  key text PRIMARY KEY, label text NOT NULL, descricao text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'string', escopo text NOT NULL DEFAULT 'custom',
  oficial boolean NOT NULL DEFAULT false, obrigatoria boolean NOT NULL DEFAULT false,
  exemplo text, default_value text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.variable_catalog ENABLE ROW LEVEL SECURITY;

-- system_config
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.system_config (key, value) VALUES ('setup_completed', 'false') ON CONFLICT (key) DO NOTHING;

-- Configurar search_path para replication_admin (agora SUPERUSER)
ALTER ROLE supabase_replication_admin SET search_path TO public, _realtime;
ALTER DATABASE postgres SET search_path TO public, auth, _realtime, extensions;
