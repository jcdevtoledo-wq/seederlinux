

## 🌱 README.md - VERSÃO ATUALIZADA

```markdown
# 🌱 SeederLinux

**Plataforma institucional de provisionamento, padronização, automação e gerenciamento de estações Linux**

---

## 📌 Visão Geral

O **SeederLinux** é uma plataforma local e escalável para administração de estações Linux em ambientes:

* corporativos
* militares
* governamentais
* educacionais

Ele substitui processos manuais de configuração por uma arquitetura baseada em:

* automação por módulos CORE
* políticas por organização (OM)
* execução controlada por API
* operação offline-first
* governança centralizada (GAP)

---

## 🎯 Objetivo

Transformar a gestão de estações Linux em um processo:

> rápido, padronizado, auditável e replicável entre organizações.

---

## 🚀 Problema que Resolve

Ambientes Linux institucionais enfrentam:

* configuração manual repetitiva
* baixa padronização entre unidades
* ausência de controle centralizado
* dificuldade de escalar infraestrutura
* dependência de conhecimento local

---

## 💡 Proposta de Valor

* Provisionamento automatizado de estações Linux
* Padronização institucional por OM
* Controle central de políticas (GAP)
* Execução modular via CORE system
* Operação offline-first
* Escalabilidade multi-organização
* Auditoria completa de ações

---

## 📚 Documentação Oficial

A documentação completa do SeederLinux V3.0 está disponível no diretório [`docs/`](docs/):

| Documento | Descrição |
|-----------|-----------|
| [01 - PRD](docs/01-prd.md) | Visão do produto, objetivos e requisitos |
| [02 - Arquitetura do Sistema](docs/02-arquitetura-sistema.md) | Arquitetura geral do sistema |
| [03 - Modelo de Dados](docs/03-modelo-dados.md) | Modelo de dados e entidades |
| [04 - Módulos Core](docs/04-modulos-core.md) | Arquitetura funcional dos módulos Core |
| [05 - Regras de Negócio](docs/05-regras-negocio.md) | Regras de negócio e fluxos operacionais |
| [06 - Catálogo de Variáveis](docs/06-catalogo-variaveis.md) | Catálogo oficial de variáveis |
| [07 - Catálogo de Módulos Core](docs/07-catalogo-modulos-core.md) | Catálogo oficial de módulos Core |
| [08 - Arquitetura do SeederAgent](docs/08-arquitetura-seederagent.md) | Arquitetura do agente e check-in |
| [09 - Arquitetura dos Agentes](docs/09-arquitetura-agentes.md) | Arquitetura detalhada dos agentes |
| [10 - Arquitetura do SeederHub](docs/10-arquitetura-seederhub.md) | Plataforma federada de distribuição |
| [11 - Provisionamento e Bundles](docs/11-provisionamento-bundles.md) | Arquitetura de provisionamento |
| [12 - Modelo de Dados (ERD)](docs/12-modelo-dados-erd.md) | ERD e estrutura de banco |
| [13 - Roadmap](docs/13-roadmap.md) | Plano de evolução do produto |
| [14 - Arquitetura Técnica](docs/14-arquitetura-tecnica.md) | Especificação técnica completa |
| [15 - API Specification](docs/15-api-specification.md) | OpenAPI completo |
| [16 - Fluxos Funcionais](docs/16-fluxos-funcionais.md) | Jornadas de usuário e UML lógico |

---

## 🧠 Arquitetura do Sistema

### Visão geral

```
Frontend (React + TypeScript)
        ↓
Backend (Fastify + Prisma)
        ↓
PostgreSQL (16+)
        ↓
SeederAgent (estações Linux)
```

### Componentes

| Componente | Tecnologia | Porta |
|------------|------------|-------|
| Frontend | React + TypeScript + Vite | 3000 |
| Backend | Node.js + Fastify + Prisma | 8000 |
| Banco | PostgreSQL 16 | 5432 |

### Containerização

```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://...
  postgres:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=...
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

---

## ⚙️ CORE SYSTEM (Motor do SeederLinux)

### Principais módulos

| Módulo | Descrição |
|--------|-----------|
| CORE-001 | Provisionamento de estações |
| CORE-002 | Integração AD / LDAP |
| CORE-003 | DNS institucional |
| CORE-004 | NTP |
| CORE-005 | Proxy |
| CORE-006 | Branding |
| CORE-007 | Pacotes base |
| CORE-008 | Impressoras |
| CORE-009 | Inventário |
| CORE-010 | Check-in |
| CORE-011 | Hardening |
| CORE-012 | Atualização controlada |

---

## 🔐 Perfis de Usuário (Matriz Oficial)

| Perfil | Escopo | Função |
|--------|--------|--------|
| **Admin GAP** | Global | Governança total do sistema |
| **Admin OM** | Local | Administração da organização |
| **Operador** | Local | Execução operacional controlada |
| **Auditor** | Global | Apenas leitura e fiscalização |

---

## 🔄 Fluxos Principais

