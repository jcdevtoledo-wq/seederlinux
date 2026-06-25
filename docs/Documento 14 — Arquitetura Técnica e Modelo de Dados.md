
# Documento 14 — Arquitetura Técnica e Modelo de Dados

## SeederLinux / SoftwareLivre

### Versão 3.0

---

# 1. Objetivo

Definir a arquitetura técnica oficial do SeederLinux.

Este documento descreve:

* arquitetura do sistema
* componentes
* comunicação
* modelo de dados
* entidades
* relacionamentos
* princípios de desenvolvimento

Este documento é a principal referência para desenvolvedores.

---

# 2. Arquitetura Geral

O SeederLinux adota arquitetura:

## Monólito Modular

Estrutura:

```text
Frontend
   ↓
API Backend
   ↓
PostgreSQL
```

Componentes:

```text
+----------------------+
| React Frontend       |
+----------+-----------+
           |
           v
+----------------------+
| Fastify API          |
+----------+-----------+
           |
           v
+----------------------+
| PostgreSQL           |
+----------------------+
```

---

# 3. Infraestrutura Oficial

## Containers

Obrigatórios:

```text
frontend
backend
postgres
```

Não utilizar:

```text
Supabase
Firebase
Redis
Kafka
RabbitMQ
Serviços Cloud
```

---

# 4. Tecnologias Oficiais

## Frontend

```text
React
TypeScript
Vite
Shadcn UI
TanStack Router
TanStack Query
```

---

## Backend

```text
NodeJS
Fastify
Prisma ORM
JWT
bcrypt
```
Versões mínimas obrigatórias:

Node.js 18 LTS ou superior

PostgreSQL 16 ou superior


---

## Banco

```text
PostgreSQL 16+
```

---

# 5. Conceito Central

Tudo no SeederLinux gira em torno da Organização.

Estrutura:

```text
Organização
 ├─ Usuários
 ├─ Variáveis
 ├─ Scripts
 ├─ Perfis
 ├─ Branding
 ├─ Estações
 └─ Auditoria
```

---

# 6. Entidade Organization

Representa uma OM.

Campos:

```text
id
name
sigla
description
domain
netbios
active
created_at
updated_at
```

---

# 7. Entidade User

Representa usuários do sistema.

Campos:

```text
id
name
email
password_hash
role
organization_id
active
created_at
updated_at
```

---

# 8. Perfis de Acesso

## admin_gap

Permissões:

```text
Tudo
```

---

## operador_om

Permissões:

```text
Somente sua OM
```

---

## auditor

Permissões:

```text
Somente leitura
```

---

# 9. Entidade Variable

Catálogo de variáveis.

Campos:

```text
id
organization_id
name
description
type
value
required
category
created_at
updated_at
```

---

# 10. Tipos de Variáveis

Permitidos:

```text
STRING
INTEGER
BOOLEAN
ARRAY
JSON
PASSWORD
URL
IP
CIDR
```

---

# 11. Entidade Script

Representa módulos ou scripts.

Campos:

```text
id
organization_id
name
description
category
type
content
version
serial
immutable
hash
created_at
updated_at
```

---

# 12. Tipos de Script

## Core

Imutável.

```text
CORE
```

---

## Personalizado

Editável.

```text
CUSTOM
```

---

# 13. Entidade Deploy Profile

Agrupa módulos.

Campos:

```text
id
organization_id
name
description
active
created_at
updated_at
```

Relacionamento:

```text
Profile
   ↓
Scripts
```

---

# 14. Entidade Branding

Configura identidade visual.

Campos:

```text
id
organization_id
display_name
logo_url
wallpaper_url
wallpaper_login_url
greeter_url
desktop_theme
conky_enabled
shortcuts_enabled
created_at
updated_at
```

---

# 15. Entidade Browser Policy

Campos:

```text
id
organization_id
homepage
proxy_url
proxy_port
proxy_bypass
firefox_policy
chromium_policy
chrome_policy
java_exceptions
created_at
updated_at
```

---

# 16. Entidade Desktop Policy

Campos:

```text
id
organization_id
theme
sounds_enabled
power_policy
lock_timeout
created_at
updated_at
```

