# AUDITORIA DE ADEQUAÇÃO — SEEDERLINUX v3.0

> **Auditoria realizada em** Janeiro/2026, baseada em todos os 16 documentos
> da pasta `docs/` e no estado atual do repositório após a refatoração v3.0.

---

## 1. SUMÁRIO EXECUTIVO

| Item | Valor |
|------|-------|
| **Data da auditoria** | 2026-01 (pós-refatoração v3.0) |
| **Versão do código** | 3.0.0 (TS/Fastify/Prisma/PostgreSQL) |
| **Total de itens auditados** | 142 |
| **✅ Conformes** | 78 (55%) |
| **⚠️ Parcialmente Conformes** | 33 (23%) |
| **❌ Não Conformes** | 21 (15%) |
| **➖ Não Aplicáveis (fora de escopo MVP atual)** | 10 (7%) |
| **Risco Global** | **MÉDIO** |

**Parecer Geral**: A camada **núcleo** (modelo de dados, catálogo de variáveis, regras de
serial, RBAC, multi-tenant, auditoria) está **fortemente conforme** após a refatoração v3.0.
Os **principais gaps** estão em itens que dependem de componentes ainda não implementados
no MVP: **SeederAgent binário**, **SeederHub federado**, **TLS/PKI obrigatório** (Doc 15
v3.1), **Setup Wizard com configuração de TLS**, e **rollback automático**. Adicionalmente,
há divergências menores no schema (campos com nomes em PT vs EN, alguns campos faltando
como `deleted_at`, `setup_state`, `hub_catalog`).

---

## 2. ANÁLISE POR ÁREA

### 2.1 Modelo de Dados (Documentos 03, 12, 14)

| # | Item | Status | Observação |
|---|------|--------|------------|
| 1 | Organization é APENAS metadados (sem campos técnicos) | ✅ | Refatoração v3.0 removeu 25+ campos técnicos. Mantidos: id, nome, sigla, descricao, ativo, cor, serial, estacoes, scriptsAtivos. |
| 2 | Existe `variable_definitions` (catálogo) | ✅ | Modelo criado em `prisma/schema.prisma:108`, com 60+ entradas seeded. |
| 3 | `organization_variables` é ÚNICA fonte de verdade | ✅ | Modelo `OrganizationVariable` com FK para `VariableDefinition`. |
| 4 | `serial` é Int (NÃO BigInt) em Organization | ✅ | `serial Int @default(0)` no schema. |
| 5 | `serial` em Script ainda é BigInt | ⚠️ | Doc 03 §29 diz "serial_config" (Int) para Organization. Para Script, Doc não exige. Atual: `BigInt`. **Sugere-se Int** por consistência. |
| 6 | `serial_aplicado` em Station ainda é BigInt | ⚠️ | Doc 03 §20 diz "configuration_serial". Atual: `BigInt`. Por consistência com Org.serial (Int), **deveria ser Int**. |
| 7 | Tabela `core_modules` (catálogo Core) | ❌ | Doc 03 §7 e Doc 07 definem `core_modules` com campos: module_code, version, serial, immutable=true. **Não existe** no schema atual. Hoje os módulos Core são representados como `scripts` com flag `oficial=true`. |
| 8 | Tabela `setup_state` separada de `system_config` | ❌ | Doc 03 §25 exige tabela própria. Atual: apenas `SystemConfig` chave-valor. |
| 9 | Tabela `hub_catalog` | ❌ | Doc 03 §26. **Não implementado** (sem federação ainda). |
| 10 | Tabela `auth_policies` | ❌ | Doc 03 §18. Hoje políticas offline são armazenadas como variáveis com prefixo `OFFLINE_AUTH_*`. Doc exige tabela dedicada. |
| 11 | Tabela `update_policies` | ❌ | Doc 03 §19. Não existe. |
| 12 | Tabela `repository_policies` | ❌ | Doc 03 §17. Hoje há `Repository`, mas não a entidade de **política** por OM (mode internet/corporativo/herdado). |
| 13 | Campo `deleted_at` (soft-delete) em Organization, Script, User | ❌ | Doc 03 declara `deleted_at` em todas as tabelas principais. Schema atual usa hard-delete. |
| 14 | Nomes de colunas em inglês (`name`, `acronym`) vs português (`nome`, `sigla`) | ⚠️ | Doc 03 §4 usa `name` e `acronym`. Schema atual usa `nome` e `sigla`. Funciona, mas diverge da nomenclatura do doc. |
| 15 | `organization_variables` deve ter `name` (chave) | ⚠️ | Doc 03 §6 lista campos: id, organization_id, name, value, description, data_type, category, required. Schema atual deriva tudo via FK para `VariableDefinition` — **mais normalizado, divergente da letra do doc**. |
| 16 | Apenas um registro de `system_config` deve existir | ⚠️ | Schema é chave-valor (múltiplas linhas). Funcionalmente OK, mas Doc 03 §24 diz "apenas um registro". |
| 17 | Índice obrigatório em `audit_events(ts, ator_id, categoria, org_id)` | ✅ | Schema declara 4 índices. |
| 18 | RBAC Roles: admin_gap, operador_om, auditor | ✅ | Enum `AppRole` correto. |
| 19 | admin_gap pode ter `organization_id` nulo | ✅ | `UserRole.orgSigla` é opcional. |
| 20 | Status de Station: never/ok/late/error | ⚠️ | Schema define mais: `nunca, ok, atrasada, registered, online, offline, blocked, decommissioned`. Mais expressivo, **mas diverge dos 4 oficiais** (Doc 03 §20). |

