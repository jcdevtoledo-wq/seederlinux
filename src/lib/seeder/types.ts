// SeederLinux — tipos centrais do domínio
export type ADMethod = "sssd" | "winbind" | "auto";
export type Distro = "ubuntu" | "linuxmint" | "debian" | "rocky" | "almalinux" | "zorin";
export type DesktopEnv = "GNOME" | "MATE" | "Cinnamon" | "XFCE" | "KDE" | "LXDE";
export type ScriptCategory =
  | "ingresso"
  | "personalizacao"
  | "logon"
  | "logoff"
  | "atualizacao"
  | "senha"
  | "impressoras"
  | "legados"
  | "inventario";

export type ScriptStatus = "rascunho" | "validado" | "publicado";

export type VarType = "string" | "ip" | "url" | "porta" | "bool" | "path";
export type VarScope = "rede" | "diretorio" | "servicos" | "identidade" | "personalizacao" | "custom";

/** Catálogo de variáveis suportadas pelo ecossistema. */
export interface VariableDef {
  /** Identificador bash (UPPER_SNAKE_CASE), ex.: DOMINIO, DC_IP. */
  key: string;
  label: string;
  descricao: string;
  tipo: VarType;
  escopo: VarScope;
  /** true = parte do schema oficial; false = custom de um GAP. */
  oficial: boolean;
  obrigatoria: boolean;
  exemplo?: string;
  default?: string;
}

export type OrgStatus = 'active' | 'inactive' | 'setup_pending';
export type AuthBackend = 'sssd' | 'winbind';
export type AuthMethod = 'ads' | 'ldap';
export type DeployProfile = 'minimal' | 'standard' | 'full' | 'custom';

export interface Organization {
  id: string;
  nome: string;
  sigla: string;
  descricao: string;
  status: OrgStatus;
  variaveis: Record<string, string>;
  // Domain Configuration (V2.0)
  fqdn: string;
  netbios: string;
  realm: string;
  // Domain Controllers
  dcPrimaryIp: string;
  dcSecondaryIp: string | null;
  dcFqdn: string;
  // DNS Configuration
  dnsPrimary: string;
  dnsSecondary: string | null;
  searchDomains: string[];
  // NTP Configuration
  ntpServers: string[];
  timezone: string;
  // Proxy Configuration
  httpProxy: string;
  httpsProxy: string;
  ftpProxy: string | null;
  noProxy: string[];
  // Authentication
  authBackend: AuthBackend;
  authMethod: AuthMethod;
  // Printers
  printServer: string | null;
  defaultPrinter: string | null;
  // Deployment
  deployProfile: DeployProfile;
  // Legacy fields (for compatibility)
  dominio: string;
  dcHostname: string;
  dcIp: string;
  metodoAd: ADMethod;
  distrosSuportadas: Distro[];
  ambientesSuportados: DesktopEnv[];
  // Stats
  serial: number;
  scriptsAtivos: number;
  estacoes: number;
  cor: string;
  criadoEm: string;
}

export interface SeederScript {
  id: string;
  nome: string;
  categoria: ScriptCategory;
  descricao: string;
  finalidade: string;
  localExecucao: "root" | "usuario" | "login" | "logoff";
  momento: string;
  permissoes: string;
  compatibilidade: Distro[];
  dependencias: string[];
  impacto: "baixo" | "medio" | "alto";
  reinicializacao: boolean;
  autor: string;
  /** Variáveis declaradas que este script consome (chaves do catálogo). */
  variaveisUsadas: string[];
  /** true = oficial central (não editável local), false = custom GAP. */
  oficial: boolean;
  versao: string;
  serial: number;
  status: ScriptStatus;
  compartilhado: boolean;
  /** Conteúdo bash. Pode usar `source` do .conf E/OU placeholders {{VAR}}. */
  conteudo: string;
  atualizadoEm: string;
}

export interface SeederProfile {
  id: string;
  nome: string;
  descricao: string;
  scriptIds: string[];
  organizacaoOrigem: string | null;
  publico: boolean;
  criadoEm: string;
}
