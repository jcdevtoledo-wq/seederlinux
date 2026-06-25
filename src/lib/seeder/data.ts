import type { Organization, SeederScript, SeederProfile } from "./types";

export const ORGANIZATIONS_SEED: Organization[] = [
  {
    id: "comara",
    nome: "Comissão de Aeroportos da Amazônia",
    sigla: "COMARA",
    variaveis: {
      DOMINIO: "comara.intraer",
      DOMINIO_NETBIOS: "COMARA",
      DC_HOSTNAME: "dc-comara",
      DC_IP: "10.108.64.51",
      METODO_AD: "sssd",
      DNS_PRIMARIO: "10.108.64.27",
      DNS_SECUNDARIO: "10.108.64.28",
      PROXY_HTTP: "10.108.88.4",
      PROXY_PORTA: "8080",
      NTP: "ntp.comara.intraer",
      SERVIDOR_ARQUIVOS: "fs.comara.intraer",
      SERVIDOR_OCS: "http://ocs.comara.intraer/ocsinventory",
      TAG_OCS: "GAPBE-COMARA",
      SERVIDOR_VNC: "vnc.comara.intraer",
      SIGLA: "COMARA",
      HOMEPAGE: "http://www.comara.intraer/",
      TEMA_GTK: "Mint-Y-Dark",
    },
    dominio: "comara.intraer",
    dcHostname: "dc-comara",
    dcIp: "10.108.64.51",
    metodoAd: "sssd",
    distrosSuportadas: ["linuxmint", "ubuntu", "debian"],
    ambientesSuportados: ["Cinnamon", "MATE", "XFCE"],
    serial: 2025033101,
    scriptsAtivos: 12,
    estacoes: 184,
    cor: "oklch(0.62 0.16 155)",
    criadoEm: "2024-01-12",
  },
  {
    id: "gapbe",
    nome: "Grupamento de Apoio de Belém",
    sigla: "GAPBE",
    variaveis: {
      DOMINIO: "gapbe.intraer",
      DOMINIO_NETBIOS: "GAPBE",
      DC_HOSTNAME: "dc01-gapbe",
      DC_IP: "10.108.10.5",
      METODO_AD: "auto",
      DNS_PRIMARIO: "10.108.10.5",
      PROXY_HTTP: "proxy.gapbe.intraer",
      PROXY_PORTA: "3128",
      SERVIDOR_OCS: "http://ocs.gapbe.intraer/ocsinventory",
      TAG_OCS: "GAPBE",
      SIGLA: "GAPBE",
      HOMEPAGE: "http://intranet.gapbe.intraer/",
    },
    dominio: "gapbe.intraer",
    dcHostname: "dc01-gapbe",
    dcIp: "10.108.10.5",
    metodoAd: "auto",
    distrosSuportadas: ["ubuntu", "linuxmint"],
    ambientesSuportados: ["Cinnamon", "GNOME"],
    serial: 2025021500,
    scriptsAtivos: 9,
    estacoes: 312,
    cor: "oklch(0.55 0.12 200)",
    criadoEm: "2024-03-04",
  },
  {
    id: "dcta",
    nome: "Departamento de Ciência e Tecnologia Aeroespacial",
    sigla: "DCTA",
    variaveis: {
      DOMINIO: "dcta.intraer",
      DOMINIO_NETBIOS: "DCTA",
      DC_HOSTNAME: "ad-dcta",
      DC_IP: "10.20.0.10",
      METODO_AD: "winbind",
      DNS_PRIMARIO: "10.20.0.10",
      SIGLA: "DCTA",
      HOMEPAGE: "http://portal.dcta.intraer/",
    },
    dominio: "dcta.intraer",
    dcHostname: "ad-dcta",
    dcIp: "10.20.0.10",
    metodoAd: "winbind",
    distrosSuportadas: ["rocky", "almalinux", "ubuntu"],
    ambientesSuportados: ["GNOME", "KDE"],
    serial: 2024112000,
    scriptsAtivos: 7,
    estacoes: 96,
    cor: "oklch(0.6 0.18 30)",
    criadoEm: "2024-08-21",
  },
];