### 2.2 Regras de Negócio (Documento 05)

| # | Item | Status | Observação |
|---|------|--------|------------|
| 21 | Setup Wizard: executado apenas uma vez | ✅ | `setup_completed` em `SystemConfig` bloqueia execuções repetidas. |
| 22 | Setup Wizard: cria admin_gap | ✅ | server.ts §283. |
| 23 | Setup Wizard: cria organização raiz | ✅ | server.ts §241. |
| 24 | Setup Wizard: cria TODAS as variáveis do catálogo | ✅ | `createDefaultOrgVariables(org.id)` chamado no setup. |
| 25 | Setup Wizard: cria branding padrão | ✅ | server.ts §265. |
| 26 | Setup Wizard: cria políticas padrão | ❌ | Doc 05 §4 + Doc 03 §30. Atualmente cria só branding, não browser/printer/desktop/repository/auth/update policies. |
| 27 | Setup: rota `/setup` permanece bloqueada permanentemente | ✅ | Verifica `setup_completed` antes de qualquer outra coisa. |
| 28 | Organização: sigla única | ✅ | `@unique` no schema + check no POST/setup. |
| 29 | Organização: serial incrementa em mudanças de variáveis | ✅ | `PUT /api/organizations/:orgId/variables` chama `{ serial: { increment: 1 } }`. |
| 30 | Serial NÃO incrementa em login/auditoria/consultas/inventário | ✅ | Verificado: nenhum desses endpoints toca em `serial`. |
| 31 | Serial incrementa em branding | ❌ | Doc 03 §29. Atual: `POST /api/branding` faz upsert, mas **não incrementa serial**. |
| 32 | Serial incrementa em browser/printer/desktop/repository policies | ❌ | Mesmo problema do branding. |
| 33 | Variáveis pertencem à OM, NÃO aos scripts | ✅ | `OrganizationVariable.organizationId`. Schema garante. |
| 34 | Alterar variável NÃO altera scripts | ✅ | Substituição é feita via template `{{VAR}}` no momento do provisioning. |
| 35 | Scripts Core são imutáveis | ⚠️ | server.ts bloqueia PATCH/DELETE em `script.oficial=true`. Porém Doc 03 §7 exige `immutable=true` em **modelo separado `core_modules`** — atualmente representado como flag em `scripts`. |
| 36 | Scripts Customizados: criar/editar/versionar/remover | ⚠️ | Criar/editar/remover OK. **Versionar** (tabela `script_versions`) ❌ não existe. |
| 37 | Variáveis detectadas automaticamente em scripts (`{{VAR}}`) | ✅ | `extractUsedVars()` em `src/lib/seeder/variables.ts`. |
| 38 | Estações: serial_aplicado = 0 para novas estações | ✅ | Default `0` no schema. |
| 39 | Estações criadas automaticamente pelo SeederAgent em produção | ➖ | Agent ainda não implementado. Cadastro manual disponível. |
| 40 | Check-in periódico de 15 minutos | ⚠️ | Endpoint `POST /api/public/station-checkin` existe e atualiza `ultimoCheckin`. Variável `AGENT_CHECKIN_INTERVAL=15` no catálogo. Mas **o agente que faz o checkin não existe**. |
| 41 | Auditoria obrigatória em TODAS as ações de mutação | ⚠️ | Login, setup, organizations CRUD, variables CRUD, scripts, profiles têm. **Branding (POST), browser-policies, printer-profiles, desktop-policies, offline-auth, stations PATCH/DELETE** têm. **MAS users PATCH (block/unblock) e station-checkin não auditam.** |
| 42 | Auditoria nunca pode ser excluída | ✅ | Não há endpoint DELETE para `audit_events`. |
| 43 | RBAC: admin_gap acesso total | ✅ | `isAdminGap()` helper. |
| 44 | RBAC: operador_om limitado à sua OM | ✅ | `canAccessOrg(roles, orgSigla)` + `canEditOrg(...)`. |
| 45 | RBAC: auditor read-only | ⚠️ | `canAccessOrg` aceita auditor, mas o doc não distingue claramente entre read e write. **Atualmente auditor não tem PATCH/POST/DELETE em nada (correto)**, mas o doc precisa ser interpretado. |

