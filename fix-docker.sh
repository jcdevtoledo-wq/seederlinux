#!/usr/bin/env bash
# =============================================================================
# Script: Corrigir DNS Docker + Atualizar Dockerfile + Reconstruir App
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
info() { printf "${GREEN}[fix]${NC} %s\n" "$*"; }
error() { printf "${RED}[erro]${NC} %s\n" "$*" >&2; }

echo ""
info "========================================="
info "  Corrigindo DNS Docker + Dockerfile"
info "  $(date)"
info "========================================="
echo ""

[[ $EUID -ne 0 ]] && { error "Execute como root: sudo bash fix.sh"; exit 1; }

# 1. Configurar DNS do Docker
info "Configurando DNS do Docker..."
mkdir -p /etc/docker

if [[ -f /etc/docker/daemon.json ]]; then
    info "daemon.json já existe, fazendo backup..."
    cp /etc/docker/daemon.json /etc/docker/daemon.json.bak.$(date +%Y%m%d_%H%M%S)
fi

cat > /etc/docker/daemon.json << 'EOF'
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
EOF

info "✅ /etc/docker/daemon.json criado"

# 2. Reiniciar Docker
info "Reiniciando Docker..."
systemctl restart docker
info "✅ Docker reiniciado"

# 3. Verificar DNS
echo ""
info "Verificando configuração DNS..."
if docker info 2>/dev/null | grep -q "8.8.8.8"; then
    info "✅ DNS configurado: 8.8.8.8, 1.1.1.1"
else
    warn "DNS pode não ter sido aplicado, mas continuando..."
fi

# 4. Procurar diretório do projeto
if [[ -f "$(pwd)/docker-compose.yml" ]]; then
    PROJECT_DIR="$(pwd)"
elif [[ -f "/opt/seederlinux/docker-compose.yml" ]]; then
    PROJECT_DIR="/opt/seederlinux"
else
    error "Diretório do projeto não encontrado!"
    exit 1
fi

info "Projeto encontrado em: $PROJECT_DIR"
cd "$PROJECT_DIR"

# 5. Backup do Dockerfile original
if [[ -f Dockerfile ]]; then
    if [[ ! -f Dockerfile.original ]]; then
        cp Dockerfile Dockerfile.original
        info "Backup criado: Dockerfile.original"
    fi
fi

# 6. Criar Dockerfile corrigido
info "Atualizando Dockerfile..."

cat > Dockerfile << 'DOCKEREOF'
# =============================================================================
# SeederLinux App — Multi-stage build
# Base: Node 20 Alpine
# TanStack Start outputs to dist/server
# =============================================================================

FROM node:20-alpine AS deps
WORKDIR /app

# Corrige DNS e instala dependências de build
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf && \
    echo "nameserver 1.1.1.1" >> /etc/resolv.conf && \
    apk update && \
    apk add --no-cache python3 make g++ git

# Copia manifesto e lockfile
COPY package.json package-lock.json* bun.lockb* ./

# Instala dependências (usa npm por compatibilidade universal)
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments para Vite (valores padrão — sobrepostos pelo .env em runtime)
ARG VITE_SUPABASE_URL=http://localhost:8000
ARG VITE_SUPABASE_ANON_KEY=placeholder
ARG VITE_SEEDER_MODE=full
ARG VITE_SETUP_TOKEN=

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SEEDER_MODE=$VITE_SEEDER_MODE
ENV VITE_SETUP_TOKEN=$VITE_SETUP_TOKEN

RUN npm run build

# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copia apenas o necessário para produção
# TanStack Start outputs client to dist/client and server to dist/server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "dist/server/server.js"]
DOCKEREOF

info "✅ Dockerfile atualizado"

# 7. Reconstruir app
echo ""
info "Reconstruindo a aplicação (pode levar alguns minutos)..."
if docker compose build --no-cache app 2>&1; then
    info "✅ Build concluído com sucesso!"
else
    error "Falha no build. Verifique os logs acima."
    exit 1
fi

# 8. Subir containers
echo ""
info "Iniciando containers..."
docker compose up -d

echo ""
info "Status dos containers:"
docker compose ps

echo ""
info "========================================="
info "  ✅ TUDO PRONTO!"
info "========================================="
echo ""
info "Se o build falhar, verifique:"
info "  1. docker compose logs app"
info "  2. docker compose build --no-cache app"
echo ""