const bashIngresso = `#!/usr/bin/env bash
# ingressar_dominio.sh — Orquestrador oficial de ingresso AD
# SeederLinux • Script base imutável; parametrizado pela OM via /opt/softwarelivre/etc/<sigla>.conf
set -euo pipefail

# Carrega variáveis da OM (DOMINIO, DC_HOSTNAME, DC_IP, METODO_AD, ...)
source /opt/softwarelivre/etc/\${ORG:-om}.conf
source /opt/softwarelivre/lib/comum.sh
source /opt/softwarelivre/lib/detectar_ambiente.sh

log "[\${SIGLA}] Iniciando ingresso no domínio \${DOMINIO} via \${METODO_AD}"

# Configura DNS antes do realm discover
echo "nameserver \${DNS_PRIMARIO}" | sudo tee /etc/resolv.conf >/dev/null
[[ -n "\${DNS_SECUNDARIO:-}" ]] && echo "nameserver \${DNS_SECUNDARIO}" | sudo tee -a /etc/resolv.conf >/dev/null

if [[ "\${METODO_AD}" == "sssd" || "\${METODO_AD}" == "auto" ]]; then
  source /opt/softwarelivre/lib/backend_sssd.sh
  configurar_sssd
else
  source /opt/softwarelivre/lib/backend_winbind.sh
  configurar_winbind
fi

realm discover "\${DOMINIO}"
realm join -U administrador "\${DOMINIO}"
log "[\${SIGLA}] Ingresso concluído com sucesso."
`;

const bashPersonalizar = `#!/usr/bin/env bash
# personalizar_estacao.sh — Aplica identidade visual da OM
set -euo pipefail
source /opt/softwarelivre/etc/\${ORG:-om}.conf

log "[\${SIGLA}] Aplicando wallpaper: \${WALLPAPER_URL:-padrão}"
gsettings set org.cinnamon.desktop.background picture-uri "file://\${WALLPAPER_URL}" || true
gsettings set org.cinnamon.desktop.interface gtk-theme "\${TEMA_GTK:-Mint-Y-Dark}" || true

# Homepage padrão para Firefox/Chromium
mkdir -p /etc/firefox/policies
cat > /etc/firefox/policies/policies.json <<EOF
{ "policies": { "Homepage": { "URL": "\${HOMEPAGE}", "Locked": true } } }
EOF
`;

const bashLogon = `#!/usr/bin/env bash
# logon.sh — Rotinas de sessão (login PAM)
source /opt/softwarelivre/etc/\${ORG:-om}.conf

/opt/softwarelivre/bin/verifica_serial.sh || true
[[ -n "\${SERVIDOR_ARQUIVOS:-}" ]] && mount -a -t cifs 2>/dev/null || true
sudo -u "\${USER}" /opt/softwarelivre/user/kixtart.sh
`;

const bashTrocaSenha = `#!/usr/bin/env bash
# trocar_senha.sh — Interface Zenity para troca de senha AD
source /opt/softwarelivre/etc/\${ORG:-om}.conf

NOVA=$(zenity --password --title "Trocar senha de \${USER} (\${DOMINIO})")
[[ -z "\${NOVA}" ]] && exit 1
echo "\${NOVA}" | smbpasswd -s -U "\${USER}" -r "\${DC_HOSTNAME}"
zenity --info --text "Senha alterada com sucesso em \${DOMINIO}."
`;

const bashImpressoras = `#!/usr/bin/env bash
# instalar_impressoras.sh — Cadastra filas CUPS apontando para o servidor SMB
set -euo pipefail
source /opt/softwarelivre/etc/\${ORG:-om}.conf

[[ -z "\${SERVIDOR_ARQUIVOS:-}" ]] && { echo "SERVIDOR_ARQUIVOS não definido"; exit 1; }
lpadmin -p fila_segura -E -v "smb://\${SERVIDOR_ARQUIVOS}/print$/fila_segura"
lpadmin -d fila_segura
`;

const bashOcs = `#!/usr/bin/env bash
# ocs_inventario.sh — Configura agente OCS Inventory NG
set -euo pipefail
source /opt/softwarelivre/etc/\${ORG:-om}.conf

[[ -z "\${SERVIDOR_OCS:-}" ]] && { echo "SERVIDOR_OCS não definido"; exit 0; }
sed -i "s|server=.*|server=\${SERVIDOR_OCS}|" /etc/ocsinventory/ocsinventory-agent.cfg
sed -i "s|tag=.*|tag=\${TAG_OCS:-GENERIC}|" /etc/ocsinventory/ocsinventory-agent.cfg
systemctl restart ocsinventory-agent
`;