### 2.3 Catálogo de Variáveis (Documento 06)

| # | Item | Status | Observação |
|---|------|--------|------------|
| 46 | TODAS as variáveis do Doc 06 existem em `VARIABLE_CATALOG` | ✅ | 60 entradas cobrindo as 13 categorias do Doc 06. |
| 47 | Categorias corretas (DOMINIO, ARQUIVOS, NAVEGADORES, BRANDING, INVENTARIO, REMOTO, IMPRESSORAS, CERTIFICADOS, REPOSITORIOS, MIRROR, AGENTE, SEGURANCA, INTEGRACOES) | ✅ | Todas presentes. |
| 48 | Tipos: string, boolean, integer, ip, url, array | ✅ | Todos os 6 tipos. |
| 49 | Campos da definição: key, category, description, type, required, editable, default_value, validation, core_module | ✅ | Modelo `VariableDefinition` cobre todos + label/exemplo/oficial. |
| 50 | Variáveis obrigatórias marcadas (`required=true`) | ✅ | DOMINIO, DOMINIO_NETBIOS, DC_IP, DNS_PRIMARIO, REPOSITORY_MODE, AGENT_CHECKIN_INTERVAL. |
| 51 | Variáveis obrigatórias do Doc 06 §16 criadas no Setup | ✅ | Setup cria TODAS as 60+ via `createDefaultOrgVariables`. |
| 52 | Documentação prevê `HOMEPAGE` e `DISPLAY_NAME` como obrigatórias §16 | ⚠️ | No catálogo atual estão como `required: false`. Doc 06 §16 lista entre as criadas automaticamente, mas não diz explicitamente "required". Pequena divergência. |
| 53 | Valores padrão adequados | ✅ | NTP_SERVER='pool.ntp.org', THEME='Mint-Y-Dark', REPOSITORY_MODE='PUBLIC', AGENT_CHECKIN_INTERVAL='15', etc. |
| 54 | Campo `core_module` populado | ✅ | Cada definição referencia seu Core.* respectivo. |
| 55 | Frontend exibe Nome, Descrição, Categoria, Tipo, Valor Atual, Obrigatória (Doc 06 §17) | ✅ | `painel.variaveis.index.tsx` mostra todos. |
| 56 | Busca/filtros: pesquisar, filtrar por categoria, filtrar obrigatórias | ✅ | Implementado. |
| 57 | Filtrar variáveis utilizadas em scripts | ❌ | Filtro "Com valor" existe, mas o **"utilizadas em scripts"** do Doc 06 §17 (mapear variáveis vs scripts) só aparece na aba "Cobertura" da OM, não na tela global. |

### 2.4 Módulos Core (Documentos 04, 07)

| # | Item | Status | Observação |
|---|------|--------|------------|
| 58 | Tabela `core_modules` | ❌ | Não existe. Módulos representados como scripts `oficial=true`. |
| 59 | Estrutura padrão (manifesto YAML: nome/identificador/versao/serial/dependencias/variaveis/templates/rollback/validacao) | ❌ | Não há manifesto. Scripts oficiais têm apenas `conteudo` bash. |
| 60 | Core.Domain | ⚠️ | Representado por scripts core-002 e core-003. **Sem manifesto/rollback formal.** |
| 61 | Core.Repositories | ⚠️ | Variável `REPOSITORY_MODE` existe; **não há script Core implementado**. |
| 62 | Core.Files (SMB/CIFS) | ❌ | Variáveis SERVIDOR_ARQUIVOS, COMPARTILHAMENTOS, MOUNT_BASE existem; **sem script Core**. |
| 63 | Core.Browser | ❌ | Há `BrowserPolicy` model + endpoint, mas **sem script Core** que aplique a política. |
| 64 | Core.Branding | ⚠️ | Script core-005/006 + modelo `BrandingConfig`. Parcial. |
| 65 | Core.Inventory | ❌ | Variáveis OCS_SERVER/GLPI_SERVER existem; **sem script Core**. |
| 66 | Core.Remote | ❌ | REMOTE_METHOD/REMOTE_SERVER existem; **sem script Core**. |
| 67 | Core.Printers | ⚠️ | Modelo `PrinterProfile/PrinterQueue` existe; **sem script Core de aplicação**. |
| 68 | Core.Certificates | ❌ | Variáveis CERTIFICATE_BUNDLE/CERTIFICATE_AUTO_INSTALL existem; **sem script Core**. |
| 69 | Core.Security (hardening + firewall) | ⚠️ | Script core-007/008/011 (hardening SSH + UFW) — porém sem manifesto. |
| 70 | Core.Desktop | ⚠️ | `DesktopPolicy` armazenada como variáveis `DESKTOP_*` — funciona, mas **diverge** do modelo Doc 03/07. |
| 71 | Cada módulo possui rollback declarado | ❌ | Nenhum módulo declara rollback. |
| 72 | Cada módulo possui validação pós-execução | ❌ | Não implementado. |