### 1. Setup Inicial
* criação da OM raiz
* definição de variáveis base
* execução de CORE inicial
* ativação do sistema

### 2. Login
* autenticação JWT
* resolução de contexto OM
* carregamento de permissões
* sessão operacional ativa

### 3. Provisionamento
* criação de estação
* seleção de perfil
* execução CORE sequencial
* integração AD automática
* registro no inventário
* check-in inicial

### 4. Check-in Contínuo
* heartbeat da estação (15 min)
* validação de compliance
* execução de ações remotas
* sincronização de estado

### 5. Atualizações
* políticas centralizadas
* janelas de manutenção
* execução via CORE-012
* rollback controlado

### 6. Sincronização Offline-First
* execução local independente
* fila de eventos offline
* sincronização posterior com backend
* resolução de conflitos por prioridade GAP

---

## 🔒 Segurança

* **Autenticação:** JWT stateless com refresh token
* **Senhas:** bcrypt (Argon2id planejado)
* **RBAC:** Controle de acesso por perfil e OM
* **Transporte:** TLS 1.2+ obrigatório (HTTPS)
* **Auditoria:** Logs imutáveis de todas as ações
* **Offline:** Cache de credenciais (SSSD/Winbind)

---

## 📡 API (Visão Geral)

```
/api/auth      - Autenticação
/api/oms       - Organizações
/api/core      - Execução de módulos CORE
/api/provision - Provisionamento
/api/inventory - Inventário
/api/client    - Check-in do agente
/api/variables - Variáveis
/api/printers  - Impressoras
/api/audit     - Auditoria
/api/hub       - SeederHub (futuro)
```

---

## 🏢 Conceito de Organização (OM)

Cada OM possui isolamento completo:

* DNS próprio
* políticas próprias
* variáveis independentes
* branding exclusivo
* estações vinculadas
* scripts aplicáveis

---

## 🗺️ Roadmap

### 🟢 Fase 1 – MVP (Versão 3.0)
* sistema local funcional
* provisioning completo
* integração AD
* inventário e branding
* auditoria básica

### 🟡 Fase 2 – Multi-OM (3.1 - 3.3)
* isolamento completo entre organizações
* templates por OM
* CORE versionado
* políticas dinâmicas
* Desired State Management

### 🟠 Fase 3 – Plataforma Institucional (3.4 - 4.0)
* automação avançada
* self-healing
* CORE chaining
* compliance automático
* auditoria imutável
* Mirror Manager

### 🔴 Fase 4 – SeederHub (4.2+)
* sincronização entre instituições
* marketplace de CORE modules
* políticas distribuídas
* operação federada offline-first

### 🔵 Fase 5 – Desired State Management (5.0)
* compliance contínuo
* correção automática
* drift detection
* remediação automática

---

## 📂 Estrutura do Projeto

```
seederlinux/
├── docs/                          # 📚 Documentação completa
│   ├── 01-prd.md
│   ├── 02-arquitetura-sistema.md
│   ├── ...
│   └── 16-fluxos-funcionais.md
│
├── frontend/                      # 🖥️ React + TypeScript
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/                       # ⚙️ Fastify + Prisma
│   ├── src/
│   │   ├── modules/
│   │   ├── common/
│   │   └── core/
│   ├── prisma/
│   └── package.json
│
├── agent/                         # 🤖 SeederAgent (Go)
│   ├── cmd/
│   ├── internal/
│   └── go.mod
│
├── docker-compose.yml
└── README.md
```

---

## 🧠 Princípios de Design

* ✅ **Offline-first** por padrão
* ✅ **Zero configuração manual** em escala
* ✅ **Governança central** (GAP)
* ✅ **Execução modular** (CORE)
* ✅ **Multi-OM isolado**
* ✅ **Auditoria obrigatória**
* ✅ **Automação como regra**, não exceção
* ✅ **TLS-first** e **CA-native**

---

## 📊 Status do Projeto

| Item | Status |
|------|--------|
| Arquitetura | ✅ Definida (V3.0) |
| CORE System | ✅ Definido (11 módulos) |
| APIs | ✅ Definidas (OpenAPI) |
| Fluxos | ✅ Definidos (16 fluxos) |
| UI Governance | ✅ Definida |
| Modelo de Dados | ✅ Definido (23 tabelas) |
| MVP | 🚧 Em construção |
| SeederHub | ⏳ Futuro (Fase 4) |

---

## 🧭 Filosofia do Sistema

> "Uma estação Linux institucional não deve ser configurada — deve ser provisionada."

---

## 📜 Licença

Projeto institucional (uso interno / controlado por implantação).

---

## 🤝 Contribuição

Modelo atual:

* arquitetura fechada
* evolução controlada
* expansão via SeederHub
* versionamento estruturado

---

## 📞 Contato

Para mais informações, consulte a [documentação completa](docs/) ou entre em contato com a equipe de governança GAP.

---

**Versão:** 3.0
**Data:** Junho/2026
**Status:** Oficial

---

> 🌱 *SeederLinux - Semeando Padronização, Colhendo Automação.*
```

---
