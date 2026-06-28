-- Migration: add tls_config (Documento 15 v3.1)
-- Cria a tabela de configuração TLS para HTTPS obrigatório

CREATE TABLE IF NOT EXISTS "tls_config" (
  "id"           TEXT NOT NULL,
  "mode"         TEXT NOT NULL,                                -- SELF_SIGNED | PKI | ACME
  "hostname"     TEXT NOT NULL DEFAULT 'seederlinux.local',
  "sans"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "server_cert"  TEXT,
  "server_key"   TEXT,
  "ca_cert"      TEXT,
  "ca_key"       TEXT,
  "fingerprint"  TEXT,
  "serial"       TEXT,
  "generated_at" TIMESTAMP(3),
  "expires_at"   TIMESTAMP(3),
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tls_config_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tls_config_active_idx" ON "tls_config"("active");