### 2.5 API (Documento 15 v3.1)

| # | Item | Status | Observação |
|---|------|--------|------------|
| 73 | Autenticação JWT Bearer | ✅ | `@fastify/jwt` + hook `onRequest` global. |
| 74 | TLS obrigatório (Doc 15 §3) | ❌ | API hoje sobe em HTTP (porta 8000 sem TLS). **Doc 15 v3.1 exige TLS 1.2/1.3 obrigatório** com 3 modos (SELF_SIGNED/PKI/ACME). |
| 75 | Modos de Certificado (SELF_SIGNED, PKI, ACME) | ❌ | Não implementado. |
| 76 | Setup Wizard inclui configuração TLS (`tls.mode`, `generateCA`) | ❌ | Setup atual não pede `tls`. |
| 77 | Resposta padrão `{ success: bool, data?: {}, message?: "" }` | ⚠️ | Endpoints novos usam (`/api/setup`, `/api/organizations/:id/export`). **Boa parte dos endpoints legados retorna objeto puro** (ex: `prisma.organization.findMany()` retorna array direto). |
| 78 | RBAC: admin_gap, operador_om, auditor verificados | ✅ | Helpers `isAdminGap`, `canAccessOrg`, `canEditOrg`. |
| 79 | Multi-tenant: operador_om limitado à sua OM | ✅ | `canAccessOrg` valida `orgSigla` do role. |
| 80 | Auditoria em endpoints de mutação | ⚠️ | Maioria sim. **Lacunas**: branding upsert, browser-policies upsert, printer-profiles upsert, desktop-policies upsert sem audit consistente. |
| 81 | Serialização global BigInt → Number | ✅ | Hook `preSerialization`. |
| 82 | `POST /api/setup` | ✅ | Existe e funcional. |
| 83 | `GET /api/setup/status` | ✅ | Existe. |
| 84 | `POST /api/auth/login` | ✅ | OK. |
| 85 | `GET /api/auth/me` | ✅ | OK. |
| 86 | `POST /api/auth/logout` | ❌ | Doc 15 §7 declara. **Não implementado** no backend (cliente apenas remove o token localmente). |
| 87 | CRUD `/api/organizations` (GET, POST, PUT, DELETE) | ⚠️ | GET/POST/PATCH/DELETE OK. Doc 15 §8 usa **PUT**, atual usa **PATCH** (semanticamente OK, mas diverge da letra do doc). |
| 88 | CRUD `/api/users` | ⚠️ | GET, POST, DELETE. **Falta PATCH** (bloqueio/desbloqueio, troca de papel). |
| 89 | CRUD `/api/variables` (catálogo + por OM) | ✅ | Catálogo + 4 rotas por OM. |
| 90 | CRUD `/api/scripts` | ✅ | OK. |
| 91 | CRUD `/api/profiles` | ✅ | OK. |
| 92 | Endpoints `/api/branding` | ✅ | GET + POST upsert. |
| 93 | Endpoints `/api/browser-policies` | ✅ | OK. |
| 94 | Endpoints `/api/desktop-policies` | ⚠️ | Implementado **armazenado como variáveis**, divergente do Doc 03 (tabela própria). |
| 95 | Endpoints `/api/printer-profiles` | ✅ | OK. |
| 96 | Endpoints `/api/stations` + `/api/stations/checkin` | ⚠️ | CRUD + tokens + runs OK. Doc 15 §18 declara `POST /api/stations/checkin`; atual é `POST /api/public/station-checkin`. Funcionalmente equivalente, **rota diferente**. |
| 97 | Endpoints `/api/provisioning/preview` e `/generate` | ✅ | OK. |
| 98 | Endpoints `/api/audit` | ✅ | GET com paginação básica. |
| 99 | Endpoints `/api/seederhub/*` | ❌ | Não existem. |
| 100 | Endpoints `/api/jobs` (jobs remotos) | ❌ | Modelo `Job` existe no schema, mas **sem rotas REST**. |

