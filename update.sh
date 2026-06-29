#!/usr/bin/env bash
# =============================================================================
# SeederLinux Updater - Atualização SIMPLES e SEGURA
# Uso: sudo bash update.sh
# =============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[ERRO]${NC} $*"; exit 1; }

echo ""
echo "========================================="
echo "  SeederLinux Updater"
echo "  $(date)"
echo "========================================="
echo ""

# Verifica root
[[ $EUID -ne 0 ]] && error "Execute como root: sudo bash update.sh"

# Vai para o diretório do projeto
cd /opt/seederlinux || error "Diretório /opt/seederlinux não encontrado!"

info "Diretório: $(pwd)"

# 1. FAZ BACKUP DO BANCO
info "Fazendo backup do banco de dados..."
mkdir -p /opt/seederlinux/backups
BACKUP="/opt/seederlinux/backups/backup_$(date +%Y%m%d_%H%M%S).sql"
docker compose exec -T db pg_dump -U postgres seederlinux > "$BACKUP" 2>/dev/null || warn "Backup falhou, continuando..."
info "Backup: $BACKUP"

# 2. PARA OS CONTAINERS (mas mantém os dados)
info "Parando containers..."
docker compose down

# 3. ATUALIZA O CÓDIGO
info "Atualizando código..."
git stash 2>/dev/null || true
git pull origin main

# 4. RECONSTRÓI E SOBE
info "Reconstruindo e subindo containers..."
docker compose up -d --build

# 5. VERIFICA SE SUBIU
info "Aguardando inicialização..."
sleep 15

# 6. MOSTRA STATUS
echo ""
info "=== STATUS ==="
docker compose ps

echo ""
info "=== SETUP TOKEN ==="
grep SETUP_TOKEN .env | cut -d'=' -f2

echo ""
info "✅ Atualização concluída!"
echo "📱 App: https://localhost:3000"
echo "📋 Logs: docker compose logs -f"
