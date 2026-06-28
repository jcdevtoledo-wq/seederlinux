-- Migration: add core_modules + profile_modules (Documento 03 §7, Documento 07)
-- Catálogo institucional imutável dos módulos Core do SeederLinux

CREATE TABLE IF NOT EXISTS "core_modules" (
  "id"                TEXT NOT NULL,
  "code"              VARCHAR(60) NOT NULL,
  "name"              VARCHAR(120) NOT NULL,
  "description"       TEXT NOT NULL,
  "category"          VARCHAR(40) NOT NULL,
  "version"           TEXT NOT NULL DEFAULT '1.0.0',
  "serial"            INTEGER NOT NULL DEFAULT 0,
  "execution_order"   INTEGER NOT NULL,
  "immutable"         BOOLEAN NOT NULL DEFAULT true,
  "enabled"           BOOLEAN NOT NULL DEFAULT true,
  "manifest"          JSONB NOT NULL DEFAULT '{}',
  "required_vars"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "optional_vars"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "dependencies"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "rollback_script"   TEXT,
  "validation_script" TEXT,
  "script_content"    TEXT,
  "supported_distros" TEXT[] NOT NULL DEFAULT ARRAY['ubuntu', 'debian', 'linuxmint']::TEXT[],
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "core_modules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "core_modules_code_key" ON "core_modules"("code");
CREATE INDEX IF NOT EXISTS "core_modules_execution_order_idx" ON "core_modules"("execution_order");
CREATE INDEX IF NOT EXISTS "core_modules_category_idx" ON "core_modules"("category");

CREATE TABLE IF NOT EXISTS "profile_modules" (
  "id"             TEXT NOT NULL,
  "profile_id"     TEXT NOT NULL,
  "core_module_id" TEXT NOT NULL,
  "enabled"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profile_modules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "profile_modules_profile_module_key"
  ON "profile_modules"("profile_id", "core_module_id");

ALTER TABLE "profile_modules"
  ADD CONSTRAINT "profile_modules_profile_id_fkey"
  FOREIGN KEY ("profile_id") REFERENCES "profiles_seeder"("id") ON DELETE CASCADE;

ALTER TABLE "profile_modules"
  ADD CONSTRAINT "profile_modules_core_module_id_fkey"
  FOREIGN KEY ("core_module_id") REFERENCES "core_modules"("id") ON DELETE CASCADE;
