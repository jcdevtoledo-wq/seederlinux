#!/usr/bin/env bash
# =============================================================================
# SeederLinux Installer v5.1 - Nova Arquitetura (Fastify + Prisma)
# Porta da API: 8000
# Uso: sudo bash install.sh [--domain meu.dominio.com.br]
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
info() { printf "${GREEN}[seeder]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[aviso]${NC} %s\n" "$*"; }
error() { printf "${RED}[erro]${NC} %s\n" "$*" >&2; }

DEBUG_LOG="/tmp/seeder-install.log"
exec > >(tee -a "$DEBUG_LOG") 2>&1

# ---------- ARGUMENTOS ----------
DOMAIN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    *) shift ;;
  esac
done

echo ""
info "========================================="
info "  SeederLinux Installer v5.1"
info "  Nova Arquitetura: Fastify + Prisma"
info "  Porta API: 8000"
info "  $(date)"
info "========================================="
echo ""

[[ $EUID -ne 0 ]] && { error "Execute como root: sudo bash install.sh"; exit 1; }
info "✅ Root confirmado"

# ---------- DETECTA IP ----------
detect_ip() {
    local ip
    ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K[\d.]+' | head -1)
    if [[ -z "$ip" ]]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    if [[ -z "$ip" ]]; then
        ip="localhost"
    fi
    echo "$ip"
}

SERVER_IP=$(detect_ip)
info "IP detectado: $SERVER_IP"

# Define URLs baseado no IP ou domínio
if [[ -n "$DOMAIN" ]]; then
    PUBLIC_API_URL="https://${DOMAIN}/api"
    PUBLIC_APP_URL="https://${DOMAIN}"
else
    PUBLIC_API_URL="http://${SERVER_IP}:8000"
    PUBLIC_APP_URL="http://${SERVER_IP}:3000"
fi

info "URL API: $PUBLIC_API_URL"
info "URL App: $PUBLIC_APP_URL"

# ---------- SISTEMA ----------
if [[ -r /etc/os-release ]]; then
    . /etc/os-release
    info "Sistema: $PRETTY_NAME"
fi

# ---------- DEPENDÊNCIAS ----------
info "Instalando dependências..."
apt-get update -qq 2>/dev/null || apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg lsb-release git openssl jq wget procps 2>/dev/null || true
info "✅ Dependências OK"

# ---------- DOCKER ----------
if ! command -v docker &>/dev/null || ! docker info &>/dev/null 2>&1; then
    info "Instalando Docker..."
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl start docker && systemctl enable docker
    info "✅ Docker: $(docker --version)"
else
    info "✅ Docker: $(docker --version)"
fi

# ---------- PROJETO ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/docker-compose.yml" ]]; then
    PROJECT_DIR="$SCRIPT_DIR"
else
    PROJECT_DIR="/opt/seederlinux"
    if [[ ! -d "$PROJECT_DIR" ]]; then
        info "Clonando repositório..."
        git clone https://github.com/jcdevtoledo-wq/seederlinux.git "$PROJECT_DIR"
    fi
fi

cd "$PROJECT_DIR"
info "Projeto: $PROJECT_DIR"

# ---------- GERA .ENV ----------
ENV_FILE="$PROJECT_DIR/.env"
[[ -f "$ENV_FILE" ]] && rm -f "$ENV_FILE"

info "Gerando .env para nova arquitetura..."

# Gerar segredos aleatórios
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c32)
JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c64)
SETUP_TOKEN=$(openssl rand -hex 32)

cat > "$ENV_FILE" <<EOF
# SeederLinux .env — Gerado automaticamente em $(date -Iseconds)
# Servidor: ${SERVER_IP}
# Arquitetura: Fastify + Prisma + PostgreSQL (3 containers)

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/seederlinux?schema=public
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# JWT Authentication
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# Setup Token (first-time setup wizard)
SETUP_TOKEN=${SETUP_TOKEN}

# Server Ports
PORT=8000
NODE_ENV=production

# Public URLs (for frontend)
VITE_API_URL=${PUBLIC_API_URL}
VITE_SEEDER_MODE=full
EOF

chmod 600 "$ENV_FILE"
info "✅ .env gerado com IP: $SERVER_IP"

# ---------- LIMPA ----------
info "Limpando deploy anterior..."
docker compose down -v 2>/dev/null || true
docker volume rm seederlinux_db_data 2>/dev/null || true

# ---------- SOBE BANCO PRIMEIRO ----------
info "Iniciando banco de dados..."
docker compose up -d db
echo "Aguardando banco iniciar..."
for i in {1..30}; do
    if docker compose exec -T db pg_isready -U postgres -d seederlinux 2>/dev/null; then
        info "✅ Banco de dados pronto"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# ---------- GERA PRISMA CLIENT ----------
info "Gerando Prisma Client..."
if command -v npx &>/dev/null; then
    npx prisma generate 2>/dev/null || warn "Prisma generate falhou (continuando...)"
fi

# ---------- SOBE TUDO ----------
info "Iniciando todos os serviços..."
docker compose up -d --build

# ---------- AGUARDA ----------
info "Aguardando inicialização (60s)..."
sleep 60

# ---------- VERIFICA SAÚDE ----------
info "Verificando saúde dos serviços..."

check_health() {
    local service=$1
    local container
    container=$(docker compose ps -q "$service" 2>/dev/null | head -1)
    if [[ -n "$container" ]]; then
        local status
        status=$(docker inspect "$container" --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        echo "$service: $status"
    fi
}

# ---------- STATUS ----------
echo ""
info "=== STATUS DOS CONTAINERS ==="
docker compose ps

echo ""
info "=== SAÚDE DOS SERVIÇOS ==="
check_health db
check_health api
check_health app

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        🚀  SeederLinux Instalado!  🚀                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  📱 App:       ${PUBLIC_APP_URL}"
echo "  🔧 Setup:     ${PUBLIC_APP_URL}/setup"
echo "  🔌 API:       ${PUBLIC_API_URL}/health"
echo ""
echo "  🔐 Setup Token: ${SETUP_TOKEN}"
echo ""
echo "  📋 Logs:   docker compose logs -f"
echo "  📋 Status: docker compose ps"
echo ""
echo "  🗄️  Banco:   postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/seederlinux"
echo ""
echo "  ⚠️  IMPORTANTE: Anote o Setup Token acima!"
echo "     Ele será necessário na primeira configuração."
echo ""
if [[ -n "$DOMAIN" ]]; then
    echo "  🌐 Domínio configurado: ${DOMAIN}"
else
    echo "  💡 Use --domain para HTTPS: sudo bash install.sh --domain meudominio.com.br"
fi
echo ""