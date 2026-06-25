#!/usr/bin/env bash
# =============================================================================
# SeederLinux - Script de Limpeza Total
# Para TUDO, remove containers, volumes, redes e imagens
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info() { printf "${GREEN}[clean]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[aviso]${NC} %s\n" "$*"; }
error() { printf "${RED}[erro]${NC} %s\n" "$*" >&2; }

echo ""
info "========================================="
info "  Limpando SeederLinux"
info "  $(date)"
info "========================================="
echo ""

[[ $EUID -ne 0 ]] && { error "Execute como root: sudo bash clean.sh"; exit 1; }

# Detecta diretório
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/docker-compose.yml" ]]; then
    PROJECT_DIR="$SCRIPT_DIR"
else
    PROJECT_DIR="/opt/seederlinux"
fi

if [[ -d "$PROJECT_DIR" ]]; then
    cd "$PROJECT_DIR"
    info "Projeto: $PROJECT_DIR"
    
    # 1. Para containers
    info "Parando containers..."
    docker compose down 2>/dev/null || true
    
    # 2. Remove containers, volumes e redes
    info "Removendo volumes e redes..."
    docker compose down -v 2>/dev/null || true
    
    cd ~
else
    warn "Diretório $PROJECT_DIR não encontrado"
fi

# 3. Remove containers órfãos
info "Removendo containers órfãos..."
docker container ls -a | grep -E "seeder|kong|supabase|traefik|postgrest" | awk '{print $1}' | xargs -r docker container rm -f 2>/dev/null || true

# 4. Remove volumes do projeto
info "Removendo volumes..."
docker volume ls | grep -E "seeder|db_data|storage_data|letsencrypt" | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true

# 5. Remove redes
info "Removendo redes..."
docker network ls | grep -E "seeder" | awk '{print $1}' | xargs -r docker network rm 2>/dev/null || true

# 6. Remove imagens (opcional)
echo ""
read -p "Remover imagens Docker também? (s/N): " REMOVE_IMAGES
if [[ "$REMOVE_IMAGES" =~ ^[Ss]$ ]]; then
    info "Removendo imagens..."
    docker images | grep -E "seeder|supabase|kong|traefik|postgrest" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    info "✅ Imagens removidas"
else
    info "Imagens mantidas"
fi

# 7. Limpa cache de build
info "Limpando cache de build..."
docker builder prune -f 2>/dev/null || true

# 8. Limpa sistema
info "Limpando recursos não utilizados..."
docker system prune -f 2>/dev/null || true

# 9. Remove logs
info "Removendo logs..."
rm -f /tmp/seeder-install*.log 2>/dev/null || true

# 10. Volta ao diretório original
cd ~ 2>/dev/null || true

# 11. Status final
echo ""
echo "=== STATUS FINAL ==="
echo ""
echo "Containers:"
docker ps -a 2>/dev/null | grep -E "seeder|kong|supabase" || echo "  Nenhum container SeederLinux"
echo ""
echo "Volumes:"
docker volume ls 2>/dev/null | grep -E "seeder|db_data|storage" || echo "  Nenhum volume SeederLinux"
echo ""
echo "Redes:"
docker network ls 2>/dev/null | grep -E "seeder" || echo "  Nenhuma rede SeederLinux"
echo ""

info "========================================="
info "  ✅ LIMPEZA CONCLUÍDA!"
info "========================================="
echo ""
info "Para reinstalar:"
info "  cd $PROJECT_DIR"
info "  sudo bash install.sh"
echo ""