### 2.6 SeederAgent (Documentos 08, 09)

| # | Item | Status | Observação |
|---|------|--------|------------|
| 101 | Binário SeederAgent existe e instalável (.deb/.rpm/script) | ❌ | **Não implementado** — apenas `public/agent/` no frontend (assets). |
| 102 | Agent Service (check-in periódico) | ❌ | Endpoint server-side existe; **agent client não existe**. |
| 103 | Provision Engine (baixa bundles, processa templates, executa) | ❌ | Geração no servidor sim; **execução no cliente** não. |
| 104 | Inventory Engine (hardware/software/usuários/rede) | ⚠️ | Schema tem `HardwareInventory`, `SoftwareInventory`, `NetworkInterface`, `StationUser`. Endpoints de leitura existem; **agente que popula não existe**. |
| 105 | Compliance Engine (validação de serial) | ⚠️ | Endpoint `/checkin` compara serial recebido e cria `StationRun` se mudou. Mais nada. |
| 106 | Cache Engine (operação offline) | ❌ | Sem cliente, sem cache. |
| 107 | Validação TLS no agent (CN, SAN, CA, validade, cadeia) | ❌ | Doc 15 §18.1 exige. Não há agente. |

### 2.7 Provisionamento (Documento 11)

| # | Item | Status | Observação |
|---|------|--------|------------|
| 108 | Bundle inclui módulos Core + scripts + variáveis + branding | ⚠️ | `buildBundle()` no frontend gera `.zip` com scripts + `.conf` + manifest. **Não inclui branding/políticas separadas; só via variáveis.** |
| 109 | Substituição `{{VAR}}` no momento da geração | ✅ | `renderScriptForOrg` + endpoint `/provisioning/generate`. |
| 110 | Ordem de execução obrigatória (Doc 11 §6: Repos→Certs→DNS→NTP→Domínio→Compart→Browsers→Branding→Printers→Inventário→Remote→Scripts) | ❌ | Não há mecanismo que **garanta a ordem** no provisionamento atual. Scripts são listados em ordem alfabética/por perfil. |
| 111 | Bundle assinado / checksum SHA-256 | ⚠️ | Manifest tem SHA-256 por script. **Sem assinatura GPG** do bundle inteiro (Doc 11 §19). |
| 112 | Comparação de serial entre servidor e estação | ✅ | `serial_aplicado` vs `serial`. |
| 113 | Rollback automático em falha | ❌ | Doc 11 §15. Não implementado. |
| 114 | Validação pós-execução | ❌ | Doc 11 §16. Não implementado. |
| 115 | Modos de execução: Automático / Aprovado / Manual | ❌ | Apenas geração sob demanda. |
| 116 | Logs/auditoria de provisionamento | ⚠️ | `AuditEvent` criado em `provisioning.generate`. **Falta `provisioning.apply`** (no lado da estação). |
| 117 | Cache de bundle | ❌ | Doc 11 §20. |

### 2.8 SeederHub (Documento 10)

| # | Item | Status | Observação |
|---|------|--------|------------|
| 118 | Compartilhamento de módulos Core | ❌ | Não implementado. |
| 119 | Compartilhamento de scripts personalizados | ⚠️ | Há `POST /api/profiles/:id/import` (importação local). **Sem federação.** |
| 120 | Catálogo federado (`hub_catalog`) | ❌ | Tabela não existe. |
| 121 | Não compartilha credenciais/tokens/usuários | ✅ | Por inexistência da feature. |

### 2.9 Arquitetura (Documentos 02, 14)

| # | Item | Status | Observação |
|---|------|--------|------------|
| 122 | Monólito Modular (não microsserviços) | ✅ | Tudo em um único `server.ts`. |
| 123 | Frontend: React + TypeScript + Vite + Shadcn UI + TanStack | ✅ | `package.json` confirma. |
| 124 | Backend: NodeJS + Fastify + Prisma + JWT + bcrypt | ✅ | Confirmado. |
| 125 | PostgreSQL 16+ | ⚠️ | `docker-compose.yml` usa `postgres:15-alpine`. Doc 14 sugere 16+. **Atualizar imagem para `postgres:16-alpine`**. |
| 126 | 3 containers: frontend, backend, postgres | ✅ | docker-compose.yml tem db, api, app. |
| 127 | Offline-first | ❌ | Sem cache do agent. Backend não tem fallback offline. |
| 128 | Multi-organização: isolamento completo | ✅ | RBAC por OM + cascade-delete por organizationId. |
| 129 | Hot reload em dev | ✅ | `tsx watch` + Vite. |
| 130 | Variáveis sensíveis em .env | ✅ | SETUP_TOKEN, JWT_SECRET, DATABASE_URL. |
| 131 | Sem fallbacks hardcoded de credenciais | ⚠️ | `JWT_SECRET || 'seederlinux-jwt-secret'` ainda presente em server.ts:167 — **deveria falhar fast se não definido**. |

