// =============================================================================
// SeederLinux v3.0 — Catálogo Oficial de Módulos Core
// Documento 07 + Documento 11 §6 (Ordem de Execução obrigatória)
// =============================================================================
//
// Doc 11 §6 — Ordem de execução obrigatória:
//   1. Repositórios       → core.repositories
//   2. Certificados       → core.certificates
//   3. DNS                → core.dns
//   4. NTP                → core.time
//   5. Domínio            → core.domain
//   6. Compartilhamentos  → core.files
//   7. Navegadores        → core.browser
//   8. Branding           → core.branding
//   9. Impressoras        → core.printers
//   10. Inventário        → core.inventory
//   11. Suporte Remoto    → core.remote
//   12. Segurança/Scripts → core.security
//
// Cada módulo possui:
//   - code, name, description, category
//   - manifest (Doc 07 §3 — YAML/JSON com versao/dependencias/templates/rollback/validacao)
//   - requiredVars, optionalVars (Doc 06)
//   - scriptContent (template bash com {{VAR}})
//   - rollbackScript, validationScript
// =============================================================================

export interface CoreModuleSeed {
  code: string;
  name: string;
  description: string;
  category: string;
  version: string;
  executionOrder: number;
  requiredVars: string[];
  optionalVars: string[];
  dependencies: string[];
  manifest: Record<string, any>;
  scriptContent: string;
  rollbackScript: string;
  validationScript: string;
  supportedDistros: string[];
}

const DEFAULT_DISTROS = ['ubuntu', 'debian', 'linuxmint'];

export const CORE_MODULES: CoreModuleSeed[] = [
  // ===========================================================================
  // 1. CORE.REPOSITORIES
  // ===========================================================================
  {
    code: 'core.repositories',
    name: 'Core.Repositories',
    description:
      'Configura as fontes oficiais de pacotes (APT). Suporta modos PUBLIC, MIRROR, HYBRID e CUSTOM.',
    category: 'REPOSITORY',
    version: '1.0.0',
    executionOrder: 1,
    requiredVars: ['REPOSITORY_MODE'],
    optionalVars: ['REPOSITORY_URL', 'REPOSITORY_FALLBACK', 'REPOSITORY_DISTRO', 'PROXY_HTTP', 'PROXY_PORTA'],
    dependencies: [],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.Repositories',
      identificador: 'core.repositories',
      versao: '1.0.0',
      objetivo: 'Gerencia repositórios APT institucionais',
      funcionalidades: [
        'mirror local',
        'fallback para repositórios oficiais',
        'configuração de proxy',
        'chaves GPG',
      ],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.Repositories — SeederLinux v3.0
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

case "\${REPOSITORY_MODE}" in
  PUBLIC)
    echo "[core.repositories] Usando repositórios públicos oficiais"
    ;;
  MIRROR|CUSTOM)
    echo "[core.repositories] Configurando mirror: \${REPOSITORY_URL}"
    cat > /etc/apt/sources.list.d/seederlinux.list <<EOF
deb \${REPOSITORY_URL} \$(lsb_release -cs) main contrib non-free non-free-firmware
EOF
    ;;
  HYBRID)
    echo "[core.repositories] Modo híbrido: mirror + fallback público"
    cat > /etc/apt/sources.list.d/seederlinux.list <<EOF
deb \${REPOSITORY_URL} \$(lsb_release -cs) main contrib non-free non-free-firmware
EOF
    ;;
esac

apt-get update -qq
echo "[core.repositories] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
# Rollback Core.Repositories
rm -f /etc/apt/sources.list.d/seederlinux.list
apt-get update -qq
`,
    validationScript: `#!/usr/bin/env bash
