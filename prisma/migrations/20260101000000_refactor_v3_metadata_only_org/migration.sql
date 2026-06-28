-- Migration: refactor to v3.0 — Organization metadata-only + variable_definitions catalog
-- DESTRUCTIVE: drops technical fields from organizations and the old variable_catalog table
-- Aligned with Documento 03 / 06 / 11 (v3.0)

BEGIN;

-- 1. Drop old org_variables (will be recreated with new schema)
DROP TABLE IF EXISTS "org_variables" CASCADE;

-- 2. Drop legacy variable_catalog table (replaced by variable_definitions)
DROP TABLE IF EXISTS "variable_catalog" CASCADE;

-- 3. Drop legacy applications, software profiles, update channels (not in v3.0 simplified model)
DROP TABLE IF EXISTS "legacy_application_versions" CASCADE;
DROP TABLE IF EXISTS "legacy_applications" CASCADE;
DROP TABLE IF EXISTS "software_packages" CASCADE;
DROP TABLE IF EXISTS "software_profiles" CASCADE;
DROP TABLE IF EXISTS "updates" CASCADE;
DROP TABLE IF EXISTS "update_channels" CASCADE;

-- 4. Remove technical fields from organizations
ALTER TABLE "organizations"
  DROP COLUMN IF EXISTS "fqdn",
  DROP COLUMN IF EXISTS "netbios",
  DROP COLUMN IF EXISTS "realm",
  DROP COLUMN IF EXISTS "dc_primary_ip",
  DROP COLUMN IF EXISTS "dc_secondary_ip",
  DROP COLUMN IF EXISTS "dc_fqdn",
  DROP COLUMN IF EXISTS "dns_primary",
  DROP COLUMN IF EXISTS "dns_secondary",
  DROP COLUMN IF EXISTS "search_domains",
  DROP COLUMN IF EXISTS "ntp_servers",
  DROP COLUMN IF EXISTS "timezone",
  DROP COLUMN IF EXISTS "http_proxy",
  DROP COLUMN IF EXISTS "https_proxy",
  DROP COLUMN IF EXISTS "ftp_proxy",
  DROP COLUMN IF EXISTS "no_proxy",
  DROP COLUMN IF EXISTS "auth_backend",
  DROP COLUMN IF EXISTS "auth_method",
  DROP COLUMN IF EXISTS "print_server",
  DROP COLUMN IF EXISTS "default_printer",
  DROP COLUMN IF EXISTS "deploy_profile",
  DROP COLUMN IF EXISTS "dominio",
  DROP COLUMN IF EXISTS "dc_hostname",
  DROP COLUMN IF EXISTS "dc_ip",
  DROP COLUMN IF EXISTS "metodo_ad",
  DROP COLUMN IF EXISTS "distrosSuportadas",
  DROP COLUMN IF EXISTS "ambientesSuportados",
  DROP COLUMN IF EXISTS "criado_em";

-- 5. Convert serial from BIGINT to INTEGER (per Doc 03 v3.0)
ALTER TABLE "organizations" ALTER COLUMN "serial" TYPE INTEGER USING serial::integer;

-- 6. Add new "ativo" column if it doesn't exist
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;

-- 7. Rename scriptsAtivos to scripts_ativos if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'scriptsAtivos'
  ) THEN
    ALTER TABLE "organizations" RENAME COLUMN "scriptsAtivos" TO "scripts_ativos";
  END IF;
END $$;

-- 8. Create variable_definitions (the official catalog)
CREATE TABLE IF NOT EXISTS "variable_definitions" (
  "id" TEXT NOT NULL,
  "key" VARCHAR(80) NOT NULL,
  "label" VARCHAR(120) NOT NULL,
  "category" VARCHAR(40) NOT NULL,
  "description" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'string',
  "required" BOOLEAN NOT NULL DEFAULT false,
  "editable" BOOLEAN NOT NULL DEFAULT true,
  "oficial" BOOLEAN NOT NULL DEFAULT true,
  "default_value" TEXT,
  "exemplo" TEXT,
  "validation" TEXT,
  "core_module" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "variable_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "variable_definitions_key_key" ON "variable_definitions"("key");
CREATE INDEX IF NOT EXISTS "variable_definitions_category_idx" ON "variable_definitions"("category");

-- 9. Create organization_variables (the single source of truth)
CREATE TABLE IF NOT EXISTS "organization_variables" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "definition_id" TEXT NOT NULL,
  "value" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_variables_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "organization_variables_org_def_key"
  ON "organization_variables"("organization_id", "definition_id");
CREATE INDEX IF NOT EXISTS "organization_variables_org_idx"
  ON "organization_variables"("organization_id");

ALTER TABLE "organization_variables"
  ADD CONSTRAINT "organization_variables_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

ALTER TABLE "organization_variables"
  ADD CONSTRAINT "organization_variables_definition_id_fkey"
  FOREIGN KEY ("definition_id") REFERENCES "variable_definitions"("id") ON DELETE CASCADE;

COMMIT;
