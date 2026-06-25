#!/usr/bin/env bash
# =============================================================================
# Script de Teste do Setup Wizard - VERSÃO ATUALIZADA (Porta 8000)
# Uso: bash teste_setup.sh
# =============================================================================

# Detecta o diretório do projeto
if [ -f "$(pwd)/.env" ]; then
    PROJECT_DIR="$(pwd)"
elif [ -f "/opt/softwarelivre/.env" ]; then
    PROJECT_DIR="/opt/softwarelivre"
elif [ -f "/opt/seederlinux/.env" ]; then
    PROJECT_DIR="/opt/seederlinux"
else
    echo "ERRO: Arquivo .env não encontrado!"
    exit 1
fi

cd "$PROJECT_DIR"
echo "Projeto: $PROJECT_DIR"
echo ""

# 1. Pega o token do .env
SETUP_TOKEN=$(grep SETUP_TOKEN .env | cut -d= -f2)
echo "Token: $SETUP_TOKEN"
echo ""

# 2. Testa o status do setup (deve estar false)
echo "=== 1. STATUS DO SETUP ==="
curl -s http://localhost:8000/api/setup/status 2>/dev/null | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/api/setup/status
echo ""
echo ""

# 3. Testa o setup com payload COMPLETO (todos os campos que o frontend envia)
echo "=== 2. EXECUTANDO SETUP ==="
curl -s -X POST http://localhost:8000/api/setup \
  -H "Content-Type: application/json" \
  -d "{
    \"setupToken\": \"${SETUP_TOKEN}\",
    \"adminName\": \"Administrador\",
    \"adminEmail\": \"admin@seeder.local\",
    \"adminPassword\": \"Admin123!\",
    \"orgName\": \"Org Raiz\",
    \"orgSigla\": \"RAIZ\",
    \"orgDominio\": \"raiz.local\",
    \"orgNetbios\": \"RAIZ\",
    \"orgDcHostname\": \"dc-raiz\",
    \"orgDcIp\": \"10.0.0.1\",
    \"orgDnsPrimario\": \"10.0.0.1\",
    \"orgDnsSecundario\": \"\",
    \"orgNtpServer\": \"pool.ntp.org\",
    \"orgProxyUrl\": \"\",
    \"orgProxyPort\": \"\",
    \"orgProxyBypass\": \"\",
    \"orgAuthMethod\": \"sssd\"
  }" 2>/dev/null | python3 -m json.tool 2>/dev/null || curl -s -X POST http://localhost:8000/api/setup \
  -H "Content-Type: application/json" \
  -d "{
    \"setupToken\": \"${SETUP_TOKEN}\",
    \"adminName\": \"Administrador\",
    \"adminEmail\": \"admin@seeder.local\",
    \"adminPassword\": \"Admin123!\",
    \"orgName\": \"Org Raiz\",
    \"orgSigla\": \"RAIZ\",
    \"orgDominio\": \"raiz.local\"
  }" 2>/dev/null
echo ""
echo ""

# 4. Testa o status novamente (deve estar true)
echo "=== 3. STATUS APÓS SETUP ==="
curl -s http://localhost:8000/api/setup/status 2>/dev/null | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/api/setup/status
echo ""
echo ""

# 5. Testa login
echo "=== 4. TESTANDO LOGIN ==="
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seeder.local","password":"Admin123!"}' 2>/dev/null | python3 -m json.tool 2>/dev/null || curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seeder.local","password":"Admin123!"}' 2>/dev/null
echo ""
echo ""

# 6. Testa health
echo "=== 5. HEALTH CHECK ==="
curl -s http://localhost:8000/health 2>/dev/null
echo ""
echo ""

echo "=== TESTE CONCLUÍDO ==="
echo ""
echo "Agora acesse no navegador:"
echo "  Setup: http://10.108.64.49:3000/setup"
echo "  Login: http://10.108.64.49:3000/login"