# Validação: apt-get update funciona?
apt-get update -qq && echo "OK" || exit 1
`,
  },

  // ===========================================================================
  // 2. CORE.CERTIFICATES
  // ===========================================================================
  {
    code: 'core.certificates',
    name: 'Core.Certificates',
    description: 'Instala certificados raiz institucionais no sistema (ca-certificates).',
    category: 'CERTIFICATES',
    version: '1.0.0',
    executionOrder: 2,
    requiredVars: [],
    optionalVars: ['CERTIFICATE_BUNDLE', 'CERTIFICATE_AUTO_INSTALL'],
    dependencies: ['core.repositories'],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.Certificates',
      identificador: 'core.certificates',
      versao: '1.0.0',
      objetivo: 'Confiança em CAs institucionais',
      funcionalidades: ['baixar bundle', 'instalar em /usr/local/share/ca-certificates', 'update-ca-certificates'],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.Certificates — SeederLinux v3.0
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

if [[ -z "\${CERTIFICATE_BUNDLE:-}" ]]; then
  echo "[core.certificates] Nenhum bundle configurado — pulando"
  exit 0
fi

if [[ "\${CERTIFICATE_AUTO_INSTALL:-true}" != "true" ]]; then
  echo "[core.certificates] Auto-install desabilitado — pulando"
  exit 0
fi

apt-get install -y ca-certificates
mkdir -p /usr/local/share/ca-certificates/seederlinux
curl -fsSL "\${CERTIFICATE_BUNDLE}" -o /usr/local/share/ca-certificates/seederlinux/bundle.crt
update-ca-certificates
echo "[core.certificates] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
rm -rf /usr/local/share/ca-certificates/seederlinux
update-ca-certificates --fresh
`,
    validationScript: `#!/usr/bin/env bash
[[ -d /usr/local/share/ca-certificates/seederlinux ]] && echo "OK" || exit 1
`,
  },

  // ===========================================================================
  // 3. CORE.DNS
  // ===========================================================================
  {
    code: 'core.dns',
    name: 'Core.DNS',
    description:
      'Configura DNS primário/secundário e domínios de pesquisa via systemd-resolved ou /etc/resolv.conf.',
    category: 'DOMAIN',
    version: '1.0.0',
    executionOrder: 3,
    requiredVars: ['DNS_PRIMARIO'],
    optionalVars: ['DNS_SECUNDARIO', 'DOMINIO'],
    dependencies: [],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.DNS',
      identificador: 'core.dns',
      versao: '1.0.0',
      objetivo: 'Resolução DNS corporativa',
      funcionalidades: ['systemd-resolved', 'nss-resolve', 'fallback /etc/resolv.conf'],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.DNS — SeederLinux v3.0
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

if systemctl is-active systemd-resolved &>/dev/null; then
  mkdir -p /etc/systemd/resolved.conf.d
  cat > /etc/systemd/resolved.conf.d/seederlinux.conf <<EOF
[Resolve]
DNS=\${DNS_PRIMARIO}\${DNS_SECUNDARIO:+ \${DNS_SECUNDARIO}}
Domains=\${DOMINIO:-}
DNSSEC=no
EOF
  systemctl restart systemd-resolved
else
  cat > /etc/resolv.conf <<EOF
nameserver \${DNS_PRIMARIO}
\${DNS_SECUNDARIO:+nameserver \${DNS_SECUNDARIO}}
\${DOMINIO:+search \${DOMINIO}}
EOF
fi
echo "[core.dns] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
rm -f /etc/systemd/resolved.conf.d/seederlinux.conf
systemctl restart systemd-resolved 2>/dev/null || true
`,
    validationScript: `#!/usr/bin/env bash
source "/opt/seederlinux/etc/\${ORG}.conf"
getent hosts "\${DNS_PRIMARIO}" >/dev/null && echo "OK" || exit 1
`,
  },

  // ===========================================================================
  // 4. CORE.TIME (NTP)
  // ===========================================================================
  {
    code: 'core.time',
    name: 'Core.Time',
    description: 'Sincronização de relógio via NTP/chrony. Crítico para autenticação Kerberos.',
    category: 'TIME',
    version: '1.0.0',
    executionOrder: 4,
    requiredVars: [],
    optionalVars: ['NTP_SERVER'],
    dependencies: ['core.dns'],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.Time',
      identificador: 'core.time',
      versao: '1.0.0',
      objetivo: 'Garantir sincronização de tempo para Kerberos',
      funcionalidades: ['chrony', 'systemd-timesyncd', 'fallback pool.ntp.org'],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.Time — SeederLinux v3.0
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

apt-get install -y chrony
cat > /etc/chrony/conf.d/seederlinux.conf <<EOF
server \${NTP_SERVER:-pool.ntp.org} iburst
EOF
systemctl restart chronyd
chronyc -a makestep || true
echo "[core.time] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
rm -f /etc/chrony/conf.d/seederlinux.conf
systemctl restart chronyd 2>/dev/null || true
`,
    validationScript: `#!/usr/bin/env bash
chronyc tracking | grep -q "Leap status.*Normal" && echo "OK" || exit 1
`,
  },

  // ===========================================================================
  // 5. CORE.DOMAIN
  // ===========================================================================
  {
    code: 'core.domain',
    name: 'Core.Domain',
    description:
      'Ingresso institucional em domínio Active Directory via SSSD ou Winbind. Inclui Kerberos, Samba, NSS, PAM, mkhomedir.',
    category: 'IDENTITY',
    version: '1.0.0',
    executionOrder: 5,
    requiredVars: ['DOMINIO', 'DOMINIO_NETBIOS', 'DC_IP', 'DNS_PRIMARIO'],
    optionalVars: ['OU_PADRAO', 'GRUPO_ADMIN', 'OFFLINE_AUTH_ENABLED', 'NTP_SERVER'],
    dependencies: ['core.dns', 'core.time'],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.Domain',
      identificador: 'core.domain',
      versao: '1.0.0',
      objetivo: 'Ingresso em AD com SSSD/Winbind',
      metodos: ['SSSD', 'WINBIND'],
      funcionalidades: [
        'Kerberos',
        'Samba',
        'SSSD',
        'Winbind',
        'NSS',
        'PAM',
        'mkhomedir',
        'sudo por grupos',
        'cache de credenciais offline',
      ],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.Domain — SeederLinux v3.0 (método: SSSD)
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

DEBIAN_FRONTEND=noninteractive apt-get install -y \\
  realmd sssd sssd-tools libnss-sss libpam-sss \\
  adcli samba-common-bin oddjob oddjob-mkhomedir \\
  packagekit krb5-user

cat > /etc/krb5.conf <<EOF
[libdefaults]
default_realm = \${DOMINIO^^}
rdns = false
dns_lookup_realm = true
dns_lookup_kdc = true
EOF

realm discover "\${DOMINIO}" || true

if ! realm list | grep -q "\${DOMINIO}"; then
  echo "[core.domain] Realm não associado — execute 'realm join' manualmente"
fi

# mkhomedir
pam-auth-update --enable mkhomedir || true

# sudo para o grupo administrativo
if [[ -n "\${GRUPO_ADMIN:-}" ]]; then
  echo "%\${GRUPO_ADMIN} ALL=(ALL) ALL" > /etc/sudoers.d/seederlinux-admin
  chmod 0440 /etc/sudoers.d/seederlinux-admin
fi
echo "[core.domain] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
realm leave 2>/dev/null || true
rm -f /etc/sudoers.d/seederlinux-admin
`,
    validationScript: `#!/usr/bin/env bash
source "/opt/seederlinux/etc/\${ORG}.conf"
realm list | grep -q "\${DOMINIO}" && echo "OK" || exit 1
`,
  },

  // ===========================================================================
  // 6. CORE.FILES (Compartilhamentos SMB/CIFS)
  // ===========================================================================
  {
    code: 'core.files',
    name: 'Core.Files',
    description: 'Montagem de compartilhamentos SMB/CIFS corporativos (servidor de arquivos).',
    category: 'FILES',
    version: '1.0.0',
    executionOrder: 6,
    requiredVars: [],
    optionalVars: ['SERVIDOR_ARQUIVOS', 'COMPARTILHAMENTOS', 'MOUNT_BASE'],
    dependencies: ['core.domain'],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.Files',
      identificador: 'core.files',
      versao: '1.0.0',
      objetivo: 'Acesso a compartilhamentos institucionais',
      funcionalidades: ['cifs-utils', 'autofs', 'pam_mount opcional'],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.Files — SeederLinux v3.0
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

if [[ -z "\${SERVIDOR_ARQUIVOS:-}" || -z "\${COMPARTILHAMENTOS:-}" ]]; then
  echo "[core.files] Sem servidor ou compartilhamentos — pulando"
  exit 0
fi

apt-get install -y cifs-utils
MOUNT_BASE_DIR="\${MOUNT_BASE:-/mnt}"
mkdir -p "\${MOUNT_BASE_DIR}"

IFS=',' read -ra SHARES <<< "\${COMPARTILHAMENTOS}"
for share in "\${SHARES[@]}"; do
  share=\$(echo "\$share" | xargs)
  [[ -z "\$share" ]] && continue
  mkdir -p "\${MOUNT_BASE_DIR}/\${share}"
  # fstab para montagem persistente (kerberos via sec=krb5)
  if ! grep -q "\${SERVIDOR_ARQUIVOS}/\${share}" /etc/fstab; then
    echo "//\${SERVIDOR_ARQUIVOS}/\${share} \${MOUNT_BASE_DIR}/\${share} cifs sec=krb5,multiuser,_netdev,vers=3.0,nofail 0 0" >> /etc/fstab
  fi
done
echo "[core.files] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
sed -i '/seederlinux/d' /etc/fstab
`,
    validationScript: `#!/usr/bin/env bash
grep -q "cifs" /etc/fstab && echo "OK" || exit 1
`,
  },

  // ===========================================================================
  // 7. CORE.BROWSER
  // ===========================================================================
  {
    code: 'core.browser',
    name: 'Core.Browser',
    description:
      'Padroniza navegadores (Firefox/Chrome) com homepage, proxy, certificados e bloqueio de telemetria.',
    category: 'BROWSER',
    version: '1.0.0',
    executionOrder: 7,
    requiredVars: [],
    optionalVars: ['HOMEPAGE', 'PROXY_MODE', 'PROXY_HTTP', 'PROXY_PORTA', 'PAC_URL', 'NO_PROXY'],
    dependencies: ['core.certificates'],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.Browser',
      identificador: 'core.browser',
      versao: '1.0.0',
      objetivo: 'Políticas corporativas para Firefox/Chrome',
      funcionalidades: ['policies.json', 'proxy', 'PAC', 'desabilita telemetria'],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.Browser — SeederLinux v3.0
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

# Firefox (policies.json)
FIREFOX_POLICIES_DIR="/etc/firefox/policies"
mkdir -p "\${FIREFOX_POLICIES_DIR}"
cat > "\${FIREFOX_POLICIES_DIR}/policies.json" <<EOF
{
  "policies": {
    "Homepage": { "URL": "\${HOMEPAGE:-about:blank}", "Locked": false, "StartPage": "homepage" },
    "DisableTelemetry": true,
    "DisableFirefoxStudies": true,
    "Proxy": {
      "Mode": "\${PROXY_MODE:-none}",
      "HTTPProxy": "\${PROXY_HTTP:-}:\${PROXY_PORTA:-3128}",
      "SSLProxy": "\${PROXY_HTTP:-}:\${PROXY_PORTA:-3128}",
      "AutoConfigURL": "\${PAC_URL:-}",
      "Passthrough": "\${NO_PROXY:-localhost,127.0.0.1}"
    }
  }
}
EOF

# Chrome (policies)
CHROME_POLICIES_DIR="/etc/opt/chrome/policies/managed"
mkdir -p "\${CHROME_POLICIES_DIR}"
cat > "\${CHROME_POLICIES_DIR}/seederlinux.json" <<EOF
{
  "HomepageLocation": "\${HOMEPAGE:-about:blank}",
  "MetricsReportingEnabled": false,
  "ProxyMode": "\${PROXY_MODE:-direct}",
  "ProxyServer": "\${PROXY_HTTP:-}:\${PROXY_PORTA:-3128}",
  "ProxyPacUrl": "\${PAC_URL:-}",
  "ProxyBypassList": "\${NO_PROXY:-localhost,127.0.0.1}"
}
EOF

echo "[core.browser] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
rm -f /etc/firefox/policies/policies.json
rm -f /etc/opt/chrome/policies/managed/seederlinux.json
`,
    validationScript: `#!/usr/bin/env bash
[[ -f /etc/firefox/policies/policies.json ]] && echo "OK" || exit 1
`,
  },

  // ===========================================================================
  // 8. CORE.BRANDING
  // ===========================================================================
  {
    code: 'core.branding',
    name: 'Core.Branding',
    description:
      'Identidade visual: wallpaper, logo, tela de login, tema GTK, atalhos corporativos, Conky.',
    category: 'BRANDING',
    version: '1.0.0',
    executionOrder: 8,
    requiredVars: [],
    optionalVars: [
      'DISPLAY_NAME',
      'WALLPAPER',
      'WALLPAPER_LOGIN',
      'LOGO',
      'GREETER_URL',
      'THEME',
      'CONKY_PROFILE',
      'SHORTCUTS_ENABLED',
    ],
    dependencies: [],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.Branding',
      identificador: 'core.branding',
      versao: '1.0.0',
      objetivo: 'Padronização visual institucional',
      funcionalidades: ['wallpaper', 'tema GTK', 'greeter', 'conky', 'atalhos'],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.Branding — SeederLinux v3.0
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

BRANDING_DIR="/opt/seederlinux/branding"
mkdir -p "\${BRANDING_DIR}"

# Wallpaper
if [[ -n "\${WALLPAPER:-}" ]]; then
  curl -fsSL "\${WALLPAPER}" -o "\${BRANDING_DIR}/wallpaper.png" || true
fi
if [[ -n "\${WALLPAPER_LOGIN:-}" ]]; then
  curl -fsSL "\${WALLPAPER_LOGIN}" -o "\${BRANDING_DIR}/wallpaper-login.png" || true
fi
if [[ -n "\${LOGO:-}" ]]; then
  curl -fsSL "\${LOGO}" -o "\${BRANDING_DIR}/logo.png" || true
fi

# Tema GTK (Cinnamon/MATE/XFCE)
if [[ -n "\${THEME:-}" ]] && command -v dconf &>/dev/null; then
  cat > /etc/dconf/db/site.d/00-seederlinux-theme <<EOF
[org/cinnamon/desktop/interface]
gtk-theme='\${THEME}'
[org/mate/desktop/interface]
gtk-theme='\${THEME}'
EOF
  dconf update || true
fi

echo "[core.branding] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
rm -rf /opt/seederlinux/branding
rm -f /etc/dconf/db/site.d/00-seederlinux-theme
dconf update 2>/dev/null || true
`,
    validationScript: `#!/usr/bin/env bash
[[ -d /opt/seederlinux/branding ]] && echo "OK" || exit 1
`,
  },

  // ===========================================================================
  // 9. CORE.PRINTERS
  // ===========================================================================
  {
    code: 'core.printers',
    name: 'Core.Printers',
    description: 'Configura CUPS, servidor de impressão corporativo e impressora padrão.',
    category: 'PRINTERS',
    version: '1.0.0',
    executionOrder: 9,
    requiredVars: [],
    optionalVars: ['PRINT_SERVER', 'DEFAULT_PRINTER', 'PRINTERS'],
    dependencies: ['core.domain'],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.Printers',
      identificador: 'core.printers',
      versao: '1.0.0',
      objetivo: 'Impressão corporativa via CUPS',
      funcionalidades: ['cups', 'cups-browsed', 'IPP', 'descoberta automática'],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.Printers — SeederLinux v3.0
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

if [[ -z "\${PRINT_SERVER:-}" ]]; then
  echo "[core.printers] Sem servidor CUPS — pulando"
  exit 0
fi

apt-get install -y cups cups-browsed printer-driver-postscript-hp
systemctl enable --now cups cups-browsed

cat > /etc/cups/client.conf <<EOF
ServerName \${PRINT_SERVER}
EOF

if [[ -n "\${DEFAULT_PRINTER:-}" ]]; then
  lpoptions -d "\${DEFAULT_PRINTER}" || true
fi
echo "[core.printers] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
rm -f /etc/cups/client.conf
systemctl restart cups cups-browsed 2>/dev/null || true
`,
    validationScript: `#!/usr/bin/env bash
systemctl is-active cups >/dev/null && echo "OK" || exit 1
`,
  },

  // ===========================================================================
  // 10. CORE.INVENTORY
  // ===========================================================================
  {
    code: 'core.inventory',
    name: 'Core.Inventory',
    description: 'Coleta e envio de inventário (hardware/software/rede) para OCS e/ou GLPI.',
    category: 'INVENTORY',
    version: '1.0.0',
    executionOrder: 10,
    requiredVars: ['AGENT_CHECKIN_INTERVAL'],
    optionalVars: ['OCS_SERVER', 'GLPI_SERVER', 'INVENTORY_ENABLED'],
    dependencies: ['core.dns'],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.Inventory',
      identificador: 'core.inventory',
      versao: '1.0.0',
      objetivo: 'Inventário automatizado para OCS/GLPI',
      funcionalidades: ['ocsinventory-agent', 'glpi-agent', 'agendamento via cron/systemd'],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.Inventory — SeederLinux v3.0
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

if [[ "\${INVENTORY_ENABLED:-true}" != "true" ]]; then
  echo "[core.inventory] Inventário desabilitado — pulando"
  exit 0
fi

if [[ -n "\${OCS_SERVER:-}" ]]; then
  apt-get install -y ocsinventory-agent
  sed -i "s|^server=.*|server=\${OCS_SERVER}|" /etc/ocsinventory/ocsinventory-agent.cfg
fi

if [[ -n "\${GLPI_SERVER:-}" ]]; then
  apt-get install -y glpi-agent || true
  cat > /etc/glpi-agent/conf.d/seederlinux.cfg <<EOF
server = \${GLPI_SERVER}
EOF
fi

# Cron de inventário a cada \${AGENT_CHECKIN_INTERVAL} minutos
cat > /etc/cron.d/seederlinux-inventory <<EOF
*/\${AGENT_CHECKIN_INTERVAL} * * * * root /opt/seederlinux/bin/agent-checkin.sh >/dev/null 2>&1
EOF

echo "[core.inventory] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
rm -f /etc/cron.d/seederlinux-inventory
rm -f /etc/glpi-agent/conf.d/seederlinux.cfg
`,
    validationScript: `#!/usr/bin/env bash
[[ -f /etc/cron.d/seederlinux-inventory ]] && echo "OK" || exit 1
`,
  },

  // ===========================================================================
  // 11. CORE.REMOTE
  // ===========================================================================
  {
    code: 'core.remote',
    name: 'Core.Remote',
    description: 'Configura ferramenta de suporte remoto (RustDesk, VNC ou AnyDesk).',
    category: 'REMOTE',
    version: '1.0.0',
    executionOrder: 11,
    requiredVars: [],
    optionalVars: ['REMOTE_METHOD', 'REMOTE_SERVER'],
    dependencies: ['core.dns'],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.Remote',
      identificador: 'core.remote',
      versao: '1.0.0',
      objetivo: 'Suporte remoto institucional',
      metodos: ['RUSTDESK', 'VNC', 'ANYDESK'],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.Remote — SeederLinux v3.0
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

case "\${REMOTE_METHOD:-RUSTDESK}" in
  RUSTDESK)
    if ! command -v rustdesk &>/dev/null; then
      apt-get install -y wget
      wget -qO /tmp/rustdesk.deb "https://github.com/rustdesk/rustdesk/releases/latest/download/rustdesk-1.2.3-x86_64.deb" || true
      dpkg -i /tmp/rustdesk.deb 2>/dev/null || apt-get install -fy
    fi
    if [[ -n "\${REMOTE_SERVER:-}" ]]; then
      mkdir -p /root/.config/rustdesk
      cat > /root/.config/rustdesk/RustDesk2.toml <<EOF