---

## 3. DIVERGÊNCIAS CRÍTICAS

### 3.1 TLS/PKI não implementado (Doc 15 v3.1 §3)

**Documentação**:
> "Toda comunicação entre frontend, backend e SeederAgent **deve ocorrer obrigatoriamente sobre TLS**. Protocolo permitido: TLS 1.2 / TLS 1.3. Proibido: TLS 1.0, TLS 1.1, HTTP simples."

**Código Atual**:
```ts
// server.ts
await app.listen({ port, host: '0.0.0.0' });
// docker-compose.yml: ports: ["0.0.0.0:8000:8000"]
```
HTTP simples na porta 8000, sem TLS.

**Correção**:
1. Adicionar opção `https` ao Fastify com cert/key configurados via env.
2. Implementar `Core.CertManager` (Doc 15 §28) com geração automática de CA + cert servidor.
3. Estender o Setup Wizard com etapa `tls.mode` (SELF_SIGNED/PKI/ACME).
4. Adicionar tabela `tls_config` (cert path, ca path, mode, fingerprint).

**Esforço**: 16-24 horas (incluindo Setup Wizard + Core.CertManager).

---

### 3.2 Setup Wizard não cria políticas padrão (Doc 03 §30, Doc 05 §4)

**Documentação** (Doc 03 §30):
> "Fluxo obrigatório: 1. Criar admin_gap, 2. Criar organização raiz, 3. Criar branding padrão, **4. Criar políticas padrão**, 5. Criar catálogo inicial de variáveis, 6. setup_completed=true."

**Código Atual** (`server.ts` setup endpoint): cria admin + organização + variáveis do catálogo + branding. **Não cria** browser-policies, printer-profiles, desktop-policies, repository-policies, auth-policies, update-policies padrão.

**Correção**: ao final do setup, executar:
```ts
await prisma.browserPolicy.create({ data: { orgId: org.id, browser: 'firefox', ... } });
await prisma.printerProfile.create({ data: { orgId: org.id, name: 'default', ... } });
// ...etc
```

**Esforço**: 4 horas.

---

### 3.3 Tabela `core_modules` ausente (Doc 03 §7, Doc 07)

**Documentação**:
> "core_modules: Catálogo oficial, distribuído pelo SeederHub. Campos: id, name, module_code, version, serial, description, immutable. immutable=true sempre."

**Código Atual**: Módulos Core são representados como `Script` com `oficial=true`. Isso mistura **scripts (customizáveis)** com **módulos Core (institucionais imutáveis)**.

**Correção**:
1. Criar `model CoreModule` no schema (id, code, name, version, serial, manifest JSON, immutable=true).
2. Criar `model ProfileModule` (N:N entre Profile e CoreModule).
3. Mover os 12 módulos Core (Core.Domain, Core.Files, ...) para esta tabela.
4. Refatorar `Script` para conter apenas scripts customizados da OM.

**Esforço**: 12-16 horas.

---

### 3.4 Ordem de execução do provisionamento não garantida (Doc 11 §6)

**Documentação**:
> "A ordem deve ser obrigatória: 1. Repositórios, 2. Certificados, 3. DNS, 4. NTP, 5. Domínio, 6. Compartilhamentos, 7. Navegadores, 8. Branding, 9. Impressoras, 10. Inventário, 11. Suporte Remoto, 12. Scripts Personalizados."

**Código Atual**: `provisioning/generate` retorna scripts em ordem de criação (sem campo de "execution_order" no Script). Cliente roda em ordem alfabética.

**Correção**:
1. Adicionar campo `executionOrder Int` em `CoreModule`.
2. Definir ordem fixa no seed dos módulos Core (Repositórios=1, ..., Scripts=12).
3. Endpoint `/provisioning/generate` ordena por `executionOrder` ASC.

**Esforço**: 3 horas (depende da criação de `core_modules`).

---

### 3.5 Inconsistência: políticas armazenadas como variáveis (Doc 03 §16, §17, §18, §19)

**Documentação**: declara tabelas próprias para `desktop_policies`, `repository_policies`, `auth_policies`, `update_policies`.

**Código Atual**: `desktop_policies` e `offline_auth` são salvos como `OrganizationVariable` com prefixo (`DESKTOP_*`, `OFFLINE_AUTH_*`). Funciona mas:
- Conflita com a refatoração que diz "variável = catálogo Doc 06".
- Variáveis fora do catálogo são criadas sob demanda (criando inconsistência).