const bashLogoff = `#!/usr/bin/env bash
# logoff.sh — Higienização ao final da sessão
source /opt/softwarelivre/etc/\${ORG:-om}.conf
rm -rf /tmp/sess_* || true
`;

const bashLegados = `#!/usr/bin/env bash
# instalar_legados.sh — Compatibilidade com sistemas legados (SIGADAER etc.)
set -euo pipefail
source /opt/softwarelivre/etc/\${ORG:-om}.conf

apt-get update
apt-get install -y openjdk-8-jre firefox-esr
`;

export const SCRIPTS_SEED: SeederScript[] = [
  {
    id: "s-ingresso",
    nome: "ingressar_dominio.sh",
    categoria: "ingresso",
    descricao: "Orquestrador oficial — detecta ambiente, configura backend AD e ingressa a estação no domínio.",
    finalidade: "Ingressar estação no Active Directory institucional usando variáveis da OM.",
    localExecucao: "root",
    momento: "Implantação inicial",
    permissoes: "sudo / root",
    compatibilidade: ["ubuntu", "linuxmint", "debian"],
    dependencias: ["realmd", "sssd", "samba-common", "krb5-user"],
    impacto: "alto",
    reinicializacao: true,
    autor: "DASTI",
    variaveisUsadas: ["DOMINIO", "DC_HOSTNAME", "DC_IP", "METODO_AD", "DNS_PRIMARIO", "DNS_SECUNDARIO", "SIGLA"],
    oficial: true,
    versao: "2.4.1",
    serial: 2025033101,
    status: "validado",
    compartilhado: true,
    conteudo: bashIngresso,
    atualizadoEm: "2025-03-31",
  },
  {
    id: "s-personalizar",
    nome: "personalizar_estacao.sh",
    categoria: "personalizacao",
    descricao: "Aplica wallpaper, tema, homepage e identidade visual da OM.",
    finalidade: "Padronização visual pós-ingresso.",
    localExecucao: "root",
    momento: "Após ingresso",
    permissoes: "sudo",
    compatibilidade: ["ubuntu", "linuxmint", "debian", "zorin"],
    dependencias: ["dconf-cli", "gsettings"],
    impacto: "medio",
    reinicializacao: false,
    autor: "DASTI",
    variaveisUsadas: ["WALLPAPER_URL", "TEMA_GTK", "HOMEPAGE", "SIGLA"],
    oficial: true,
    versao: "1.8.0",
    serial: 2025033101,
    status: "validado",
    compartilhado: true,
    conteudo: bashPersonalizar,
    atualizadoEm: "2025-03-31",
  },
  {
    id: "s-logon",
    nome: "logon.sh",
    categoria: "logon",
    descricao: "Executado pelo display manager no login. Verifica serial e monta SMB.",
    finalidade: "Rotinas por sessão do usuário.",
    localExecucao: "login",
    momento: "Login do usuário",
    permissoes: "root → usuário",
    compatibilidade: ["ubuntu", "linuxmint"],
    dependencias: ["cifs-utils"],
    impacto: "baixo",
    reinicializacao: false,
    autor: "DASTI",
    variaveisUsadas: ["SERVIDOR_ARQUIVOS"],
    oficial: true,
    versao: "1.3.2",
    serial: 2025033101,
    status: "publicado",
    compartilhado: true,
    conteudo: bashLogon,
    atualizadoEm: "2025-03-31",
  },
  {
    id: "s-logoff",
    nome: "logoff.sh",
    categoria: "logoff",
    descricao: "Limpeza de sessão, remoção de temporários e atalhos.",
    finalidade: "Higienização ao final da sessão.",
    localExecucao: "logoff",
    momento: "Logoff",
    permissoes: "root",
    compatibilidade: ["ubuntu", "linuxmint"],
    dependencias: [],
    impacto: "baixo",
    reinicializacao: false,
    autor: "DASTI",
    variaveisUsadas: [],
    oficial: true,
    versao: "1.1.0",
    serial: 2025021500,
    status: "publicado",
    compartilhado: false,
    conteudo: bashLogoff,
    atualizadoEm: "2025-02-15",
  },
  {
    id: "s-senha",
    nome: "trocar_senha.sh",
    categoria: "senha",
    descricao: "Interface Zenity para troca de senha de domínio AD.",
    finalidade: "Permitir ao usuário alterar a senha sem painel admin.",
    localExecucao: "usuario",
    momento: "Sob demanda",
    permissoes: "usuário",
    compatibilidade: ["ubuntu", "linuxmint", "debian"],
    dependencias: ["zenity", "smbclient"],
    impacto: "baixo",
    reinicializacao: false,
    autor: "DASTI",
    variaveisUsadas: ["DOMINIO", "DC_HOSTNAME"],
    oficial: true,
    versao: "1.0.4",
    serial: 2025033101,
    status: "validado",
    compartilhado: true,
    conteudo: bashTrocaSenha,
    atualizadoEm: "2025-03-31",
  },
  {
    id: "s-impressoras",
    nome: "instalar_impressoras.sh",
    categoria: "impressoras",
    descricao: "Cadastra filas CUPS apontando para o servidor SMB da OM.",
    finalidade: "Padronizar impressão em rede.",
    localExecucao: "root",
    momento: "Implantação / atualização",
    permissoes: "sudo",
    compatibilidade: ["ubuntu", "linuxmint", "debian"],
    dependencias: ["cups", "smbclient"],
    impacto: "medio",
    reinicializacao: false,
    autor: "GAPBE-TI",
    variaveisUsadas: ["SERVIDOR_ARQUIVOS"],
    oficial: true,
    versao: "1.2.0",
    serial: 2025021500,
    status: "validado",
    compartilhado: true,
    conteudo: bashImpressoras,
    atualizadoEm: "2025-02-15",
  },
  {
    id: "s-legados",
    nome: "instalar_legados.sh",
    categoria: "legados",
    descricao: "Instala Firefox ESR, Java 8 e dependências de sistemas SIGADAER.",
    finalidade: "Compatibilidade com sistemas legados institucionais.",
    localExecucao: "root",
    momento: "Implantação",
    permissoes: "sudo",
    compatibilidade: ["ubuntu", "linuxmint"],
    dependencias: ["openjdk-8-jre", "firefox-esr"],
    impacto: "medio",
    reinicializacao: false,
    autor: "DASTI",
    variaveisUsadas: [],
    oficial: true,
    versao: "0.9.1",
    serial: 2024112000,
    status: "rascunho",
    compartilhado: false,
    conteudo: bashLegados,
    atualizadoEm: "2024-11-20",
  },
  {
    id: "s-inventario",
    nome: "ocs_inventario.sh",
    categoria: "inventario",
    descricao: "Configura agente OCS Inventory NG apontando para o servidor da OM.",
    finalidade: "Inventário de hardware/software.",
    localExecucao: "root",
    momento: "Implantação",
    permissoes: "sudo",
    compatibilidade: ["ubuntu", "linuxmint", "debian", "rocky", "almalinux"],
    dependencias: ["ocsinventory-agent"],
    impacto: "baixo",
    reinicializacao: false,
    autor: "DCTA-TI",
    variaveisUsadas: ["SERVIDOR_OCS", "TAG_OCS"],
    oficial: true,
    versao: "1.0.0",
    serial: 2024112000,
    status: "validado",
    compartilhado: true,
    conteudo: bashOcs,
    atualizadoEm: "2024-11-20",
  },
];

export const PROFILES_SEED: SeederProfile[] = [
  {
    id: "p-padrao-gap",
    nome: "GAP padrão (Mint + Cinnamon)",
    descricao: "Perfil completo para estações administrativas em Linux Mint Cinnamon.",
    scriptIds: ["s-ingresso", "s-personalizar", "s-logon", "s-logoff", "s-senha", "s-impressoras"],
    organizacaoOrigem: "comara",
    publico: true,
    criadoEm: "2025-01-10",
  },
  {
    id: "p-laboratorio",
    nome: "Laboratório técnico (Ubuntu GNOME)",
    descricao: "Estações de laboratório com sistemas legados habilitados.",
    scriptIds: ["s-ingresso", "s-personalizar", "s-legados", "s-inventario"],
    organizacaoOrigem: "comara",
    publico: false,
    criadoEm: "2025-02-04",
  },
  {
    id: "p-dcta-rocky",
    nome: "DCTA — Rocky Linux KDE",
    descricao: "Estações de pesquisa em Rocky Linux com KDE Plasma.",
    scriptIds: ["s-ingresso", "s-inventario"],
    organizacaoOrigem: "dcta",
    publico: false,
    criadoEm: "2024-12-01",
  },
];
