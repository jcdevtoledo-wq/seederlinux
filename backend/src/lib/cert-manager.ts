// =============================================================================
// SeederLinux v3.0 — Cert Manager
// Documento 15 v3.1 — TLS obrigatório
//
// Suporta 3 modos:
//   - SELF_SIGNED: gera CA + cert do servidor automaticamente
//   - PKI:        certificado importado de uma PKI corporativa (CSR externo)
//   - ACME:       Let's Encrypt / ACME (a implementar — placeholder)
// =============================================================================

import { PrismaClient } from '@prisma/client';
import forge from 'node-forge';
import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

export type TlsMode = 'SELF_SIGNED' | 'PKI' | 'ACME';

export interface TlsBundle {
  cert: string;       // PEM do servidor
  key: string;        // PEM da chave privada do servidor
  ca?: string;        // PEM do CA (apenas SELF_SIGNED)
  fingerprint: string;
  serial: string;
  expiresAt: Date;
  hostname: string;
  sans: string[];
}

export interface GenerateOptions {
  hostname?: string;
  sans?: string[];
  caCommonName?: string;
  caValidityDays?: number;
  serverValidityDays?: number;
  org?: string;
  country?: string;
}

const DEFAULTS = {
  hostname: 'seederlinux.local',
  caValidityDays: 3650,       // 10 anos para o CA
  serverValidityDays: 825,    // ~2 anos para o cert do servidor (limite CAB Forum)
  org: 'SeederLinux',
  country: 'BR',
};

// =============================================================================
// Helpers
// =============================================================================

function pemFingerprint(certPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const sha256 = createHash('sha256').update(Buffer.from(der, 'binary')).digest('hex');
  // Formata XX:XX:XX:...
  return sha256.match(/.{1,2}/g)!.join(':').toUpperCase();
}

function randomSerial(): string {
  // 64-bit serial, hex, prefixado com 0 para garantir positivo
  return '0' + randomBytes(8).toString('hex');
}

function buildSubject(commonName: string, org: string, country: string) {
  return [
    { name: 'commonName', value: commonName },
    { name: 'organizationName', value: org },
    { name: 'organizationalUnitName', value: 'SeederLinux' },
    { name: 'countryName', value: country },
  ];
}

function buildSanExtension(hostname: string, sans: string[]) {
  // SAN: DNS para hostname + cada item; IPs reconhecidos viram tipo 7
  const altNames: any[] = [{ type: 2, value: hostname }];
  for (const s of sans) {
    if (!s) continue;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(s)) {
      altNames.push({ type: 7, ip: s });
    } else if (s !== hostname) {
      altNames.push({ type: 2, value: s });
    }
  }
  return { name: 'subjectAltName', altNames };
}

// =============================================================================
// SELF-SIGNED CA + Server Cert
// =============================================================================

/**
 * Gera um par CA (CommonName "SeederLinux Root CA") + certificado do servidor
 * assinado pelo CA. Retorna PEMs prontos para Fastify (https.cert/key) e o CA
 * para distribuição às estações (truststore).
 */
