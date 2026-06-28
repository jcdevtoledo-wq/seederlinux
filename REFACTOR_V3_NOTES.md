# Refatoração v3.0 — Resumo das mudanças

## Arquitetura alinhada com Documentação v3.0

A refatoração elimina a duplicação de fonte de verdade entre `organizations` e
`org_variables`. Agora:

- **`organizations`**: APENAS metadados (id, nome, sigla, descricao, ativo, cor, serial, estacoes).
- **`variable_definitions`**: catálogo oficial das variáveis (Documento 06).
- **`organization_variables`**: única fonte de verdade dos valores, referenciando o catálogo.

## Como aplicar

```bash
# 1. Subir o Postgres
docker compose up -d db

# 2. Aplicar a migration destrutiva
npx prisma migrate deploy
# (alternativa em dev: npx prisma migrate reset --force)

# 3. Gerar o Prisma Client
npx prisma generate

# 4. Popular o catálogo (idempotente)
npx tsx backend/src/scripts/seed-catalog.ts

# 5. Subir o stack completo
docker compose up -d
```

> O backend também garante o catálogo na inicialização (`ensureCatalogSeeded()`),
> portanto o passo 4 é opcional.

## Endpoints novos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/organizations/:id` | Retorna metadados + `config` (mapa chave→valor) |
| PATCH | `/api/organizations/:id` | Atualiza metadados + variáveis em `config` (incrementa serial) |
| GET | `/api/organizations/:id/validate` | Valida variáveis obrigatórias + tipos |
| POST | `/api/organizations/:id/export` | Gera `.conf` agrupado por categoria |
| GET | `/api/organizations/:orgId/variables` | Catálogo completo + valores da OM |
| PUT | `/api/organizations/:orgId/variables` | Atualiza várias variáveis (incrementa serial) |
| PUT | `/api/organizations/:orgId/variables/:key` | Atualiza uma variável |
| GET | `/api/variables/catalog` | Catálogo global de definições |

## Frontend

- `setup.tsx`: agora pede apenas os metadados + 8 variáveis essenciais (Doc 06).
- `OrganizationFormDialog`: edita metadados + variáveis essenciais; demais variáveis
  são gerenciadas na tela **Variáveis**.
- `painel.variaveis.index.tsx`: catálogo completo agrupado por categoria, com edição
  em lote (botão **Salvar (N)**) que incrementa o `serial` automaticamente.
- `painel.organizacoes.$orgId.tsx`: novo card de validação backend, exibe valores
  agrupados por prefixo e baixa `.conf` direto do endpoint `/export`.

## Catálogo de variáveis (Documento 06)

`backend/src/seed/variable-catalog.ts` contém o catálogo oficial com
**60+ definições** distribuídas em 13 categorias:

- DOMINIO, ARQUIVOS, NAVEGADORES, BRANDING, INVENTARIO, REMOTO, IMPRESSORAS,
- CERTIFICADOS, REPOSITORIOS, MIRROR, AGENTE, SEGURANCA, INTEGRACOES.

## Comportamento do serial

Conforme Documento 05 - Regra 13, o `serial` da OM é incrementado **automaticamente** sempre
que qualquer variável (`organization_variables`) é alterada via:

- `PATCH /api/organizations/:id` (quando `config` é enviado)
- `PUT /api/organizations/:orgId/variables`
- `PUT /api/organizations/:orgId/variables/:key`
- `POST /api/variables` (endpoint legado)

## Limpeza realizada

- Tabelas removidas: `org_variables`, `variable_catalog`, `legacy_applications*`,
  `software_profiles*`, `update_channels*`, `updates*`.
- Colunas removidas de `organizations`: 25+ campos técnicos (fqdn, netbios, realm,
  dc_primary_ip, dns_primary, http_proxy, auth_backend, deploy_profile, etc.).
- Diretório `/app/backend/src/modules/` (módulos não usados) foi removido.
- `/app/src/lib/seeder/data.ts` (seed in-memory legado) removido.