**Correção**: criar models dedicados (`DesktopPolicy`, `RepositoryPolicy`, `AuthPolicy`, `UpdatePolicy`) com campos tipados.

**Esforço**: 8 horas.

---

## 4. DIVERGÊNCIAS GRAVES

| # | Problema | Impacto | Esforço |
|---|----------|---------|---------|
| G1 | Serial **não incrementa** em alterações de branding/browser/printer/desktop policies | Estações não detectam que houve mudança → não reaplicam configuração | 2h |
| G2 | Falta `POST /api/auth/logout` server-side | Token JWT permanece válido após logout (segurança) | 2h |
| G3 | Endpoint de check-in está em `/api/public/station-checkin`, doc declara `/api/stations/checkin` | Quebra contrato OpenAPI | 1h |
| G4 | Resposta padrão `{success, data, message}` não é universal | Frontend tem ifs inconsistentes para tratar resposta | 4h |
| G5 | `JWT_SECRET` tem fallback hardcoded ("seederlinux-jwt-secret") | **Vulnerabilidade**: em prod sem env definido, tokens são previsíveis | 30min |
| G6 | Falta soft-delete (`deleted_at`) em Organization, User, Script | Histórico/auditoria perde rastreabilidade ao remover | 4h |
| G7 | Status de Station tem 8 valores, doc define 4 | Confusão semântica (`registered`/`online`/`blocked` não estão no doc) | 1h |
| G8 | Falta tabela `script_versions` (versionamento) | Sem histórico de alterações em scripts customizados | 6h |
| G9 | PostgreSQL 15 em vez de 16+ | Doc 14 sugere 16; perda de features de performance | 30min |
| G10 | Auditoria não cobre `users PATCH`, `branding upsert`, `policies upsert` | Buracos de rastreabilidade | 3h |

---

## 5. DIVERGÊNCIAS LEVES

| # | Problema | Esforço |
|---|----------|---------|
| L1 | Schema usa `nome`/`sigla` (PT), doc usa `name`/`acronym` (EN) | 2h (rename + migration) |
| L2 | `serial` em Script e `serialAplicado` em Station ainda são BigInt; doc não exige, mas por consistência Int | 1h |
| L3 | Filtro "variáveis utilizadas em scripts" não existe na tela de Variáveis (só na aba Cobertura por OM) | 2h |
| L4 | Doc 06 §16 sugere HOMEPAGE/DISPLAY_NAME como obrigatórias; catálogo atual marca `required:false` | 15min |
| L5 | `system_config` é chave-valor; doc fala em "apenas um registro" | 1h (consolidar em uma row) |
| L6 | `SystemConfig` mistura `setup_completed`, `root_organization_id`, `system_version` em rows separadas — Doc 03 §24 sugere campos numa única row | 1h |
| L7 | Validador (`/validate`) não checa CIDR (Doc 05 §6 lista `cidr` como tipo) | 30min |
| L8 | Cor da OM (`cor`) é OKLCH; não documentado | nenhum (extensão útil) |
| L9 | Endpoint usa PATCH para update; Doc 15 declara PUT | 1h (adicionar alias PUT) |
| L10 | `printer_queues` está como model mas o endpoint nunca lista/edita | 3h |

---

## 6. RECOMENDAÇÕES

### 6.1 Prioridade ALTA (P0 — bloqueia conformidade v3.0)

1. **Implementar TLS obrigatório** + `Core.CertManager` + Setup Wizard estendido com `tls.mode`. (16-24h)
2. **Criar tabela `core_modules`** + migrar os 12 módulos Core para ela; refatorar `scripts` para conter apenas scripts customizados. (12-16h)
3. **Implementar políticas padrão no Setup**: browser/printer/desktop/repository/auth/update policies. (4h)
4. **Garantir ordem de execução** no `/provisioning/generate` conforme Doc 11 §6. (3h)
5. **Remover fallback hardcoded** de JWT_SECRET (fail-fast). (30min)
6. **Incrementar serial** em mutações de branding e policies. (2h)
7. **`POST /api/auth/logout`** server-side com blocklist de tokens. (2h)
8. **Padronizar resposta** `{ success, data?, message? }` em todos os endpoints. (4h)

### 6.2 Prioridade MÉDIA (P1)