export function generateSelfSignedBundle(opts: GenerateOptions = {}): TlsBundle & { caKey: string } {
  const hostname = opts.hostname || DEFAULTS.hostname;
  const sans = (opts.sans || []).filter(Boolean);
  const caCN = opts.caCommonName || `SeederLinux Root CA (${hostname})`;
  const org = opts.org || DEFAULTS.org;
  const country = opts.country || DEFAULTS.country;
  const caDays = opts.caValidityDays ?? DEFAULTS.caValidityDays;
  const serverDays = opts.serverValidityDays ?? DEFAULTS.serverValidityDays;

  // ---- 1. CA ----
  const caKeys = forge.pki.rsa.generateKeyPair({ bits: 4096, e: 0x10001 });
  const caCert = forge.pki.createCertificate();
  caCert.publicKey = caKeys.publicKey;
  caCert.serialNumber = randomSerial();
  caCert.validity.notBefore = new Date();
  caCert.validity.notAfter = new Date(Date.now() + caDays * 24 * 60 * 60 * 1000);
  const caSubject = buildSubject(caCN, org, country);
  caCert.setSubject(caSubject);
  caCert.setIssuer(caSubject); // self-signed
  caCert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true, pathLenConstraint: 1 },
    { name: 'keyUsage', critical: true, keyCertSign: true, cRLSign: true, digitalSignature: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  caCert.sign(caKeys.privateKey, forge.md.sha256.create());

  // ---- 2. Server cert assinado pelo CA ----
  const serverKeys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const serverCert = forge.pki.createCertificate();
  serverCert.publicKey = serverKeys.publicKey;
  serverCert.serialNumber = randomSerial();
  serverCert.validity.notBefore = new Date();
  serverCert.validity.notAfter = new Date(Date.now() + serverDays * 24 * 60 * 60 * 1000);
  serverCert.setSubject(buildSubject(hostname, org, country));
  serverCert.setIssuer(caSubject);
  serverCert.setExtensions([
    { name: 'basicConstraints', cA: false },
    {
      name: 'keyUsage',
      critical: true,
      digitalSignature: true,
      keyEncipherment: true,
      nonRepudiation: true,
    },
    { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
    buildSanExtension(hostname, sans),
    { name: 'subjectKeyIdentifier' },
  ]);
  serverCert.sign(caKeys.privateKey, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(serverCert);
  const keyPem = forge.pki.privateKeyToPem(serverKeys.privateKey);
  const caPem = forge.pki.certificateToPem(caCert);
  const caKeyPem = forge.pki.privateKeyToPem(caKeys.privateKey);

  return {
    cert: certPem,
    key: keyPem,
    ca: caPem,
    caKey: caKeyPem,
    fingerprint: pemFingerprint(certPem),
    serial: serverCert.serialNumber,
    expiresAt: serverCert.validity.notAfter,
    hostname,
    sans,
  };
}

// =============================================================================
// PKI mode — importa cert/key já emitidos
// =============================================================================

export function importPkiBundle(opts: {
  cert: string;
  key: string;
  ca?: string;
  hostname?: string;
  sans?: string[];
}): TlsBundle {
  const certObj = forge.pki.certificateFromPem(opts.cert);
  return {
    cert: opts.cert,
    key: opts.key,
    ca: opts.ca,
    fingerprint: pemFingerprint(opts.cert),
    serial: certObj.serialNumber,
    expiresAt: certObj.validity.notAfter,
    hostname: opts.hostname || (certObj.subject.getField('CN')?.value as string) || 'unknown',
    sans: opts.sans || [],
  };
}

// =============================================================================
// Persistence
// =============================================================================

/**
 * Persiste um bundle TLS na tabela `tls_config`, desativando o anterior.
 */
export async function persistBundle(
  prisma: PrismaClient,
  mode: TlsMode,
  bundle: TlsBundle & { caKey?: string }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.tlsConfig.updateMany({
      where: { active: true },
      data: { active: false },
    });
    await tx.tlsConfig.create({
      data: {
        mode,
        hostname: bundle.hostname,
        sans: bundle.sans,
        serverCert: bundle.cert,
        serverKey: bundle.key,
        caCert: bundle.ca ?? null,
        caKey: bundle.caKey ?? null,
        fingerprint: bundle.fingerprint,
        serial: bundle.serial,
        generatedAt: new Date(),
        expiresAt: bundle.expiresAt,
        active: true,
      },
    });
  });
}

