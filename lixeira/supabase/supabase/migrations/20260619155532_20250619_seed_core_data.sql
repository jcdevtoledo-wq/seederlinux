-- Seed variable_catalog with official variables
INSERT INTO variable_catalog (key, label, descricao, tipo, escopo, oficial, obrigatoria, exemplo, default_value)
VALUES
  -- Diretório
  ('DOMINIO', 'Domínio AD', 'FQDN do domínio Active Directory.', 'string', 'diretorio', true, true, 'comara.intraer', NULL),
  ('DOMINIO_NETBIOS', 'NetBIOS', 'Nome curto NetBIOS do domínio.', 'string', 'diretorio', true, true, 'COMARA', NULL),
  ('DC_HOSTNAME', 'Hostname do DC', 'Hostname do controlador de domínio principal.', 'string', 'diretorio', true, true, 'dc-comara', NULL),
  ('DC_IP', 'IP do DC', 'IP do controlador de domínio.', 'ip', 'diretorio', true, true, NULL, NULL),
  ('METODO_AD', 'Método AD', 'Backend de integração: sssd, winbind ou auto.', 'string', 'diretorio', true, true, NULL, 'auto'),
  -- Rede
  ('DNS_PRIMARIO', 'DNS primário', 'Servidor DNS primário.', 'ip', 'rede', true, true, NULL, NULL),
  ('DNS_SECUNDARIO', 'DNS secundário', 'Servidor DNS secundário.', 'ip', 'rede', true, false, NULL, NULL),
  ('PROXY_HTTP', 'Proxy HTTP', 'Endereço do proxy corporativo.', 'string', 'rede', true, false, NULL, NULL),
  ('PROXY_PORTA', 'Porta do proxy', 'Porta do proxy corporativo.', 'porta', 'rede', true, false, NULL, '8080'),
  ('NTP', 'Servidor NTP', 'Servidor de sincronia de tempo.', 'string', 'rede', true, false, NULL, NULL),
  -- Serviços
  ('SERVIDOR_ARQUIVOS', 'Servidor SMB', 'Servidor de arquivos para montagens CIFS.', 'string', 'servicos', true, false, NULL, NULL),
  ('SERVIDOR_OCS', 'URL OCS Inventory', 'Endpoint do OCS Inventory NG.', 'url', 'servicos', true, false, NULL, NULL),
  ('TAG_OCS', 'Tag OCS', 'Tag usada na identificação do agente OCS.', 'string', 'servicos', true, false, NULL, NULL),
  ('SERVIDOR_VNC', 'Servidor VNC', 'Servidor de acesso remoto VNC.', 'string', 'servicos', true, false, NULL, NULL),
  -- Identidade
  ('SIGLA', 'Sigla da OM', 'Sigla curta da organização.', 'string', 'identidade', true, true, NULL, NULL),
  ('HOMEPAGE', 'Homepage padrão', 'URL da homepage institucional.', 'url', 'identidade', true, true, NULL, NULL),
  -- Personalização
  ('WALLPAPER_URL', 'Wallpaper', 'URL/caminho do wallpaper institucional.', 'string', 'personalizacao', true, false, NULL, NULL),
  ('TEMA_GTK', 'Tema GTK', 'Nome do tema visual padrão.', 'string', 'personalizacao', true, false, NULL, 'Mint-Y-Dark')
ON CONFLICT (key) DO NOTHING;

