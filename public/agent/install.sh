#!/usr/bin/env bash
# =============================================================================
# SeederLinux Installer — instala dependências (curl, jq), baixa o agente,
# escreve /etc/seederlinux/agent.env e configura o systemd timer.
#
# Uso (one-liner):
#   curl -fsSL https://<HOST>/agent/install.sh | sudo bash -s -- \
#     --url https://<HOST> --token <TOKEN_DA_ESTACAO>
#
# Variáveis de ambiente equivalentes:
#   SEEDER_URL=...  SEEDER_TOKEN=...  bash install.sh
# =============================================================================
set -euo pipefail

SEEDER_URL="${SEEDER_URL:-}"
SEEDER_TOKEN="${SEEDER_TOKEN:-}"
INTERVAL_MIN="${SEEDER_INTERVAL_MIN:-15}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)      SEEDER_URL="$2"; shift 2 ;;
    --token)    SEEDER_TOKEN="$2"; shift 2 ;;
    --interval) INTERVAL_MIN="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "Argumento desconhecido: $1" >&2; exit 1 ;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "Este instalador precisa ser executado como root (use sudo)." >&2
  exit 1
fi

[[ -n "$SEEDER_URL"   ]] || { echo "Faltou --url <https://painel>"; exit 1; }
[[ -n "$SEEDER_TOKEN" ]] || { echo "Faltou --token <TOKEN_DA_ESTACAO>"; exit 1; }

# ---------- Detecta distro e instala dependências ----------
DISTRO_ID="unknown"
if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  DISTRO_ID="${ID:-unknown}"
  DISTRO_LIKE="${ID_LIKE:-}"
fi

install_pkgs() {
  local pkgs=("$@")
  case "$DISTRO_ID" in
    ubuntu|debian|linuxmint|zorin)
      apt-get update -y
      DEBIAN_FRONTEND=noninteractive apt-get install -y "${pkgs[@]}"
      ;;
    rocky|almalinux|rhel|centos|fedora)
      if command -v dnf >/dev/null; then
        dnf install -y "${pkgs[@]}"
      else
        yum install -y "${pkgs[@]}"
      fi
      ;;
    *)
      if [[ "$DISTRO_LIKE" == *debian* ]]; then
        apt-get update -y && DEBIAN_FRONTEND=noninteractive apt-get install -y "${pkgs[@]}"
      elif [[ "$DISTRO_LIKE" == *rhel* || "$DISTRO_LIKE" == *fedora* ]]; then
        (command -v dnf >/dev/null && dnf install -y "${pkgs[@]}") || yum install -y "${pkgs[@]}"
      else
        echo "Distro '$DISTRO_ID' não suportada automaticamente. Instale manualmente: ${pkgs[*]}" >&2
        return 1
      fi
      ;;
  esac
}

NEED=()
command -v curl >/dev/null || NEED+=(curl)
command -v jq   >/dev/null || NEED+=(jq)
command -v ip   >/dev/null || NEED+=(iproute2)
if [[ ${#NEED[@]} -gt 0 ]]; then
  echo "→ Instalando dependências: ${NEED[*]}"
  install_pkgs "${NEED[@]}"
fi

# ---------- Baixa o agente ----------
AGENT_PATH="/usr/local/bin/seederlinux-agent.sh"
echo "→ Baixando agente de $SEEDER_URL/agent/seederlinux-agent.sh"
curl -fsSL "$SEEDER_URL/agent/seederlinux-agent.sh" -o "$AGENT_PATH"
chmod +x "$AGENT_PATH"

# ---------- Configuração ----------
install -d -m 700 /etc/seederlinux
cat >/etc/seederlinux/agent.env <<EOF
SEEDER_URL="$SEEDER_URL"
SEEDER_TOKEN="$SEEDER_TOKEN"
EOF
chmod 600 /etc/seederlinux/agent.env

install -d -m 755 /var/lib/seederlinux /var/lib/seederlinux/scripts /var/lib/seederlinux/runs

# ---------- systemd timer ----------
cat >/etc/systemd/system/seederlinux-agent.service <<EOF
[Unit]
Description=SeederLinux check-in
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=$AGENT_PATH
EOF

cat >/etc/systemd/system/seederlinux-agent.timer <<EOF
[Unit]
Description=Run SeederLinux agent every ${INTERVAL_MIN} min

[Timer]
OnBootSec=2min
OnUnitActiveSec=${INTERVAL_MIN}min
Unit=seederlinux-agent.service
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now seederlinux-agent.timer

echo
echo "→ Executando primeira sincronização…"
"$AGENT_PATH" || {
  echo "⚠ Primeira execução retornou erro — confira /var/log/seederlinux-agent.log" >&2
  exit 1
}

echo
echo "✔ SeederLinux instalado com sucesso."
echo "  Timer: $(systemctl is-active seederlinux-agent.timer) (a cada ${INTERVAL_MIN}m)"
echo "  Logs : journalctl -u seederlinux-agent.service -e"
echo "         tail -f /var/log/seederlinux-agent.log"