export async function getActiveTls(prisma: PrismaClient): Promise<TlsBundle & { mode: TlsMode; caKey?: string | null } | null> {
  const row = await prisma.tlsConfig.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!row || !row.serverCert || !row.serverKey) return null;
  return {
    mode: row.mode as TlsMode,
    cert: row.serverCert,
    key: row.serverKey,
    ca: row.caCert ?? undefined,
    caKey: row.caKey,
    fingerprint: row.fingerprint ?? '',
    serial: row.serial ?? '',
    expiresAt: row.expiresAt ?? new Date(),
    hostname: row.hostname,
    sans: row.sans,
  };
}

// =============================================================================
// Filesystem export (opcional — para distribuir o CA às estações)
// =============================================================================

/**
 * Exporta o bundle ativo para o disco (ex: /opt/seederlinux/tls).
 * Útil para o agente baixar o CA pela primeira vez.
 */
export async function exportToDisk(
  prisma: PrismaClient,
  baseDir: string = process.env.TLS_DIR || '/opt/seederlinux/tls'
): Promise<{ certFile: string; keyFile: string; caFile?: string } | null> {
  const bundle = await getActiveTls(prisma);
  if (!bundle) return null;

  fs.mkdirSync(baseDir, { recursive: true, mode: 0o750 });

  const certFile = path.join(baseDir, 'server.crt');
  const keyFile = path.join(baseDir, 'server.key');
  fs.writeFileSync(certFile, bundle.cert, { mode: 0o644 });
  fs.writeFileSync(keyFile, bundle.key, { mode: 0o600 });

  let caFile: string | undefined;
  if (bundle.ca) {
    caFile = path.join(baseDir, 'ca.crt');
    fs.writeFileSync(caFile, bundle.ca, { mode: 0o644 });
  }
  return { certFile, keyFile, caFile };
}

// =============================================================================
// Bootstrap — carrega ou gera o bundle TLS conforme a configuração
// =============================================================================

/**
 * Tenta carregar o bundle ativo do banco. Não gera automaticamente — a geração
 * é responsabilidade do Setup Wizard. Retorna `null` se não houver TLS ativo
 * (servidor sobe em HTTP somente quando o setup ainda não foi concluído).
 */
export async function bootstrapTls(
  prisma: PrismaClient
): Promise<{ cert: string; key: string; mode: TlsMode } | null> {
  try {
    const active = await getActiveTls(prisma);
    if (!active) return null;
    return { cert: active.cert, key: active.key, mode: active.mode };
  } catch {
    // Tabela pode não existir ainda (migration não rodada). Cai em HTTP.
    return null;
  }
}

/**
 * Wrapper de conveniência para o Setup Wizard.
 * Modos suportados:
 *   - SELF_SIGNED: gera CA + cert do servidor, persiste e retorna o bundle
 *   - PKI:        usa cert/key fornecidos no payload
 *   - ACME:       não implementado (lança erro)
 */
export async function configureTlsFromSetup(
  prisma: PrismaClient,
  payload: {
    mode: TlsMode;
    hostname?: string;
    sans?: string[];
    generateCA?: boolean;
    cert?: string;       // PKI mode
    key?: string;        // PKI mode
    ca?: string;         // PKI mode (opcional)
  }
): Promise<TlsBundle> {
  if (payload.mode === 'SELF_SIGNED') {
    const bundle = generateSelfSignedBundle({
      hostname: payload.hostname,
      sans: payload.sans,
    });
    await persistBundle(prisma, 'SELF_SIGNED', bundle);
    return bundle;
  }
  if (payload.mode === 'PKI') {
    if (!payload.cert || !payload.key) {
      throw new Error('PKI mode requires "cert" and "key" PEMs');
    }
    const bundle = importPkiBundle({
      cert: payload.cert,
      key: payload.key,
      ca: payload.ca,
      hostname: payload.hostname,
      sans: payload.sans,
    });
    await persistBundle(prisma, 'PKI', bundle);
    return bundle;
  }
  if (payload.mode === 'ACME') {
    throw new Error('ACME mode is not implemented yet (planned for v3.1+)');
  }
  throw new Error(`Unknown TLS mode: ${payload.mode}`);
}