-- Seed scripts
INSERT INTO scripts (id, nome, categoria, descricao, conteudo, autor, versao, status, oficial, compatibilidade, variaveis_usadas, atualizado_em, criado_em)
VALUES
  (
    's-ingresso',
    'ingressar_dominio.sh',
    'ingresso',
    'Orquestrador oficial — detecta ambiente, configura backend AD e ingressa a estação no domínio.',
    '#!/usr/bin/env bash
# ingressar_dominio.sh — Orquestrador oficial de ingresso AD
# SeederLinux • Script base imutável; parametrizado pela OM via /opt/softwarelivre/etc/<sigla>.conf
set -euo pipefail

# Carrega variáveis da OM (DOMINIO, DC_HOSTNAME, DC_IP, METODO_AD, ...)
source /opt/softwarelivre/etc/${ORG:-om}.conf
source /opt/softwarelivre/lib/comum.sh
source /opt/softwarelivre/lib/detectar_ambiente.sh

log "[${SIGLA}] Iniciando ingresso no domínio ${DOMINIO} via ${METODO_AD}"

# Configura DNS antes do realm discover
echo "nameserver ${DNS_PRIMARIO}" | sudo tee /etc/resolv.conf >/dev/null
[[ -n "${DNS_SECUNDARIO:-}" ]] && echo "nameserver ${DNS_SECUNDARIO}" | sudo tee -a /etc/resolv.conf >/dev/null

if [[ "${METODO_AD}" == "sssd" || "${METODO_AD}" == "auto" ]]; then
  source /opt/softwarelivre/lib/backend_sssd.sh
  configurar_sssd
else
  source /opt/softwarelivre/lib/backend_winbind.sh
  configurar_winbind
fi

realm discover "${DOMINIO}"
realm join -U administrador "${DOMINIO}"
log "[${SIGLA}] Ingresso concluído com sucesso."',
    'DASTI',
    '2.4.1',
    'validado',
    true,
    ARRAY['ubuntu', 'linuxmint', 'debian'],
    ARRAY['DOMINIO', 'DC_HOSTNAME', 'DC_IP', 'METODO_AD', 'DNS_PRIMARIO', 'DNS_SECUNDARIO', 'SIGLA'],
    '2025-03-31',
    '2025-03-31'
  ),
  (
    's-personalizar',
    'personalizar_estacao.sh',
    'personalizacao',
    'Aplica wallpaper, tema, homepage e identidade visual da OM.',
    '#!/usr/bin/env bash
# personalizar_estacao.sh — Aplica identidade visual da OM
set -euo pipefail
source /opt/softwarelivre/etc/${ORG:-om}.conf

log "[${SIGLA}] Aplicando wallpaper: ${WALLPAPER_URL:-padrão}"
gsettings set org.cinnamon.desktop.background picture-uri "file://${WALLPAPER_URL}" || true
gsettings set org.cinnamon.desktop.interface gtk-theme "${TEMA_GTK:-Mint-Y-Dark}" || true

# Homepage padrão para Firefox/Chromium
mkdir -p /etc/firefox/policies
cat > /etc/firefox/policies/policies.json <<EOF
{ "policies": { "Homepage": { "URL": "${HOMEPAGE}", "Locked": true } } }
EOF',
    'DASTI',
    '1.8.0',
    'validado',
    true,
    ARRAY['ubuntu', 'linuxmint', 'debian', 'zorin'],
    ARRAY['WALLPAPER_URL', 'TEMA_GTK', 'HOMEPAGE', 'SIGLA'],
    '2025-03-31',
    '2025-03-31'
  ),
  (
    's-logon',
    'logon.sh',
    'logon',
    'Executado pelo display manager no login. Verifica serial e monta SMB.',
    '#!/usr/bin/env bash
# logon.sh — Rotinas de sessão (login PAM)
source /opt/softwarelivre/etc/${ORG:-om}.conf

/opt/softwarelivre/bin/verifica_serial.sh || true
[[ -n "${SERVIDOR_ARQUIVOS:-}" ]] && mount -a -t cifs 2>/dev/null || true
sudo -u "${USER}" /opt/softwarelivre/user/kixtart.sh',
    'DASTI',
    '1.3.2',
    'publicado',
    true,
    ARRAY['ubuntu', 'linuxmint'],
    ARRAY['SERVIDOR_ARQUIVOS'],
    '2025-03-31',
    '2025-03-31'
  ),
  (
    's-logoff',
    'logoff.sh',
    'logoff',
    'Limpeza de sessão, remoção de temporários e atalhos.',
    '#!/usr/bin/env bash
# logoff.sh — Higienização ao final da sessão
source /opt/softwarelivre/etc/${ORG:-om}.conf
rm -rf /tmp/sess_* || true',
    'DASTI',
    '1.1.0',
    'publicado',
    true,
    ARRAY['ubuntu', 'linuxmint'],
    ARRAY[]::text[],
    '2025-02-15',
    '2025-02-15'
  ),
  (
    's-senha',
    'trocar_senha.sh',
    'senha',
    'Interface Zenity para troca de senha de domínio AD.',
    '#!/usr/bin/env bash
# trocar_senha.sh — Interface Zenity para troca de senha AD
source /opt/softwarelivre/etc/${ORG:-om}.conf

NOVA=$(zenity --password --title "Trocar senha de ${USER} (${DOMINIO})")
[[ -z "${NOVA}" ]] && exit 1
echo "${NOVA}" | smbpasswd -s -U "${USER}" -r "${DC_HOSTNAME}"
zenity --info --text "Senha alterada com sucesso em ${DOMINIO}."',
    'DASTI',
    '1.0.4',
    'validado',
    true,
    ARRAY['ubuntu', 'linuxmint', 'debian'],
    ARRAY['DOMINIO', 'DC_HOSTNAME'],
    '2025-03-31',
    '2025-03-31'
  ),
  (
    's-impressoras',
    'instalar_impressoras.sh',
    'impressoras',
    'Cadastra filas CUPS apontando para o servidor SMB da OM.',
    '#!/usr/bin/env bash
# instalar_impressoras.sh — Cadastra filas CUPS apontando para o servidor SMB
set -euo pipefail
source /opt/softwarelivre/etc/${ORG:-om}.conf

[[ -z "${SERVIDOR_ARQUIVOS:-}" ]] && { echo "SERVIDOR_ARQUIVOS não definido"; exit 1; }
lpadmin -p fila_segura -E -v "smb://${SERVIDOR_ARQUIVOS}/print$/fila_segura"
lpadmin -d fila_segura',
    'GAPBE-TI',
    '1.2.0',
    'validado',
    true,
    ARRAY['ubuntu', 'linuxmint', 'debian'],
    ARRAY['SERVIDOR_ARQUIVOS'],
    '2025-02-15',
    '2025-02-15'
  ),
  (
    's-legados',
    'instalar_legados.sh',
    'legados',
    'Instala Firefox ESR, Java 8 e dependências de sistemas SIGADAER.',
    '#!/usr/bin/env bash
# instalar_legados.sh — Compatibilidade com sistemas legados (SIGADAER etc.)
set -euo pipefail
source /opt/softwarelivre/etc/${ORG:-om}.conf

apt-get update
apt-get install -y openjdk-8-jre firefox-esr',
    'DASTI',
    '0.9.1',
    'rascunho',
    true,
    ARRAY['ubuntu', 'linuxmint'],
    ARRAY[]::text[],
    '2024-11-20',
    '2024-11-20'
  ),
  (
    's-inventario',
    'ocs_inventario.sh',
    'inventario',
    'Configura agente OCS Inventory NG apontando para o servidor da OM.',
    '#!/usr/bin/env bash
# ocs_inventario.sh — Configura agente OCS Inventory NG
set -euo pipefail
source /opt/softwarelivre/etc/${ORG:-om}.conf

[[ -z "${SERVIDOR_OCS:-}" ]] && { echo "SERVIDOR_OCS não definido"; exit 0; }
sed -i "s|server=.*|server=${SERVIDOR_OCS}|" /etc/ocsinventory/ocsinventory-agent.cfg
sed -i "s|tag=.*|tag=${TAG_OCS:-GENERIC}|" /etc/ocsinventory/ocsinventory-agent.cfg
systemctl restart ocsinventory-agent',
    'DCTA-TI',
    '1.0.0',
    'validado',
    true,
    ARRAY['ubuntu', 'linuxmint', 'debian', 'rocky', 'almalinux'],
    ARRAY['SERVIDOR_OCS', 'TAG_OCS'],
    '2024-11-20',
    '2024-11-20'
  )
ON CONFLICT (id) DO NOTHING;

-- Seed profiles_seeder
INSERT INTO profiles_seeder (id, nome, descricao, script_ids, organizacao_origem, publico, criado_em)
VALUES
  (
    'p-padrao-gap',
    'GAP padrão (Mint + Cinnamon)',
    'Perfil completo para estações administrativas em Linux Mint Cinnamon.',
    ARRAY['s-ingresso', 's-personalizar', 's-logon', 's-logoff', 's-senha', 's-impressoras'],
    'comara',
    true,
    '2025-01-10'
  ),
  (
    'p-laboratorio',
    'Laboratório técnico (Ubuntu GNOME)',
    'Estações de laboratório com sistemas legados habilitados.',
    ARRAY['s-ingresso', 's-personalizar', 's-legados', 's-inventario'],
    'comara',
    false,
    '2025-02-04'
  ),
  (
    'p-dcta-rocky',
    'DCTA — Rocky Linux KDE',
    'Estações de pesquisa em Rocky Linux com KDE Plasma.',
    ARRAY['s-ingresso', 's-inventario'],
    'dcta',
    false,
    '2024-12-01'
  )
ON CONFLICT (id) DO NOTHING;