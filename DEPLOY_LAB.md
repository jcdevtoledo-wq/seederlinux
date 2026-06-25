# Deploy SeederLinux — Self-Hosted Docker Compose

> Há **um único app** com dois modos via `VITE_SEEDER_MODE`:
> - `full` (default) — todos os módulos: OMs, scripts, perfis, estações, hub, auditoria.
> - `hub` — apenas catálogo federado, auditoria, usuários e configurações.
>   Use para subir um nó central que outras instâncias consomem.

---

## 1. Instalação Rápida (Debian 12/13)

```bash
# Clone o repositório
git clone <seu-repo> /opt/seederlinux
cd /opt/seederlinux

# Execute o instalador (requer root)
sudo bash install.sh
```

O instalador:
- Detecta Debian 12/13
- Instala Docker e Docker Compose
- Gera todos os secrets automaticamente
- Cria o arquivo `.env`
- Sobe toda a stack via `docker compose up -d`
- Aplica o schema completo do banco de dados

## 2. Variáveis de Ambiente

O `.env` é gerado automaticamente. Variáveis principais:

| Variável | Descrição |
|----------|-----------|
| `POSTGRES_PASSWORD` | Senha do banco (32+ chars) |
| `JWT_SECRET` | Chave de assinatura JWT (64 chars) |
| `ANON_KEY` | JWT com role `anon` |
| `SERVICE_ROLE_KEY` | JWT com role `service_role` |
| `PUBLIC_SUPABASE_URL` | URL do Kong (API) |
| `SITE_URL` | URL da aplicação |
| `SETUP_TOKEN` | Token para acessar `/setup` |

## 3. Serviços da Stack

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| `db` | 5432 | PostgreSQL 15 (Supabase) |
| `rest` | — | PostgREST (API REST automática) |
| `auth` | — | GoTrue (autenticação) |
| `realtime` | — | WebSockets / subscriptions |
| `storage` | — | Storage API |
| `meta` | — | Postgres Meta |
| `kong` | 8000 | API Gateway |
| `app` | 3000 | SeederLinux (TanStack Start) |
| `traefik` | 80/443 | Proxy reverso (profile: proxy) |

## 4. Primeiro Acesso

Após a instalação, acesse:

```
http://<IP-DO-SERVIDOR>:3000/setup
```

O token de setup é exibido no final da instalação.

1. Crie a conta admin inicial
2. A aplicação promove automaticamente o primeiro usuário a `admin_gap`
3. Configure a identidade da OM raiz
4. Cadastre variáveis, scripts e perfis

## 5. Provisionar uma Estação

Na máquina-cliente:

```bash
curl -fsSL http://<SEEDER-HOST>/agent/install.sh | sudo bash -s -- \
  --url http://<SEEDER-HOST>:8000 --token <TOKEN_DA_ESTACAO>
```

Isso instala o agente que faz check-in a cada 15 minutos.

### Comportamento de Rollback (agente v0.3.0+)

Antes de aplicar qualquer perfil novo, o agente:
1. Tira **snapshot tar.gz** dos paths em `SEEDER_SNAPSHOT_PATHS`
2. Aplica os scripts em ordem
3. Em **falha**: restaura snapshot, mantém serial anterior, reporta status `rollback`

## 6. Observabilidade

```bash
# Logs de todos os serviços
docker compose logs -f

# Logs de um serviço específico
docker compose logs -f app
docker compose logs -f auth

# Status dos containers
docker compose ps
```

- **Painel → Estações → 🕘** abre o histórico de execuções
- **Dashboard / Organização** mostra taxa de sucesso (30 dias)

## 7. Atualização

```bash
cd /opt/seederlinux
git pull
sudo docker compose up -d --build
```

O banco de dados persiste no volume `db_data`.

## 8. Backup e Restore

```bash
# Backup
docker compose exec db pg_dump -U supabase_admin postgres > backup.sql

# Restore
cat backup.sql | docker compose exec -T db psql -U supabase_admin postgres
```

## 9. HTTPS com Traefik (Opcional)

Para produção com domínio público:

```bash
# Adicione ao .env:
ACME_EMAIL=seu@email.com
PUBLIC_SUPABASE_URL=https://seu.dominio.com/api
SITE_URL=https://seu.dominio.com

# Suba com o profile proxy
docker compose --profile proxy up -d
```

Traefik obterá certificados Let's Encrypt automaticamente.

## 10. Troubleshooting

### App não inicia

```bash
docker compose logs app
# Verifique se VITE_SUPABASE_URL e ANON_KEY estão corretos
```

### Banco não responde

```bash
docker compose logs db
docker compose exec db pg_isready -U supabase_admin
```

### Auth não funciona

```bash
docker compose logs auth
# Verifique JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY
```
