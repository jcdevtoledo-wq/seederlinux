#!/usr/bin/env bash
# =============================================================================
# Script de Teste CORS + Login
# =============================================================================

API_URL="http://10.108.64.49:3001"
ORIGIN="http://10.108.64.49:3000"

echo "========================================="
echo "  TESTE CORS + LOGIN"
echo "  API: $API_URL"
echo "  Origin: $ORIGIN"
echo "========================================="
echo ""

# 1. Health Check
echo "=== 1. HEALTH CHECK ==="
curl -s "$API_URL/health"
echo ""
echo ""

# 2. Teste Preflight CORS (OPTIONS)
echo "=== 2. PREFLIGHT CORS ==="
curl -X OPTIONS "$API_URL/api/auth/login" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v 2>&1 | grep -iE "HTTP|access-control|origin|allow"
echo ""
echo ""

# 3. Teste Login Direto
echo "=== 3. LOGIN DIRETO ==="
curl -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{"email":"admin@seeder.local","password":"Admin123!"}' \
  -v 2>&1 | grep -iE "HTTP|access-control|token|error"
echo ""
echo ""

# 4. Teste Setup Status
echo "=== 4. SETUP STATUS ==="
curl -s "$API_URL/api/setup/status"
echo ""
echo ""

# 5. Teste com fetch simulando navegador
echo "=== 5. SIMULANDO FETCH DO NAVEGADOR ==="
curl -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -H "Referer: $ORIGIN/" \
  -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) Chrome/149" \
  -d '{"email":"admin@seeder.local","password":"Admin123!"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""
echo ""

echo "========================================="
echo "  TESTE CONCLUÍDO"
echo "========================================="
