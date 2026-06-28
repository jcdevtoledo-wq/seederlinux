# SeederLinux v3.0 — Product Requirements Document

## Problem Statement
Refatoração completa do código para alinhar 100% com a documentação v3.0:
- Eliminar duplicação entre `Organization` (campos técnicos) e `organization_variables`.
- Catálogo oficial (`variable_definitions`) como referência única (Documento 06).
- `organization_variables` como única fonte de verdade dos valores por OM.
- Setup Wizard, telas e validador alinhados ao novo modelo.

## Architecture
- **Backend**: Fastify + Prisma + PostgreSQL (TypeScript). Entry: `backend/src/server.ts`.
- **Frontend**: React 19 + TanStack Start/Router + TanStack Query + Tailwind 4 + shadcn/ui.
- **DB**: PostgreSQL via `docker compose up -d db` (porta 5432).
- **Catálogo**: `backend/src/seed/variable-catalog.ts` (60+ definições, Doc 06).

## User Personas
- **admin_gap**: administrador global, acesso total.
- **operador_om**: gerencia variáveis e estações da sua OM.
- **auditor**: leitura + auditoria.

## Core Requirements (v3.0)
1. `Organization` armazena APENAS metadados (nome, sigla, descrição, ativo, serial, cor).
2. `variable_definitions` é o catálogo oficial (Documento 06) — única fonte do "shape".
3. `organization_variables` é a única fonte de verdade dos valores por OM.
4. Setup cria todas as variáveis do catálogo para a primeira OM.
5. Editar variáveis incrementa o `serial` automaticamente (Doc 05 - Regra 13).
6. Endpoint `/validate` retorna missing/invalid baseado no catálogo.
7. Endpoint `/export` gera `.conf` agrupado por categoria.

## What's been implemented (Jan/2026)
- ✅ Schema Prisma refatorado (Organization metadados + VariableDefinition + OrganizationVariable).
- ✅ Migration SQL destrutiva (`prisma/migrations/20260101000000_refactor_v3_metadata_only_org`).
- ✅ Catálogo oficial (60+ variáveis em 13 categorias — Doc 06).
- ✅ Script de seed do catálogo (`backend/src/scripts/seed-catalog.ts`).
- ✅ **TLS obrigatório (Doc 15 v3.1)**:
  - Tabela `tls_config` + migration (`20260102000000_add_tls_config`).
  - `backend/src/lib/cert-manager.ts` com modos SELF_SIGNED (CA 4096 + cert servidor 2048) e PKI.
  - Setup Wizard ganhou step 4 (TLS) com escolha de modo + hostname + SANs.
  - Endpoint `GET /api/admin/tls`, `POST /api/admin/tls/rotate`, `GET /api/public/tls/ca.crt`.
  - `start()` faz bootstrap automático: HTTPS se houver TLS ativo, HTTP senão (modo setup).
- ✅ Backend `server.ts` totalmente refatorado:
  - Setup cria todas as variáveis do catálogo.
  - GET/PATCH /api/organizations/:id agora usa `config` (mapa chave→valor).
  - GET /api/organizations/:orgId/variables (catálogo completo + valores).
  - PUT /api/organizations/:orgId/variables (bulk update + serial++).
  - GET /api/organizations/:id/validate (validador baseado no catálogo).
  - POST /api/organizations/:id/export (gera .conf agrupado por categoria).
- ✅ Frontend:
  - Tipos atualizados (`Organization` com `config: Record<string,string>`).
  - API client com `variablesApi.listForOrg/bulkUpdate/setOne` + `organizationConfigApi`.
  - Setup wizard simplificado (metadados + 8 variáveis essenciais).
  - `OrganizationFormDialog` foca em metadados + variáveis-chave.
  - `painel.variaveis.index.tsx` mostra catálogo completo agrupado por categoria
    com edição em lote.
  - `painel.organizacoes.$orgId.tsx` exibe `config` agrupado + validação backend
    + export do `.conf`.
- ✅ Removidos: módulos não usados (`backend/src/modules/`), `src/lib/seeder/data.ts`,
  tabelas legadas (`variable_catalog`, `org_variables`, software/legacy/update tables).
- ✅ Lint limpo em todos os arquivos refatorados.
- ✅ Schema Prisma valida com sucesso (`prisma validate`).

## Backlog
- P1: Job de exportação automática do `.conf` para `/opt/seederlinux/etc/` (file system).
- P2: UI de criação de variáveis customizadas (componente `VariableFormDialog` pronto;
  falta entry point na tela de Variáveis).
- P2: Histórico de mudanças de variáveis (timeline por OM).
- P2: Diff entre serial atual e último serial aplicado em cada estação.

## Next Action Items
1. Validar em ambiente com Postgres (docker compose) — rodar setup + criar OM.
2. Atualizar `painel.estacoes.*.tsx` e `painel.scripts.*.tsx` se necessário (não estavam no escopo).
3. Adicionar UI para criar variáveis customizadas (`VariableFormDialog` já existe).
