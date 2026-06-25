# Documento 03 – Modelo de Dados

# SeederLinux

Versão 3.0
Status: Oficial
Data: Junho/2026

---

# 1. Objetivo

Definir o modelo de dados oficial do SeederLinux.

Este documento estabelece:

* entidades
* relacionamentos
* responsabilidades
* regras de persistência

Nenhuma implementação poderá divergir deste modelo sem revisão formal.

---

# 2. Princípios

O banco de dados deverá utilizar:

PostgreSQL 16+

---

Características obrigatórias:

* UUID como chave primária
* Soft Delete quando aplicável
* Auditoria obrigatória
* Multi-organização
* Integridade referencial

---

# 3. Entidade Central

A Organização (OM) é o núcleo do sistema.

Praticamente todos os registros pertencem a uma organização.

Relacionamento principal:

Organização
↓
Usuários
Perfis
Variáveis
Branding
Estações
Scripts Personalizados
Políticas

---

# 4. organizations

Representa uma Organização Militar.

Campos:

id
uuid

name
varchar(200)

acronym
varchar(50)

description
text

active
boolean

serial_config
integer

created_at
timestamp

updated_at
timestamp

deleted_at
timestamp

---

Restrições:

acronym deve ser única.

---

Exemplo:

COMARA

GAP-BR

CENCIAR

EMAER

---

# 5. users

Usuários do sistema.

Campos:

id

organization_id

name

email

password_hash

role

active

last_login

created_at

updated_at

deleted_at

---

Roles permitidas:

admin_gap

operador_om

auditor

---

Regras:

admin_gap pode possuir organization_id nulo.

operador_om deve possuir organização.

auditor pode ser global.

---

# 6. organization_variables

Variáveis pertencentes a uma organização.

Campos:

id

organization_id

name

value

description

data_type

category

required

created_at

updated_at

---

Exemplos:

DOMINIO

DNS_PRIMARIO

DC_IP

PROXY_URL

OCS_SERVER

---

# 7. core_modules

Catálogo oficial.

Distribuído pelo SeederHub.

Campos:

id

name

module_code

version

serial

description

immutable

created_at

updated_at

---

Exemplos:

Core.Domain

Core.Files

Core.Browser

Core.Branding

Core.Inventory

Core.Remote

Core.Printers

Core.Certificates

Core.Authentication

Core.Repositories

Core.Updates

Core.Time

---

immutable = true

sempre.

---

# 8. scripts

Scripts customizados.

Campos:

id

organization_id

name

description

category

content

version

serial

enabled

created_at

updated_at

deleted_at

---

immutable = false

sempre.

---

# 9. profiles

Perfis de Deploy.

Campos:

id

organization_id

name

description

active

created_at

updated_at

---

Exemplos:

Desktop Administrativo

Desktop Engenharia

Desktop Operacional

Servidor Aplicação

---

# 10. profile_modules

Relaciona perfis aos módulos Core.

Campos:

id

profile_id

core_module_id

created_at

---

# 11. profile_scripts

Relaciona perfis aos scripts customizados.

Campos:

id

profile_id

script_id

created_at

---

# 12. branding_config

Identidade visual.

Campos:

id

organization_id

display_name

logo_url

wallpaper_url

wallpaper_login_url

greeter_url

gtk_theme

conky_enabled

conky_profile

shortcuts_enabled

created_at

updated_at

---

# 13. browser_policies

Políticas corporativas.

Campos:

id

organization_id

homepage

proxy_url

proxy_mode

telemetry_enabled

updates_enabled

java_exceptions

created_at

updated_at

---

# 14. printer_policies

Campos:

id

organization_id

cups_server

default_printer

created_at

updated_at

---

# 15. printer_queues

Campos:

id

printer_policy_id

name

uri

is_default

created_at

updated_at

---

# 16. desktop_policies

Campos:

id

organization_id

gtk_theme

icon_theme

sound_theme

power_management

screen_lock

created_at

updated_at

---

# 17. repository_policies

Configuração de repositórios.

Campos:

id

organization_id

mode

repository_url

gpg_key

proxy

created_at

updated_at

---

Valores possíveis:

internet

corporativo

herdado

---

# 18. auth_policies

Políticas de autenticação.

Campos:

id

organization_id

offline_login_enabled

offline_login_days

offline_login_users

created_at

updated_at

---

# 19. update_policies

Políticas de atualização.

Campos:

id

organization_id

auto_updates

update_window

update_channel

update_source

created_at

updated_at

---

# 20. stations

Inventário de estações.

Campos:

id

organization_id

hostname

serial_number

operating_system

distribution

ip_address

mac_address

last_checkin

status

agent_version

configuration_serial

token

created_at

updated_at

---

Status possíveis:

never

ok

late

error

---

# 21. station_runs

Histórico de execução.

Campos:

id

station_id

profile_id

status

started_at

finished_at

output

created_at

---

# 22. station_tokens

Tokens utilizados pelos agentes.

Campos:

id

station_id

token

active

expires_at

created_at

---

# 23. audit_events

Auditoria global.

Campos:

id

organization_id

user_id

entity

entity_id

action

old_value

new_value

ip_address

created_at

---

Ações:

create

update

delete

login

logout

execute

deploy

rollback

---

# 24. system_config

Configurações globais.

Campos:

id

setup_completed

root_organization_id

created_at

updated_at

---

Apenas um registro deve existir.

---

# 25. setup_state

Controle do Setup Wizard.

Campos:

id

completed

completed_at

completed_by

created_at

---

Apenas um registro.

---

# 26. hub_catalog

Itens sincronizados pelo SeederHub.

Campos:

id

source_gap

item_type

item_name

version

serial

received_at

---

# 27. Relacionamentos Principais

organizations

1:N users

1:N organization_variables

1:N profiles

1:N stations

1:N branding_config

1:N scripts

1:N audit_events

---

profiles

N:N core_modules

N:N scripts

---

stations

1:N station_runs

1:N station_tokens

---

# 28. Regras de Integridade

Uma organização não pode ser removida se possuir:

* usuários
* perfis
* estações

---

Um perfil não pode ser removido se estiver atribuído a estações.

---

Um Script Core nunca pode ser editado.

---

Uma variável nunca pertence ao script.

---

A alteração de variáveis não altera scripts.

---

# 29. Regras de Serialização

Incrementam serial_config:

* variáveis
* branding
* políticas
* perfis
* repositórios

---

Não incrementam:

* login
* auditoria
* consultas
* inventário

---

# 30. Setup Wizard

Fluxo obrigatório:

1. Criar admin_gap

2. Criar organização raiz

3. Criar branding padrão

4. Criar políticas padrão

5. Criar catálogo inicial de variáveis

6. setup_completed = true

---

Após concluído:

/setup deve permanecer bloqueado permanentemente.







FIM DO DOCUMENTO 03