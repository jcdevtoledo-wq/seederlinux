// Store em memória (client-side) — substitua por API/Cloud em fase posterior
import { useSyncExternalStore } from "react";
import type { Organization, SeederScript, SeederProfile, VariableDef } from "./types";
import { ORGANIZATIONS_SEED, SCRIPTS_SEED, PROFILES_SEED } from "./data";
import { OFFICIAL_VARIABLES } from "./variables";

interface State {
  organizations: Organization[];
  scripts: SeederScript[];
  profiles: SeederProfile[];
  variables: VariableDef[];
}

let state: State = {
  organizations: [...ORGANIZATIONS_SEED],
  scripts: [...SCRIPTS_SEED],
  profiles: [...PROFILES_SEED],
  variables: [...OFFICIAL_VARIABLES],
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

export function useSeederStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Organizations
export function addOrganization(org: Organization) {
  state = { ...state, organizations: [...state.organizations, org] };
  emit();
}
export function updateOrganization(id: string, patch: Partial<Organization>) {
  state = {
    ...state,
    organizations: state.organizations.map((o) => (o.id === id ? { ...o, ...patch } : o)),
  };
  emit();
}
export function setOrgVariable(id: string, key: string, value: string) {
  state = {
    ...state,
    organizations: state.organizations.map((o) =>
      o.id === id ? { ...o, variaveis: { ...o.variaveis, [key]: value } } : o,
    ),
  };
  emit();
}
export function removeOrganization(id: string) {
  state = { ...state, organizations: state.organizations.filter((o) => o.id !== id) };
  emit();
}

// Scripts
export function addScript(s: SeederScript) {
  state = { ...state, scripts: [...state.scripts, s] };
  emit();
}
export function updateScript(id: string, patch: Partial<SeederScript>) {
  state = {
    ...state,
    scripts: state.scripts.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  };
  emit();
}
export function removeScript(id: string) {
  state = { ...state, scripts: state.scripts.filter((s) => s.id !== id) };
  emit();
}

// Profiles
export function addProfile(p: SeederProfile) {
  state = { ...state, profiles: [...state.profiles, p] };
  emit();
}

// Variables
export function addVariable(v: VariableDef) {
  if (state.variables.some((x) => x.key === v.key)) return;
  state = { ...state, variables: [...state.variables, { ...v, oficial: false }] };
  emit();
}

// ============================================================
// Geração do .conf da OM (modelo HÍBRIDO):
//  - bash source-able pelos scripts oficiais
//  - inclui todas as variáveis catalogadas + custom da OM
// ============================================================
export function generateOrgConfBash(org: Organization, vars: VariableDef[] = state.variables): string {
  const linhas: string[] = [
    `# ============================================================`,
    `# /opt/seederlinux/etc/${org.sigla.toLowerCase()}.conf`,
    `# Configuracao da OM ${org.sigla} - gerado por SeederLinux`,
    `# Data: ${new Date().toISOString()}`,
    `# Serial: ${org.serial}`,
    `# ============================================================`,
    `export ORG="${org.sigla.toLowerCase()}"`,
    `export ORG_NAME="${org.nome}"`,
    `export ORG_SIGLA="${org.sigla}"`,
    ``,
    `# ---- DOMAIN CONFIGURATION ----`,
    `export AD_DOMAIN="${org.fqdn || org.dominio}"`,
    `export AD_REALM="${org.realm || org.fqdn?.toUpperCase() || org.dominio?.toUpperCase()}"`,
    `export AD_NETBIOS="${org.netbios || org.sigla}"`,
    `export AD_DC_PRIMARY="${org.dcPrimaryIp || org.dcIp}"`,
    `export AD_DC_SECONDARY="${org.dcSecondaryIp || ''}"`,
    `export AD_DC_FQDN="${org.dcFqdn || org.dcHostname}"`,
    `export AD_BACKEND="${org.authBackend || org.metodoAd}"`,
    `export AD_METHOD="${org.authMethod || 'ads'}"`,
    `export FQDN="${org.fqdn || org.dominio}"`,
    ``,
    `# ---- DNS CONFIGURATION ----`,
    `export DNS_PRIMARY="${org.dnsPrimary || '8.8.8.8'}"`,
    `export DNS_SECONDARY="${org.dnsSecondary || ''}"`,
    `export DNS_SEARCH_DOMAINS="${(org.searchDomains || []).join(',')}"`,
    ``,
    `# ---- NTP CONFIGURATION ----`,
    `export NTP_SERVERS="${(org.ntpServers || ['pool.ntp.org']).join(',')}"`,
    `export TIMEZONE="${org.timezone || 'America/Sao_Paulo'}"`,
    ``,
    `# ---- PROXY CONFIGURATION ----`,
    `export PROXY_HTTP="${org.httpProxy || ''}"`,
    `export PROXY_HTTPS="${org.httpsProxy || ''}"`,
    `export PROXY_FTP="${org.ftpProxy || ''}"`,
    `export PROXY_NO_PROXY="${(org.noProxy || ['localhost', '127.0.0.1']).join(',')}"`,
    `export PROXY_ENABLED="${org.httpProxy ? 'true' : 'false'}"`,
    ``,
    `# ---- PRINTER CONFIGURATION ----`,
    `export PRINT_SERVER="${org.printServer || ''}"`,
    `export PRINT_DEFAULT="${org.defaultPrinter || ''}"`,
    ``,
    `# ---- DEPLOYMENT ----`,
    `export DEPLOY_PROFILE="${org.deployProfile || 'standard'}"`,
    ``,
  ];

  // Add organization-specific variables (variaveis field)
  const officialKeys = new Set([
    'AD_DOMAIN', 'AD_REALM', 'AD_NETBIOS', 'AD_DC_PRIMARY', 'AD_DC_SECONDARY', 'AD_DC_FQDN',
    'AD_BACKEND', 'AD_METHOD', 'FQDN', 'DNS_PRIMARY', 'DNS_SECONDARY', 'DNS_SEARCH_DOMAINS',
    'NTP_SERVERS', 'TIMEZONE', 'PROXY_HTTP', 'PROXY_HTTPS', 'PROXY_FTP', 'PROXY_NO_PROXY',
    'PROXY_ENABLED', 'PRINT_SERVER', 'PRINT_DEFAULT', 'DEPLOY_PROFILE', 'ORG', 'ORG_NAME', 'ORG_SIGLA'
  ]);

  const customVars = Object.entries(org.variaveis || {}).filter(([k]) => !officialKeys.has(k));
  if (customVars.length > 0) {
    linhas.push(`# ---- CUSTOM VARIABLES ----`);
    for (const [k, v] of customVars) {
      linhas.push(`export ${k}="${v}"`);
    }
  }

  return linhas.join("\n");
}

/** Renderiza placeholders {{VAR}} no conteúdo de um script com os valores da OM. */
export function renderScriptForOrg(script: SeederScript, org: Organization): string {
  return script.conteudo.replace(/\{\{\s*([A-Z][A-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return org.variaveis[key] ?? `{{${key}}}`;
  });
}

/** Diagnóstico: variáveis exigidas pelos scripts vs disponíveis na OM. */
export function diagnoseOrgCoverage(org: Organization, scripts: SeederScript[]) {
  const required = new Set<string>();
  scripts.forEach((s) => s.variaveisUsadas.forEach((v) => required.add(v)));
  const missing = [...required].filter((k) => !org.variaveis[k]);
  return { required: [...required], missing };
}
