#!/usr/bin/env bash
# =============================================================================
# SeederLinux Updater v5.1 - Atualiza e reinicia a aplicação
# Uso: sudo bash update.sh [--domain meu.dominio.com.br]
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
info() { printf "${GREEN}[seeder]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[aviso]${NC} %s\n" "$*"; }
error() { printf "${RED}[erro]${NC} %s\n" "$*" >&2; }

DEBUG_LOG="/tmp/seeder-update.log"
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
info "  SeederLinux Updater v5.1"
info "  Atualização e reinício da aplicação"
info "  $(date)"
info "========================================="
echo ""

[[ $EUID -ne 0 ]] && { error "Execute como root: sudo bash update.sh"; exit 1; }
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

# ---------- LOCALIZA PROJETO ----------
find_project_dir() {
    if [[ -f "docker-compose.yml" ]] && [[ -f ".env" ]]; then
        echo "$(pwd)"
        return 0
    fi
    
    if [[ -f "/opt/seederlinux/docker-compose.yml" ]] && [[ -f "/opt/seederlinux/.env" ]]; then
        echo "/opt/seederlinux"
        return 0
    fi
    
    for dir in "/opt/seederlinux" "$HOME/seederlinux" "/root/seederlinux" "/usr/local/seederlinux"; do
        if [[ -f "$dir/docker-compose.yml" ]] && [[ -f "$dir/.env" ]]; then
            echo "$dir"
            return 0
        fi
    done
    
    error "Projeto SeederLinux não encontrado!"
    exit 1
}

PROJECT_DIR=$(find_project_dir)
cd "$PROJECT_DIR"
info "📂 Projeto encontrado: $PROJECT_DIR"

# ---------- VERIFICA ENV ----------
if [[ ! -f ".env" ]]; then
    error "Arquivo .env não encontrado!"
    exit 1
fi

# ---------- LÊ CONFIGURAÇÕES ATUAIS ----------
source .env
info "🔐 Setup Token atual: ${SETUP_TOKEN:-'NÃO DEFINIDO'}"

# ---------- VERIFICA STATUS DO SETUP ----------
check_setup_status() {
    info "🔍 Verificando status do Setup..."
    
    # Verifica se a API está rodando
    if docker compose ps -q api 2>/dev/null | grep -q .; then
        # Tenta consultar o status via API
        local status_response
        status_response=$(curl -sk "https://localhost:8000/api/setup/status" 2>/dev/null || echo "{}")
        
        # Verifica se o setup já foi concluído
        local is_configured
        is_configured=$(echo "$status_response" | grep -o '"configured":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        
        if [[ "$is_configured" == "true" ]]; then
            echo "  ✅ Setup: CONCLUÍDO"
            echo "  📅 Data: $(echo "$status_response" | grep -o '"configuredAt":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo 'N/A')"
        elif [[ "$is_configured" == "false" ]]; then
            echo "  ⏳ Setup: PENDENTE"
            echo "  🔑 Token: ${SETUP_TOKEN}"
            echo "  🔗 URL: ${VITE_API_URL:-https://localhost:3000}/setup"
        else
            echo "  ❓ Status: INDETERMINADO (API não respondeu)"
        fi
    else
        warn "  ⚠️  API não está rodando para verificar status"
    fi
}

# ---------- BACKUP DOS DADOS ----------
info "📦 Criando backup do banco de dados..."
BACKUP_DIR="/opt/seederlinux/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/seeder_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

if docker compose ps -q db 2>/dev/null | grep -q .; then
    docker compose exec -T db pg_dump -U postgres seederlinux 2>/dev/null | gzip > "$BACKUP_FILE"
    if [[ $? -eq 0 ]]; then
        info "✅ Backup criado: $BACKUP_FILE"
    else
        warn "⚠️  Falha ao criar backup (continuando...)"
    fi
else
    warn "⚠️  Banco não está rodando, pulando backup"
fi

# ---------- LIMPA CONTAINERS ANTIGOS ----------
info "🧹 Parando e removendo containers antigos..."
docker compose down

# ---------- GIT PULL ----------
info "🔄 Atualizando código do repositório..."

if ! git diff --quiet; then
    warn "⚠️  Alterações locais detectadas. Salvando stash..."
    git stash save "backup_antes_update_$(date +%Y%m%d)"
fi

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
info "Branch atual: $CURRENT_BRANCH"

if git pull origin "$CURRENT_BRANCH" --rebase; then
    info "✅ Código atualizado com sucesso"
else
    error "❌ Falha ao fazer git pull"
    exit 1
fi

# ---------- VERIFICA MUDANÇAS NO SCHEMA ----------
info "🔍 Verificando mudanças no Prisma schema..."

if git diff HEAD@{1} --name-only | grep -q "prisma/schema.prisma"; then
    info "📊 Mudanças detectadas no schema do banco de dados"
    SCHEMA_CHANGED=true
else
    SCHEMA_CHANGED=false
fi

# ---------- GERA PRISMA CLIENT ----------
info "⚙️  Gerando Prisma Client..."
if command -v npx &>/dev/null; then
    npx prisma generate 2>/dev/null || warn "Prisma generate falhou (continuando...)"
fi

# ---------- REMOVE IMAGENS ANTIGAS (opcional) ----------
if [[ "$1" == "--clean" ]] || [[ "$2" == "--clean" ]] || [[ "$3" == "--clean" ]]; then
    info "🧹 Removendo imagens antigas..."
    docker image prune -f
fi

# ---------- SOBE OS SERVIÇOS ----------
info "🚀 Iniciando serviços atualizados..."
docker compose up -d --build

# ---------- VERIFICA SAÚDE ----------
info "⏳ Aguardando inicialização (30s)..."
sleep 30

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

# ---------- CARREGA .ENV ATUALIZADO ----------
source .env

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
info "=== STATUS DO SETUP ==="
check_setup_status

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        🔄  SeederLinux Atualizado!  🔄                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  📱 App:       ${VITE_API_URL:-https://localhost:3000}"
echo "  🔧 Setup:     ${VITE_API_URL:-https://localhost:3000}/setup"
echo "  🔌 API:       ${VITE_API_URL:-https://localhost:3000}/health"
echo ""
echo "  🔐 SETUP TOKEN: ${SETUP_TOKEN}"
echo "  📋 Status:     $(check_setup_status | grep 'Setup:' | head -1)"
echo ""
echo "  🗄️  Backup:   $BACKUP_FILE"
echo "  📋 Logs:      docker compose logs -f"
echo "  📋 Status:    docker compose ps"
echo ""
if [[ "$SCHEMA_CHANGED" == true ]]; then
    echo "  ⚠️  ATENÇÃO: Schema do banco foi modificado!"
    echo "     Execute migrações se necessário:"
    echo "     docker compose exec api npx prisma migrate deploy"
fi
echo ""
echo "  🔄 Para reverter para versão anterior:"
echo "     git checkout HEAD@{1}"
echo "     docker compose up -d --build"
echo ""

# ---------- LIMPEZA DE BACKUPS ANTIGOS ----------
if [[ -d "$BACKUP_DIR" ]]; then
    cd "$BACKUP_DIR"
    ls -t *.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    info "🧹 Mantidos os 10 backups mais recentes"
fi

info "✅ Atualização concluída em $(date)"