---

# 17. Entidade Printer Profile

Campos:

```text
id
organization_id
cups_server
default_printer
printer_list
created_at
updated_at
```

---

# 18. Entidade Station

Representa estação Linux.

Campos:

```text
id
organization_id
hostname
serial_number
os_name
os_version
ip_address
mac_address
last_checkin
status
configuration_serial
created_at
updated_at
```

---

# 19. Status de Estação

Valores:

```text
ONLINE
OFFLINE
DELAYED
NEVER_CONNECTED
ERROR
```

---

# 20. Entidade Station Token

Autenticação do agente.

Campos:

```text
id
station_id
token_hash
expires_at
created_at
```

---

# 21. Entidade Provisioning Run

Registro de provisionamento.

Campos:

```text
id
station_id
profile_id
status
started_at
finished_at
output
```

---

# 22. Entidade Audit Event

Auditoria obrigatória.

Campos:

```text
id
organization_id
user_id
entity_type
entity_id
action
old_data
new_data
created_at
```

---

# 23. Entidade System Config

Configurações globais.

Campos:

```text
id
setup_completed
default_repository_mode
mirror_enabled
created_at
updated_at
```

---

# 24. Relacionamentos

```text
Organization 1:N Users

Organization 1:N Variables

Organization 1:N Scripts

Organization 1:N Profiles

Organization 1:N Stations

Organization 1:N Branding

Organization 1:N Policies

Organization 1:N Audit Events
```

---

# 25. Serial de Configuração

Cada OM possui:

```text
configuration_serial
```

Incrementado quando ocorrer:

```text
alteração de variável
alteração de branding
alteração de política
alteração de perfil
```

Não incrementa:

```text
acesso
consulta
auditoria
```

---

# 26. Fluxo de Provisionamento

```text
Perfil
 ↓

Scripts
 ↓

Substituição de Variáveis
 ↓

Bundle Final
 ↓

SeederAgent
 ↓

Execução
```

---

# 27. Fluxo de Check-in

```text
SeederAgent
 ↓
API
 ↓
Atualiza inventário
 ↓
Verifica serial
 ↓
Recebe jobs
```

---

# 28. Cache Offline de Credenciais

Campos:

```text
offline_login_enabled
offline_login_days
```

Aplicado através:

```text
SSSD
Winbind
```

---

# 29. Repositórios Linux

Modos suportados:

```text
PUBLIC
MIRROR
HYBRID
CUSTOM
```

Entidade:

```text
RepositoryProfile
```

Campos:

```text
id
organization_id
distribution
mode
url
gpg_key
enabled
```

---

# 30. Mirror Manager (Futuro)

Entidade:

```text
MirrorJob
```

Campos:

```text
id
distribution
estimated_size
actual_size
status
last_sync
```

---

# 31. SeederHub (Futuro)

Entidade:

```text
HubPackage
```

Campos:

```text
id
name
type
version
serial
hash
signature
publisher
```

---

# 32. Requisitos de Desenvolvimento

Todo código deverá:

* utilizar TypeScript
* possuir tipagem forte
* possuir validação backend
* possuir auditoria
* respeitar RBAC
* respeitar isolamento por organização

---

# 33. Requisitos de Banco

Obrigatórios:

```text
foreign keys
índices
constraints
soft delete quando aplicável
timestamps automáticos
```

---

# 34. Critérios de Aceitação

Uma versão somente poderá ser considerada concluída quando:

* build frontend funcionar
* build backend funcionar
* docker-compose subir sem erros
* setup wizard funcionar
* login funcionar
* auditoria funcionar
* organização puder ser criada
* estação puder realizar check-in

---

# 35. Encerramento

Esta arquitetura define a implementação oficial do SeederLinux Versão 3.0 e deve ser utilizada como referência para:

* Bolt
* Cursor
* Windsurf
* Lovable
* Desenvolvimento manual

Qualquer implementação futura deverá manter compatibilidade com este modelo arquitetural.

---

**Fim do Documento 14 — Arquitetura Técnica e Modelo de Dados (Versão 3.0)**