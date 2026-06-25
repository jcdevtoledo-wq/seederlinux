import type { VariableDef } from "./types";

/** Catálogo oficial de variáveis (schema base extensível). */
export const OFFICIAL_VARIABLES: VariableDef[] = [
  // Diretório
  { key: "DOMINIO", label: "Domínio AD", descricao: "FQDN do domínio Active Directory.", tipo: "string", escopo: "diretorio", oficial: true, obrigatoria: true, exemplo: "comara.intraer" },
  { key: "DOMINIO_NETBIOS", label: "NetBIOS", descricao: "Nome curto NetBIOS do domínio.", tipo: "string", escopo: "diretorio", oficial: true, obrigatoria: true, exemplo: "COMARA" },
  { key: "DC_HOSTNAME", label: "Hostname do DC", descricao: "Hostname do controlador de domínio principal.", tipo: "string", escopo: "diretorio", oficial: true, obrigatoria: true, exemplo: "dc-comara" },
  { key: "DC_IP", label: "IP do DC", descricao: "IP do controlador de domínio.", tipo: "ip", escopo: "diretorio", oficial: true, obrigatoria: true, exemplo: "10.108.64.51" },
  { key: "METODO_AD", label: "Método AD", descricao: "Backend de integração: sssd, winbind ou auto.", tipo: "string", escopo: "diretorio", oficial: true, obrigatoria: true, default: "auto" },

  // Rede
  { key: "DNS_PRIMARIO", label: "DNS primário", descricao: "Servidor DNS primário.", tipo: "ip", escopo: "rede", oficial: true, obrigatoria: true },
  { key: "DNS_SECUNDARIO", label: "DNS secundário", descricao: "Servidor DNS secundário.", tipo: "ip", escopo: "rede", oficial: true, obrigatoria: false },
  { key: "PROXY_HTTP", label: "Proxy HTTP", descricao: "Endereço do proxy corporativo.", tipo: "string", escopo: "rede", oficial: true, obrigatoria: false },
  { key: "PROXY_PORTA", label: "Porta do proxy", descricao: "Porta do proxy corporativo.", tipo: "porta", escopo: "rede", oficial: true, obrigatoria: false, default: "8080" },
  { key: "NTP", label: "Servidor NTP", descricao: "Servidor de sincronia de tempo.", tipo: "string", escopo: "rede", oficial: true, obrigatoria: false },

  // Serviços
  { key: "SERVIDOR_ARQUIVOS", label: "Servidor SMB", descricao: "Servidor de arquivos para montagens CIFS.", tipo: "string", escopo: "servicos", oficial: true, obrigatoria: false },
  { key: "SERVIDOR_OCS", label: "URL OCS Inventory", descricao: "Endpoint do OCS Inventory NG.", tipo: "url", escopo: "servicos", oficial: true, obrigatoria: false },
  { key: "TAG_OCS", label: "Tag OCS", descricao: "Tag usada na identificação do agente OCS.", tipo: "string", escopo: "servicos", oficial: true, obrigatoria: false },
  { key: "SERVIDOR_VNC", label: "Servidor VNC", descricao: "Servidor de acesso remoto VNC.", tipo: "string", escopo: "servicos", oficial: true, obrigatoria: false },

  // Identidade
  { key: "SIGLA", label: "Sigla da OM", descricao: "Sigla curta da organização.", tipo: "string", escopo: "identidade", oficial: true, obrigatoria: true },
  { key: "HOMEPAGE", label: "Homepage padrão", descricao: "URL da homepage institucional.", tipo: "url", escopo: "identidade", oficial: true, obrigatoria: true },

  // Personalização
  { key: "WALLPAPER_URL", label: "Wallpaper", descricao: "URL/caminho do wallpaper institucional.", tipo: "string", escopo: "personalizacao", oficial: true, obrigatoria: false },
  { key: "TEMA_GTK", label: "Tema GTK", descricao: "Nome do tema visual padrão.", tipo: "string", escopo: "personalizacao", oficial: true, obrigatoria: false, default: "Mint-Y-Dark" },
];

const customStore: VariableDef[] = [];

export function getAllVariables(): VariableDef[] {
  return [...OFFICIAL_VARIABLES, ...customStore];
}

export function addCustomVariable(def: VariableDef) {
  customStore.push({ ...def, oficial: false });
}

/** Extrai variáveis usadas em um script bash (procura $VAR, ${VAR} e {{VAR}}). */
export function extractUsedVars(bash: string): string[] {
  const found = new Set<string>();
  const re = /(?:\$\{?([A-Z][A-Z0-9_]+)\}?|\{\{\s*([A-Z][A-Z0-9_]+)\s*\}\})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bash)) !== null) {
    found.add(m[1] ?? m[2]);
  }
  // Filtra builtins comuns do bash
  const builtins = new Set(["USER", "HOME", "PATH", "SHELL", "PWD", "UID", "PS1", "IFS", "LANG"]);
  return [...found].filter((v) => !builtins.has(v));
}