[options]
custom-rendezvous-server = '\${REMOTE_SERVER}'
EOF
    fi
    ;;
  VNC)
    apt-get install -y x11vnc
    ;;
  ANYDESK)
    echo "[core.remote] AnyDesk requer instalação manual da licença"
    ;;
esac
echo "[core.remote] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
systemctl disable --now rustdesk 2>/dev/null || true
apt-get remove -y rustdesk 2>/dev/null || true
`,
    validationScript: `#!/usr/bin/env bash
command -v rustdesk >/dev/null || command -v x11vnc >/dev/null && echo "OK" || exit 1
`,
  },

  // ===========================================================================
  // 12. CORE.SECURITY (hardening + scripts personalizados pós-implantação)
  // ===========================================================================
  {
    code: 'core.security',
    name: 'Core.Security',
    description:
      'Hardening de SSH, firewall UFW, política de senhas e timeout de sessão. Último passo do provisionamento.',
    category: 'SECURITY',
    version: '1.0.0',
    executionOrder: 12,
    requiredVars: [],
    optionalVars: ['SESSION_TIMEOUT', 'PASSWORD_MIN_LENGTH', 'AUDIT_ENABLED'],
    dependencies: ['core.domain'],
    supportedDistros: DEFAULT_DISTROS,
    manifest: {
      nome: 'Core.Security',
      identificador: 'core.security',
      versao: '1.0.0',
      objetivo: 'Endurecimento básico e firewall',
      funcionalidades: ['UFW', 'sshd_config hardening', 'pam_pwquality', 'auditd'],
    },
    scriptContent: `#!/usr/bin/env bash
# Core.Security — SeederLinux v3.0
set -euo pipefail
source "/opt/seederlinux/etc/\${ORG}.conf"

# UFW
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw --force enable

# Hardening SSH
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#*X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config
systemctl restart ssh

# Política de senhas
apt-get install -y libpam-pwquality
sed -i "s/^# *minlen.*/minlen = \${PASSWORD_MIN_LENGTH:-12}/" /etc/security/pwquality.conf

# Auditd
if [[ "\${AUDIT_ENABLED:-true}" == "true" ]]; then
  apt-get install -y auditd
  systemctl enable --now auditd
fi

echo "[core.security] OK"
`,
    rollbackScript: `#!/usr/bin/env bash
ufw --force reset
systemctl disable --now auditd 2>/dev/null || true
`,
    validationScript: `#!/usr/bin/env bash
ufw status | grep -q "Status: active" && echo "OK" || exit 1
`,
  },
];

/** Helper para validar a ordem (1..12 sem buracos). */
export function validateOrdering(): void {
  const orders = CORE_MODULES.map((m) => m.executionOrder).sort((a, b) => a - b);
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) {
      throw new Error(`Core modules execution_order must be 1..N without gaps (got ${orders.join(',')})`);
    }
  }
}
