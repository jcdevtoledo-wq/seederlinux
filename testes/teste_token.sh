#!/usr/bin/env bash
# =============================================================================
# Script de Teste do Setup Wizard
# =============================================================================

cd /opt/softwarelivre

# 1. Pega o token do .env
SETUP_TOKEN=$(grep SETUP_TOKEN .env | cut -d= -f2)
echo "Token: $SETUP_TOKEN"
echo ""

# 2. Testa o status do setup (deve estar false)
echo "=== STATUS DO SETUP ==="
curl -s http://localhost:3001/api/setup/status | jq . 2>/dev/null || curl -s http://localhost:3001/api/setup/status
echo ""
echo ""

# 3. Testa o setup com o token real
echo "=== EXECUTANDO SETUP ==="
curl -X POST http://localhost:3001/api/setup \
  -H "Content-Type: application/json" \
  -d "{
    \"setupToken\": \"${SETUP_TOKEN}\",
    \"adminEmail\": \"admin@seeder.local\",
    \"adminPassword\": \"Admin123!\",
    \"adminName\": \"Administrador\",
    \"orgName\": \"Org Raiz\",
    \"orgSigla\": \"RAIZ\",
    \"orgDominio\": \"raiz.local\"
  }" | jq . 2>/dev/null || curl -X POST http://localhost:3001/api/setup \
  -H "Content-Type: application/json" \
  -d "{
    \"setupToken\": \"${SETUP_TOKEN}\",
    \"adminEmail\": \"admin@seeder.local\",
    \"adminPassword\": \"Admin123!\",
    \"adminName\": \"Administrador\",
    \"orgName\": \"Org Raiz\",
    \"orgSigla\": \"RAIZ\",
    \"orgDominio\": \"raiz.local\"
  }"
echo ""
echo ""

# 4. Testa o status novamente (deve estar true)
echo "=== STATUS APÓS SETUP ==="
curl -s http://localhost:3001/api/setup/status | jq . 2>/dev/null || curl -s http://localhost:3001/api/setup/status
echo ""
echo ""

# 5. Testa login
echo "=== TESTANDO LOGIN ==="
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seeder.local","password":"Admin123!"}' | jq . 2>/dev/null || curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seeder.local","password":"Admin123!"}'
echo ""
