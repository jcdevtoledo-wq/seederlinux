#!/usr/bin/env bash
# =============================================================================
# SeederLinux Backup Manager - Gerencia backups do banco de dados
# Uso: sudo bash backup.sh [--restore ARQUIVO] [--list]
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info() { printf "${GREEN}[backup]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[aviso]${NC} %s\n" "$*"; }
error() { printf "${RED}[erro]${NC} %s\n" "$*" >&2; }

BACKUP_DIR="/opt/seederlinux/backups"
PROJECT_DIR="/opt/seederlinux"

# ---------- ARGUMENTOS ----------
ACTION="create"
RESTORE_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --restore) ACTION="restore"; RESTORE_FILE="$2"; shift 2 ;;
    --list) ACTION="list"; shift ;;
    --help) ACTION="help"; shift ;;
    *) shift ;;
  esac
done

mkdir -p "$BACKUP_DIR"

# ---------- HELP ----------
if [[ "$ACTION" == "help" ]]; then
    echo "Uso: $0 [--restore ARQUIVO] [--list]"
    echo ""
    echo "  --restore ARQUIVO  Restaura backup específico"
    echo "  --list             Lista todos os backups disponíveis"
    echo "  (sem argumentos)   Cria novo backup"
    exit 0
fi

# ---------- LIST ----------
if [[ "$ACTION" == "list" ]]; then
    info "📋 Backups disponíveis:"
    echo ""
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}' || echo "Nenhum backup encontrado"
    exit 0
fi

# ---------- RESTORE ----------
if [[ "$ACTION" == "restore" ]]; then
    if [[ -z "$RESTORE_FILE" ]]; then
        error "Especifique o arquivo de backup: --restore arquivo.sql.gz"
        exit 1
    fi
    
    if [[ ! -f "$RESTORE_FILE" ]]; then
        error "Arquivo não encontrado: $RESTORE_FILE"
        exit 1
    fi
    
    info "🔄 Restaurando backup: $RESTORE_FILE"
    
    cd "$PROJECT_DIR"
    
    # Para o banco
    docker compose down db
    
    # Remove volume antigo
    docker volume rm seederlinux_db_data 2>/dev/null || true
    
    # Sobe banco vazio
    docker compose up -d db
    
    # Aguarda iniciar
    sleep 10
    
    # Restaura
    gunzip -c "$RESTORE_FILE" | docker compose exec -T db psql -U postgres seederlinux
    
    info "✅ Backup restaurado com sucesso!"
    docker compose restart api
    exit 0
fi

# ---------- CREATE BACKUP ----------
info "📦 Criando backup do banco de dados..."

cd "$PROJECT_DIR"
BACKUP_FILE="$BACKUP_DIR/seeder_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

if docker compose ps -q db 2>/dev/null | grep -q .; then
    docker compose exec -T db pg_dump -U postgres seederlinux 2>/dev/null | gzip > "$BACKUP_FILE"
    if [[ $? -eq 0 ]]; then
        info "✅ Backup criado: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
    else
        error "❌ Falha ao criar backup"
        exit 1
    fi
else
    error "❌ Banco não está rodando"
    exit 1
fi

# Limpa backups antigos (mantém 10)
cd "$BACKUP_DIR"
ls -t *.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
info "🧹 Mantidos os 10 backups mais recentes"
