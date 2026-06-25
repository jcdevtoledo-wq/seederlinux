# =============================================================================
# SeederLinux App — Multi-stage build
# Base: Node 20 Alpine
# TanStack Start outputs to dist/server
# =============================================================================

FROM node:20-alpine AS deps
WORKDIR /app

# Instala dependências de build
RUN apk update && apk add --no-cache python3 make g++ git

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

# Instala wget para healthcheck
RUN apk add --no-cache wget

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copia apenas o necessário para produção
# TanStack Start outputs client to dist/client and server to dist/server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.cjs ./server.cjs

EXPOSE 3000

CMD ["node", "server.cjs"]
