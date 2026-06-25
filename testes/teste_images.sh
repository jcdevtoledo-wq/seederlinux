# Testa cada imagem para ver qual versão existe
echo "=== TESTANDO VERSÕES DISPONÍVEIS ==="

echo ""
echo "Testando realtime..."
for ver in v2.29.52 v2.28.32 v2.25.1 v2.22.0 v2.15.0; do
  if docker pull "supabase/realtime:${ver}" 2>&1 | grep -q "Digest:"; then
    echo "✅ ENCONTRADA: supabase/realtime:${ver}"
  else
    echo "❌ Não existe: supabase/realtime:${ver}"
  fi
done

echo ""
echo "Testando gotrue..."
for ver in v2.158.1 v2.132.3 v2.100.0 v2.82.0; do
  if docker pull "supabase/gotrue:${ver}" 2>&1 | grep -q "Digest:"; then
    echo "✅ ENCONTRADA: supabase/gotrue:${ver}"
  else
    echo "❌ Não existe: supabase/gotrue:${ver}"
  fi
done

echo ""
echo "Testando storage-api..."
for ver in v1.3.2 v1.0.0 v0.46.4 v0.40.0; do
  if docker pull "supabase/storage-api:${ver}" 2>&1 | grep -q "Digest:"; then
    echo "✅ ENCONTRADA: supabase/storage-api:${ver}"
  else
    echo "❌ Não existe: supabase/storage-api:${ver}"
  fi
done

echo ""
echo "Testando postgres-meta..."
for ver in v0.83.2 v0.80.0 v0.75.0 v0.68.0; do
  if docker pull "supabase/postgres-meta:${ver}" 2>&1 | grep -q "Digest:"; then
    echo "✅ ENCONTRADA: supabase/postgres-meta:${ver}"
  else
    echo "❌ Não existe: supabase/postgres-meta:${ver}"
  fi
done
