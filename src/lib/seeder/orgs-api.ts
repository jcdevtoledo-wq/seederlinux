// Cloud-backed CRUD para organizations + org_variables.
// Mapeia entre o schema do banco (snake_case) e o tipo Organization do app.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, variablesApi } from "@/lib/api/client";
import type { Organization, ADMethod, Distro, DesktopEnv } from "./types";

function apiToOrg(data: any, vars: any[] = []): Organization {
  const variaveis: Record<string, string> = {};
  for (const v of vars) variaveis[v.key] = v.value;
  return {
    id: data.id,
    nome: data.nome,
    sigla: data.sigla,
    descricao: data.descricao ?? "",
    status: data.status ?? "active",
    variaveis,
    // Domain Configuration
    fqdn: data.fqdn ?? "",
    netbios: data.netbios ?? "",
    realm: data.realm ?? "",
    // Domain Controllers
    dcPrimaryIp: data.dcPrimaryIp ?? data.dc_primary_ip ?? "",
    dcSecondaryIp: data.dcSecondaryIp ?? data.dc_secondary_ip ?? null,
    dcFqdn: data.dcFqdn ?? data.dc_fqdn ?? "",
    // DNS Configuration
    dnsPrimary: data.dnsPrimary ?? data.dns_primary ?? "",
    dnsSecondary: data.dnsSecondary ?? data.dns_secondary ?? null,
    searchDomains: data.searchDomains ?? data.search_domains ?? [],
    // NTP Configuration
    ntpServers: data.ntpServers ?? data.ntp_servers ?? [],
    timezone: data.timezone ?? "America/Sao_Paulo",
    // Proxy Configuration
    httpProxy: data.httpProxy ?? data.http_proxy ?? "",
    httpsProxy: data.httpsProxy ?? data.https_proxy ?? "",
    ftpProxy: data.ftpProxy ?? data.ftp_proxy ?? null,
    noProxy: data.noProxy ?? data.no_proxy ?? [],
    // Authentication
    authBackend: data.authBackend ?? data.auth_backend ?? "sssd",
    authMethod: data.authMethod ?? data.auth_method ?? "ads",
    // Printers
    printServer: data.printServer ?? data.print_server ?? null,
    defaultPrinter: data.defaultPrinter ?? data.default_printer ?? null,
    // Deployment
    deployProfile: data.deployProfile ?? data.deploy_profile ?? "standard",
    // Legacy fields
    dominio: data.dominio ?? data.fqdn ?? "",
    dcHostname: data.dcHostname ?? data.dc_hostname ?? data.dcFqdn ?? "",
    dcIp: data.dcIp ?? data.dc_ip ?? data.dcPrimaryIp ?? "",
    metodoAd: (data.metodoAd ?? data.metodo_ad ?? data.authBackend ?? "auto") as ADMethod,
    distrosSuportadas: data.distrosSuportadas ?? [],
    ambientesSuportados: data.ambientesSuportados ?? [],
    // Stats
    serial: Number(data.serial ?? 0),
    scriptsAtivos: data.scriptsAtivos ?? 0,
    estacoes: data.estacoes ?? 0,
    cor: data.cor ?? "oklch(0.6 0.15 200)",
    criadoEm: data.criadoEm ?? data.criado_em ?? data.createdAt ?? new Date().toISOString(),
  };
}

export const ORGS_QK = ["organizations"] as const;

export function useOrganizations() {
  return useQuery({
    queryKey: ORGS_QK,
    queryFn: async (): Promise<Organization[]> => {
      const orgs = await organizationsApi.list();
      return orgs.map((o: any) => apiToOrg(o));
    },
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: [...ORGS_QK, id],
    queryFn: async (): Promise<Organization> => {
      const data = await organizationsApi.get(id);
      return apiToOrg(data, data.variables ?? []);
    },
    enabled: !!id,
  });
}

export function useUpsertOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (org: Organization) => {
      const data: any = {
        nome: org.nome,
        sigla: org.sigla,
        descricao: org.descricao,
        status: org.status ?? "active",
        // Domain Configuration
        fqdn: org.fqdn,
        netbios: org.netbios,
        realm: org.realm,
        // Domain Controllers
        dcPrimaryIp: org.dcPrimaryIp,
        dcSecondaryIp: org.dcSecondaryIp,
        dcFqdn: org.dcFqdn,
        // DNS Configuration
        dnsPrimary: org.dnsPrimary,
        dnsSecondary: org.dnsSecondary,
        searchDomains: org.searchDomains,
        // NTP Configuration
        ntpServers: org.ntpServers,
        timezone: org.timezone,
        // Proxy Configuration
        httpProxy: org.httpProxy,
        httpsProxy: org.httpsProxy,
        ftpProxy: org.ftpProxy,
        noProxy: org.noProxy,
        // Authentication
        authBackend: org.authBackend,
        authMethod: org.authMethod,
        // Printers
        printServer: org.printServer,
        defaultPrinter: org.defaultPrinter,
        // Deployment
        deployProfile: org.deployProfile,
        // Legacy fields
        dominio: org.dominio || org.fqdn,
        dcHostname: org.dcHostname || org.dcFqdn,
        dcIp: org.dcIp || org.dcPrimaryIp,
        metodoAd: org.metodoAd || org.authBackend,
        distrosSuportadas: org.distrosSuportadas,
        ambientesSuportados: org.ambientesSuportados,
        cor: org.cor,
      };

      if (org.id) {
        await organizationsApi.update(org.id, data);
        const entries = Object.entries(org.variaveis);
        for (const [key, value] of entries) {
          await variablesApi.set(org.id, key, value);
        }
      } else {
        const created = await organizationsApi.create(data);
        const entries = Object.entries(org.variaveis);
        for (const [key, value] of entries) {
          await variablesApi.set(created.id, key, value);
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ORGS_QK }),
  });
}

export function useSetOrgVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { orgId: string; key: string; value: string }) => {
      await variablesApi.set(p.orgId, p.key, p.value);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ORGS_QK }),
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await organizationsApi.delete(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ORGS_QK }),
  });
}
