mkdir -p testes lixeira lixeira/supabase lixeira/kong lixeira/placeholders
cp teste_token.sh testes/ 2>/dev/null; rm -f teste_token.sh
cp teste_images.sh testes/ 2>/dev/null; rm -f teste_images.sh
cp teste-cross.sh testes/ 2>/dev/null; rm -f teste-cross.sh
cp test-setup.sh testes/ 2>/dev/null; rm -f test-setup.sh
cp test-cors.sh testes/ 2>/dev/null; rm -f test-cors.sh
cp -r supabase lixeira/supabase/ 2>/dev/null; rm -rf supabase
cp volumes/api/kong.yml lixeira/kong/ 2>/dev/null; rm -f volumes/api/kong.yml
cp volumes/api/kong.yml.template lixeira/kong/ 2>/dev/null; rm -f volumes/api/kong.yml.template
cp docker-compose.yml.original lixeira/ 2>/dev/null; rm -f docker-compose.yml.original
cp docker-compose.yml.bak lixeira/ 2>/dev/null; rm -f docker-compose.yml.bak
rm -rf src/t src/assets/t src/components/t src/lib/t src/routes/t src/routes/api/t volumes/api/t volumes/db/t docs_projeto/t supabase/t supabase/migrations/t 2>/dev/null
echo "Limpeza concluida!"