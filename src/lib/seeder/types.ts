// SeederLinux v3.0 — tipos centrais do domínio
// Alinhado com Documentação v3.0 — Organization é APENAS metadados;
// todas as configurações técnicas são variáveis catalogadas.

export type Distro = "ubuntu" | "linuxmint" | "debian" | "rocky" | "almalinux" | "zorin";
export type DesktopEnv = "GNOME" | "MATE" | "Cinnamon" | "XFCE" | "KDE" | "LXDE";

export type ScriptCategory =
  | "core"
  | "sistema"
  | "rede"
  | "seguranca"
  | "usuario"
  | "desktop"
  | "automacao"
  | "custom"
  | "dns"
  | "ntp"
  | "proxy"
  | "ad"
  | "browser"
  | "printer"
  | "branding"
  | "ingresso"
  | "personalizacao"
  | "logon"
  | "logoff"
  | "atualizacao"
  | "senha"
  | "impressoras"
  | "legados"
  | "inventario";

export type ScriptStatus = "rascunho" | "pronto" | "depreciado" | "validado" | "publicado";

export type VarType = "string" | "boolean" | "integer" | "ip" | "url" | "array";

/** Definição catalogada de uma variável (catálogo oficial). */
export interface VariableDefinition {
  id?: string;
  key: string;
  label: string;
  category: string; // DOMINIO, DNS, PROXY, BRANDING, etc.
  description: string;
  type: VarType;
  required: boolean;
  editable: boolean;
  oficial: boolean;
  defaultValue?: string | null;
  exemplo?: string | null;
  validation?: string | null;
  coreModule?: string | null;
  /** Valor atual desta variável para a OM em contexto (quando agregado). */
  value?: string;
}

export type OrgStatus = "active" | "inactive" | "setup_pending";

/**
 * Organização — APENAS metadados (Documentação v3.0).
 * Todas as configurações técnicas (DNS, proxy, AD, etc.) vivem em `config`,
 * que é populada a partir de organization_variables.
 */
export interface Organization {
  id: string;
  nome: string;
  sigla: string;
  descricao: string;
  ativo: boolean;
  status: OrgStatus;
  cor: string;
  serial: number;
  estacoes: number;
  scriptsAtivos: number;
  /** Mapa chave→valor de TODAS as variáveis catalogadas para a OM. */
  config: Record<string, string>;
  /** Alias legado (mesmo conteúdo de `config`) para compatibilidade. */
  variaveis: Record<string, string>;
  branding?: BrandingConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandingConfig {
  orgId: string;
  displayName?: string | null;
  wallpaperUrl?: string | null;
  wallpaperLogin?: string | null;
  logoUrl?: string | null;
  greeterUrl?: string | null;
  theme: string;
  conkyEnabled: boolean;
  conkyConfig: any;
  shortcutsEnabled: boolean;
}

export interface SeederScript {
  id: string;
  nome: string;
  categoria: ScriptCategory;
  descricao: string;
  variaveisUsadas: string[];
  oficial: boolean;
  versao: string;
  serial: number;
  status: ScriptStatus;
  conteudo: string;
  atualizadoEm: string;
  autor?: string;
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
