import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const setupSchema = z.object({
  setupToken: z.string(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  adminName: z.string().min(1),
  orgName: z.string().min(1),
  orgSigla: z.string().min(2).max(10),
  orgDominio: z.string().optional(),
});

export default async function setupRoutes(app: FastifyInstance) {
  // Check if setup is completed
  app.get('/status', async () => {
    const config = await app.prisma.systemConfig.findUnique({
      where: { key: 'setup_completed' },
    });

    return {
      completed: config?.value === 'true',
    };
  });

  // Run initial setup (PUBLIC - no auth required)
  app.post('/', async (request, reply) => {
    // Check if already completed
    const config = await app.prisma.systemConfig.findUnique({
      where: { key: 'setup_completed' },
    });

    if (config?.value === 'true') {
      return reply.code(400).send({ error: 'Setup already completed' });
    }

    const body = setupSchema.parse(request.body);

    // Validate setup token
    const validToken = body.setupToken === process.env.SETUP_TOKEN;
    if (!validToken) {
      return reply.code(401).send({ error: 'Invalid setup token' });
    }

    // Check if admin already exists
    const existingAdmin = await app.prisma.user.findUnique({
      where: { email: body.adminEmail.toLowerCase() },
    });

    if (existingAdmin) {
      return reply.code(400).send({ error: 'Admin user already exists' });
    }

    // Create organization
    const org = await app.prisma.organization.create({
      data: {
        nome: body.orgName,
        sigla: body.orgSigla.toUpperCase(),
        dominio: body.orgDominio || '',
        dcHostname: '',
        dcIp: '',
        metodoAd: 'auto',
        distrosSuportadas: ['ubuntu', 'linuxmint', 'debian'],
        ambientesSuportados: ['GNOME', 'Cinnamon', 'XFCE'],
        cor: 'oklch(0.6 0.15 200)',
      },
    });

    // Create default variables for org
    await app.prisma.orgVariable.createMany({
      data: [
        { orgId: org.id, key: 'DNS_PRIMARIO', value: '8.8.8.8' },
        { orgId: org.id, key: 'DNS_SECUNDARIO', value: '8.8.4.4' },
        { orgId: org.id, key: 'PROXY', value: '' },
        { orgId: org.id, key: 'NTP_SERVER', value: 'pool.ntp.org' },
        { orgId: org.id, key: 'TIMEZONE', value: 'America/Sao_Paulo' },
        { orgId: org.id, key: 'ORG_NOME', value: body.orgName },
        { orgId: org.id, key: 'DOMINIO', value: body.orgDominio || '' },
      ],
      skipDuplicates: true,
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash(body.adminPassword, 10);
    const admin = await app.prisma.user.create({
      data: {
        email: body.adminEmail.toLowerCase(),
        password: hashedPassword,
        displayName: body.adminName,
        roles: {
          create: {
            role: 'admin_gap',
          },
        },
      },
      include: { roles: true },
    });

    // Create core scripts (8 official)
    const coreScripts = [
      {
        id: 'core-001',
        nome: 'Setup Inicial',
        descricao: 'Configuração inicial do sistema',
        categoria: 'core',
        conteudo: `#!/bin/bash
# Core Script: Setup Inicial
# Variáveis: {{DOMINIO}}, {{DC_IP}}, {{ORGANIZACAO}}

source /etc/{{ORGANIZACAO}}.conf

echo "Configurando sistema para $ORGANIZACAO..."
echo "Domínio: $DOMINIO"
echo "DC: $DC_IP"

# Configura hostname
hostnamectl set-hostname "$HOSTNAME"

# Configura DNS
echo "nameserver $DNS_PRIMARIO" > /etc/resolv.conf

echo "Setup inicial concluído."
`,
        variaveisUsadas: ['DOMINIO', 'DC_IP', 'ORGANIZACAO'],
        autor: 'SeederLinux',
        oficial: true,
        status: 'pronto',
      },
      {
        id: 'core-002',
        nome: 'Join AD',
        descricao: 'Adiciona estação ao Active Directory',
        categoria: 'core',
        conteudo: `#!/bin/bash
# Core Script: Join AD
source /etc/{{ORGANIZACAO}}.conf

echo "Ingressando no domínio $DOMINIO..."

# Install SSSD
apt-get update && apt-get install -y sssd sssd-tools libnss-sss libpam-sss

# Configure SSSD
cat > /etc/sssd/sssd.conf <<EOF
[sssd]
config_file_version = 2
services = nss, pam
domains = $DOMINIO

[domain/$DOMINIO]
id_provider = ad
ad_server = $DC_HOSTNAME.$DOMINIO
ad_domain = $DOMINIO
ldap_id_use_start_tls = true
cache_credentials = true
EOF

chmod 600 /etc/sssd/sssd.conf
systemctl enable sssd
systemctl start sssd

echo "Join AD concluído."
`,
        variaveisUsadas: ['DOMINIO', 'DC_HOSTNAME', 'ORGANIZACAO'],
        autor: 'SeederLinux',
        oficial: true,
        status: 'pronto',
      },
      {
        id: 'core-003',
        nome: 'Configurar Proxy',
        descricao: 'Configura proxy do sistema',
        categoria: 'rede',
        conteudo: `#!/bin/bash
# Core Script: Configurar Proxy
source /etc/{{ORGANIZACAO}}.conf

if [ -n "$PROXY" ]; then
  echo "Configurando proxy: $PROXY"

  # APT proxy
  echo "Acquire::http::Proxy \\"http://$PROXY\\";" > /etc/apt/apt.conf.d/99proxy
  echo "Acquire::https::Proxy \\"https://$PROXY\\";" >> /etc/apt/apt.conf.d/99proxy

  # Environment
  echo "export http_proxy=http://$PROXY" >> /etc/environment
  echo "export https_proxy=https://$PROXY" >> /etc/environment

  echo "Proxy configurado."
else
  echo "Nenhum proxy configurado."
fi
`,
        variaveisUsadas: ['PROXY', 'ORGANIZACAO'],
        autor: 'SeederLinux',
        oficial: true,
        status: 'pronto',
      },
      {
        id: 'core-004',
        nome: 'Configurar NTP',
        descricao: 'Sincroniza relógio com servidor NTP',
        categoria: 'sistema',
        conteudo: `#!/bin/bash
# Core Script: Configurar NTP
source /etc/{{ORGANIZACAO}}.conf

echo "Configurando NTP: $NTP_SERVER"

apt-get install -y systemd-timesyncd

cat > /etc/systemd/timesyncd.conf <<EOF
[Time]
NTP=$NTP_SERVER
FallbackNTP=pool.ntp.org
EOF

systemctl restart systemd-timesyncd
timedatectl set-timezone "$TIMEZONE"

echo "NTP configurado."
`,
        variaveisUsadas: ['NTP_SERVER', 'TIMEZONE', 'ORGANIZACAO'],
        autor: 'SeederLinux',
        oficial: true,
        status: 'pronto',
      },
      {
        id: 'core-005',
        nome: 'Aplicar Branding',
        descricao: 'Aplica壁纸, tema e logo da organização',
        categoria: 'desktop',
        conteudo: `#!/bin/bash
# Core Script: Aplicar Branding
source /etc/{{ORGANIZACAO}}.conf

echo "Aplicando identidade visual..."

# Wallpaper (se disponível)
if [ -n "$WALLPAPER_URL" ]; then
  wget -O /usr/share/backgrounds/org-wallpaper.png "$WALLPAPER_URL"
  gsettings set org.gnome.desktop.background picture-uri "file:///usr/share/backgrounds/org-wallpaper.png"
fi

# Tema GTK
if [ -n "$THEME" ]; then
  gsettings set org.gnome.desktop.interface gtk-theme "$THEME"
fi

echo "Branding aplicado."
`,
        variaveisUsadas: ['ORGANIZACAO', 'WALLPAPER_URL', 'THEME'],
        autor: 'SeederLinux',
        oficial: true,
        status: 'pronto',
      },
      {
        id: 'core-006',
        nome: 'Instalar Pacotes Base',
        descricao: 'Instala pacotes essenciais',
        categoria: 'sistema',
        conteudo: `#!/bin/bash
# Core Script: Instalar Pacotes Base

echo "Instalando pacotes base..."

apt-get update
apt-get install -y \\
  vim \\
  htop \\
  curl \\
  wget \\
  git \\
  net-tools \\
  dnsutils \\
  tree \\
  zip unzip \\
  fonts-liberation \\
  fonts-noto

echo "Pacotes base instalados."
`,
        variaveisUsadas: [],
        autor: 'SeederLinux',
        oficial: true,
        status: 'pronto',
      },
      {
        id: 'core-007',
        nome: 'Hardening SSH',
        descricao: 'Configura SSH de forma segura',
        categoria: 'seguranca',
        conteudo: `#!/bin/bash
# Core Script: Hardening SSH

echo "Aplicando hardening SSH..."

# Backup
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# Configurações de segurança
sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config
sed -i 's/#MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config

systemctl restart sshd

echo "SSH hardened."
`,
        variaveisUsadas: [],
        autor: 'SeederLinux',
        oficial: true,
        status: 'pronto',
      },
      {
        id: 'core-008',
        nome: 'Configurar Firewall',
        descricao: 'Configura UFW com regras básicas',
        categoria: 'seguranca',
        conteudo: `#!/bin/bash
# Core Script: Configurar Firewall

echo "Configurando firewall..."

apt-get install -y ufw

# Regras padrão
ufw default deny incoming
ufw default allow outgoing

# Permitir SSH
ufw allow 22/tcp

# Permitir serviços locais
ufw allow from 127.0.0.1

ufw --force enable

echo "Firewall configurado."
`,
        variaveisUsadas: [],
        autor: 'SeederLinux',
        oficial: true,
        status: 'pronto',
      },
    ];

    for (const script of coreScripts) {
      await app.prisma.script.create({ data: script as any });
    }

    // Create default profile
    await app.prisma.seederProfile.create({
      data: {
        id: 'profile-default',
        nome: 'Perfil Padrão',
        descricao: 'Scripts essenciais para nova estação',
        scriptIds: ['core-001', 'core-004', 'core-006', 'core-008'],
        publico: true,
      },
    });

    // Create variable catalog entries
    const catalogVars = [
      { key: 'DOMINIO', label: 'Domínio AD', descricao: 'Domínio do Active Directory', tipo: 'string', oficial: true, obrigatoria: true },
      { key: 'DC_IP', label: 'IP do Domain Controller', descricao: 'Endereço IP do controlador de domínio', tipo: 'string', oficial: true, obrigatoria: true },
      { key: 'DC_HOSTNAME', label: 'Hostname do DC', descricao: 'Nome do servidor de domínio', tipo: 'string', oficial: true, obrigatoria: true },
      { key: 'DNS_PRIMARIO', label: 'DNS Primário', descricao: 'Servidor DNS primário', tipo: 'string', oficial: true, obrigatoria: false, default_value: '8.8.8.8' },
      { key: 'DNS_SECUNDARIO', label: 'DNS Secundário', descricao: 'Servidor DNS secundário', tipo: 'string', oficial: true, obrigatoria: false, default_value: '8.8.4.4' },
      { key: 'PROXY', label: 'Servidor Proxy', descricao: 'URL do servidor proxy (opcional)', tipo: 'url', oficial: true, obrigatoria: false },
      { key: 'NTP_SERVER', label: 'Servidor NTP', descricao: 'Servidor de sincronização de tempo', tipo: 'string', oficial: true, obrigatoria: false, default_value: 'pool.ntp.org' },
      { key: 'TIMEZONE', label: 'Fuso Horário', descricao: 'Configuração de fuso horário', tipo: 'string', oficial: true, obrigatoria: false, default_value: 'America/Sao_Paulo' },
      { key: 'WALLPAPER_URL', label: 'URL do Wallpaper', descricao: 'URL da imagem de fundo da organização', tipo: 'url', oficial: false, obrigatoria: false },
      { key: 'THEME', label: 'Tema GTK', descricao: 'Nome do tema visual', tipo: 'string', oficial: false, obrigatoria: false, default_value: 'Mint-Y-Dark' },
    ];

    for (const v of catalogVars) {
      await app.prisma.variableCatalog.create({ data: v as any });
    }

    // Mark setup as completed
    await app.prisma.systemConfig.upsert({
      where: { key: 'setup_completed' },
      update: { value: 'true' },
      create: { key: 'setup_completed', value: 'true' },
    });

    // Audit
    await app.prisma.auditEvent.create({
      data: {
        atorId: admin.id,
        atorEmail: admin.email,
        categoria: 'setup',
        acao: 'complete',
        alvo: body.orgSigla,
        detalhes: `admin: ${admin.email}, org: ${org.nome}`,
      },
    });

    // Generate JWT token for immediate login
    const token = app.jwt.sign({
      userId: admin.id,
      email: admin.email,
      roles: admin.roles.map(r => ({ role: r.role, orgSigla: r.orgSigla })),
    });

    return {
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        roles: admin.roles,
      },
      organization: org,
    };
  });
}