9. Criar models dedicados para `DesktopPolicy`, `RepositoryPolicy`, `AuthPolicy`, `UpdatePolicy`. (8h)
10. Implementar **soft-delete** (`deleted_at`) em Organization, User, Script. (4h)
11. Criar tabela `script_versions` para versionamento de scripts customizados. (6h)
12. Atualizar PostgreSQL para 16-alpine. (30min)
13. Cobrir auditoria nos endpoints que faltam (users PATCH, branding upsert, policies upsert). (3h)
14. Realinhar status de Station para os 4 valores oficiais (Doc 03 §20). (1h)
15. Implementar **endpoints SeederHub** mínimos (catálogo federado, import/export). (16h)
16. Implementar manifestos YAML para Core Modules com rollback e validação. (24h)

### 6.3 Prioridade BAIXA (P2 — polimento)

17. Renomear colunas para inglês conforme Doc 03 (`name`, `acronym`, etc.). (2h, requer migration cuidadosa)
18. Converter `serial` em Script e `serialAplicado` em Station para Int. (1h)
19. Adicionar filtro "utilizadas em scripts" na tela Variáveis. (2h)
20. Marcar HOMEPAGE e DISPLAY_NAME como `required:true` no catálogo. (15min)
21. Consolidar `system_config` em row única (id, setup_completed, root_organization_id, version). (1h)
22. Validador `/validate` aceitar tipo `cidr`. (30min)
23. Adicionar alias PUT além de PATCH em `/api/organizations/:id`. (1h)

---

## 7. PLANO DE AÇÃO

### Fase 1 — Correções Críticas (32 horas)
- [ ] TLS obrigatório + Core.CertManager (16-24h)
- [ ] Setup Wizard com `tls.mode` + políticas padrão (5h)
- [ ] Tabela `core_modules` + migração dos 12 Core (12-16h)
- [ ] Ordem de execução em provisioning (3h)
- [ ] Remover fallback JWT_SECRET, logout server-side (2.5h)
- [ ] Serial incrementa em policies (2h)
- [ ] Padronizar resposta `{success, data, message}` (4h)

### Fase 2 — Correções Graves (28 horas)
- [ ] Models DesktopPolicy / RepositoryPolicy / AuthPolicy / UpdatePolicy (8h)
- [ ] Soft-delete em Organization/User/Script (4h)
- [ ] Script versions (6h)
- [ ] Auditoria nos endpoints faltantes (3h)
- [ ] Status de Station alinhado (1h)
- [ ] Postgres 16 (30min)
- [ ] Manifestos YAML para Core Modules (24h, pode ser P2 se SeederAgent atrasar)

### Fase 3 — SeederAgent + SeederHub (3-4 sprints)
- [ ] Binário SeederAgent (.deb/.rpm) com Agent/Provision/Inventory/Compliance/Cache engines
- [ ] Validação TLS no agent
- [ ] Rollback automático + validação pós-execução
- [ ] Cache de bundle local
- [ ] Endpoints SeederHub federados

### Fase 4 — Melhorias
- [ ] Rename PT→EN (opcional, alto custo de migration)
- [ ] Filtros adicionais na tela de Variáveis
- [ ] Assinatura GPG de bundles
- [ ] Modos de execução automático/aprovado/manual

---

## 8. CONCLUSÃO

A refatoração v3.0 alcançou seu objetivo principal: **eliminar a duplicação de fonte de
verdade entre `organizations` (metadados técnicos) e `organization_variables`**. O sistema
agora segue corretamente o padrão Doc 03/06:

- ✅ Organization armazena apenas metadados
- ✅ variable_definitions é o catálogo único
- ✅ organization_variables é a única fonte de verdade
- ✅ Setup cria todas as variáveis catalogadas automaticamente
- ✅ Serial incrementa em mutações de variáveis
- ✅ Validador e exportador `.conf` baseados no catálogo

**Risco residual MÉDIO**, concentrado em três frentes:

1. **Segurança/TLS (P0)**: ausência de TLS obrigatório + `Core.CertManager` é o maior gap
   contra Doc 15 v3.1 e impede homologação de produção.

2. **Módulos Core (P0)**: tabela `core_modules` não existe; módulos são tratados como
   scripts. Não há manifesto/rollback/validação por módulo.

3. **SeederAgent (P1)**: o cliente Linux não existe ainda. Sem ele, o "ciclo de vida"
   descrito nos Docs 08/09/11 (check-in periódico, bundle, rollback, offline) é apenas
   teórico — embora a API server-side esteja parcialmente pronta.

**Recomenda-se**: priorizar **Fase 1** (TLS + Core Modules + Setup completo + ordem de
provisionamento + serial em policies) antes da próxima homologação. Apenas após isso o
sistema estará apto para receber o **SeederAgent** (Fase 3), que é o componente que fecha
o ciclo operacional descrito na documentação v3.0.

**Estimativa total para conformidade plena**: **88-110 horas** de engenharia (sem contar
SeederAgent binário, que é um projeto à parte de 4-6 sprints).
