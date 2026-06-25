# Documento 12 – Modelo de Dados (ERD e Estrutura de Banco)

## SeederLinux – Versão 3.0

---

# 1. Objetivo

Este documento define o modelo de dados oficial do SeederLinux.

Ele estabelece:

* entidades
* relacionamentos
* regras de integridade
* chaves
* índices
* auditoria
* versionamento

O banco oficial da plataforma é:

```text
PostgreSQL 16+
```

---

# 2. Princípios

O banco deve suportar:

* multi-organização
* auditoria completa
* versionamento
* operação offline-first
* escalabilidade

Toda informação operacional deve estar vinculada a uma Organização.

---

# 3. Visão Geral do ERD

```text
Users
    |
    +---- Organizations
                |
                +---- OrganizationVariables
                |
                +---- BrandingConfigs
                |
                +---- DeployProfiles
                |
                +---- Stations
                |
                +---- Scripts
                |
                +---- RepositoryConfigs
                |
                +---- BrowserPolicies
                |
                +---- DesktopPolicies
                |
                +---- PrinterProfiles
```

Tabelas globais:

```text
AuditEvents
SystemConfig
SeederHubCatalog
CoreModules
```

---

# 4. Tabela Organizations

Representa uma Organização Militar.

```sql
organizations
```

Campos:

| Campo      | Tipo         |
| ---------- | ------------ |
| id         | UUID         |
| sigla      | VARCHAR(20)  |
| nome       | VARCHAR(255) |
| descricao  | TEXT         |
| ativo      | BOOLEAN      |
| serial     | BIGINT       |
| created_at | TIMESTAMP    |
| updated_at | TIMESTAMP    |

---

## Regras

```text
sigla única
serial obrigatório
```

---

# 5. Tabela Users

Usuários do sistema.

```sql
users
```

Campos:

| Campo           | Tipo         |
| --------------- | ------------ |
| id              | UUID         |
| organization_id | UUID         |
| nome            | VARCHAR(255) |
| email           | VARCHAR(255) |
| senha_hash      | TEXT         |
| role            | VARCHAR(50)  |
| ativo           | BOOLEAN      |
| ultimo_login    | TIMESTAMP    |
| created_at      | TIMESTAMP    |

---

## Roles

```text
admin_gap
operador_om
auditor
```

---

# 6. Tabela OrganizationVariables

Catálogo de variáveis.

```sql
organization_variables
```

Campos:

| Campo           | Tipo         |
| --------------- | ------------ |
| id              | UUID         |
| organization_id | UUID         |
| nome            | VARCHAR(100) |
| tipo            | VARCHAR(50)  |
| valor           | TEXT         |
| descricao       | TEXT         |
| categoria       | VARCHAR(100) |
| created_at      | TIMESTAMP    |

---

## Exemplo

```text
DNS_PRIMARIO
10.132.75.27
```

---

# 7. Tabela CoreModules

Módulos oficiais.

```sql
core_modules
```

Campos:

| Campo         | Tipo         |
| ------------- | ------------ |
| id            | UUID         |
| nome          | VARCHAR(255) |
| identificador | VARCHAR(255) |
| versao        | VARCHAR(50)  |
| serial        | BIGINT       |
| descricao     | TEXT         |
| imutavel      | BOOLEAN      |
| hash          | VARCHAR(255) |
| created_at    | TIMESTAMP    |

---

## Regra

```text
imutavel = true
```

---

# 8. Tabela Scripts

Scripts personalizados.

```sql
scripts
```

Campos:

| Campo           | Tipo         |
| --------------- | ------------ |
| id              | UUID         |
| organization_id | UUID         |
| nome            | VARCHAR(255) |
| descricao       | TEXT         |
| conteudo        | TEXT         |
| categoria       | VARCHAR(100) |
| versao          | VARCHAR(50)  |
| serial          | BIGINT       |
| hash            | VARCHAR(255) |
| rollback_script | TEXT         |
| created_at      | TIMESTAMP    |

---

# 9. Tabela ScriptVersions

Histórico de versões.

```sql
script_versions
```

Campos:

| Campo      | Tipo         |
| ---------- | ------------ |
| id         | UUID         |
| script_id  | UUID         |
| versao     | VARCHAR(50)  |
| conteudo   | TEXT         |
| hash       | VARCHAR(255) |
| created_at | TIMESTAMP    |

---

# 10. Tabela DeployProfiles

Perfis de Deploy.

```sql
deploy_profiles
```

Campos:

| Campo           | Tipo         |
| --------------- | ------------ |
| id              | UUID         |
| organization_id | UUID         |
| nome            | VARCHAR(255) |
| descricao       | TEXT         |
| ativo           | BOOLEAN      |
| serial          | BIGINT       |
| created_at      | TIMESTAMP    |

---

# 11. Tabela ProfileModules

Relaciona perfis e módulos.

```sql
profile_modules
```

Campos:

| Campo      | Tipo |
| ---------- | ---- |
| profile_id | UUID |
| module_id  | UUID |

---

# 12. Tabela ProfileScripts

Relaciona perfis e scripts.

```sql
profile_scripts
```

Campos:

| Campo      | Tipo |
| ---------- | ---- |
| profile_id | UUID |
| script_id  | UUID |

---

# 13. Tabela Stations

Inventário de estações.

```sql
stations
```

Campos:

| Campo           | Tipo         |
| --------------- | ------------ |
| id              | UUID         |
| organization_id | UUID         |
| hostname        | VARCHAR(255) |
| station_token   | UUID         |
| sistema         | VARCHAR(100) |
| versao_so       | VARCHAR(100) |
| ip              | VARCHAR(50)  |
| mac             | VARCHAR(50)  |
| status          | VARCHAR(50)  |
| ultimo_checkin  | TIMESTAMP    |
| serial_aplicado | BIGINT       |
| created_at      | TIMESTAMP    |

---

## Status

```text
ok
atrasada
erro
nunca
```

---

# 14. Tabela StationRuns

Histórico de provisionamentos.

```sql
station_runs
```

Campos:

| Campo      | Tipo        |
| ---------- | ----------- |
| id         | UUID        |
| station_id | UUID        |
| serial     | BIGINT      |
| resultado  | VARCHAR(50) |
| log        | TEXT        |
| inicio     | TIMESTAMP   |
| fim        | TIMESTAMP   |

---

# 15. Tabela BrandingConfigs

Branding da OM.

```sql
branding_configs
```

Campos:

| Campo               | Tipo         |
| ------------------- | ------------ |
| id                  | UUID         |
| organization_id     | UUID         |
| display_name        | VARCHAR(255) |
| wallpaper_url       | TEXT         |
| wallpaper_login_url | TEXT         |
| logo_url            | TEXT         |
| greeter_url         | TEXT         |
| theme               | VARCHAR(100) |
| conky_enabled       | BOOLEAN      |
| shortcuts_enabled   | BOOLEAN      |
| created_at          | TIMESTAMP    |

---

# 16. Tabela BrowserPolicies

Políticas de navegadores.

```sql
browser_policies
```

Campos:

| Campo           | Tipo  |
| --------------- | ----- |
| id              | UUID  |
| organization_id | UUID  |
| homepage        | TEXT  |
| proxy_url       | TEXT  |
| pac_url         | TEXT  |
| firefox_policy  | JSONB |
| chrome_policy   | JSONB |
| chromium_policy | JSONB |
| java_exceptions | JSONB |

---

# 17. Tabela DesktopPolicies

Políticas de desktop.

```sql
desktop_policies
```

Campos:

| Campo           | Tipo         |
| --------------- | ------------ |
| id              | UUID         |
| organization_id | UUID         |
| gtk_theme       | VARCHAR(255) |
| icon_theme      | VARCHAR(255) |
| sounds_enabled  | BOOLEAN      |
| power_policy    | JSONB        |
| shortcuts       | JSONB        |

---

# 18. Tabela PrinterProfiles

Perfis de impressão.

```sql
printer_profiles
```

Campos:

| Campo           | Tipo         |
| --------------- | ------------ |
| id              | UUID         |
| organization_id | UUID         |
| cups_server     | TEXT         |
| default_printer | VARCHAR(255) |
| printers        | JSONB        |

---

# 19. Tabela RepositoryConfigs

Configuração de repositórios.

```sql
repository_configs
```

Campos:

| Campo           | Tipo        |
| --------------- | ----------- |
| id              | UUID        |
| organization_id | UUID        |
| mode            | VARCHAR(50) |
| repository_url  | TEXT        |
| mirror_enabled  | BOOLEAN     |
| created_at      | TIMESTAMP   |

---

## Valores de Mode

```text
default
internet
mirror
custom
```

---

# 20. Tabela OfflineAuthPolicies

Cache de credenciais.

```sql
offline_auth_policies
```

Campos:

| Campo           | Tipo    |
| --------------- | ------- |
| id              | UUID    |
| organization_id | UUID    |
| enabled         | BOOLEAN |
| offline_days    | INTEGER |
| max_logins      | INTEGER |

---

# 21. Tabela SeederHubCatalog

Catálogo federado.

```sql
seederhub_catalog
```

Campos:

| Campo              | Tipo         |
| ------------------ | ------------ |
| id                 | UUID         |
| tipo               | VARCHAR(50)  |
| nome               | VARCHAR(255) |
| autor              | VARCHAR(255) |
| organizacao_origem | VARCHAR(255) |
| versao             | VARCHAR(50)  |
| hash               | VARCHAR(255) |
| publicado_em       | TIMESTAMP    |

---

# 22. Tabela AuditEvents

Auditoria global.

```sql
audit_events
```

Campos:

| Campo           | Tipo         |
| --------------- | ------------ |
| id              | UUID         |
| usuario_id      | UUID         |
| organization_id | UUID         |
| entidade        | VARCHAR(100) |
| entidade_id     | UUID         |
| acao            | VARCHAR(50)  |
| detalhes        | JSONB        |
| timestamp       | TIMESTAMP    |

---

## Ações

```text
CREATE
UPDATE
DELETE
IMPORT
EXPORT
DEPLOY
LOGIN
LOGOUT
```

---

# 23. Tabela SystemConfig

Configurações globais.

```sql
system_config
```

Campos:

| Campo | Tipo         |
| ----- | ------------ |
| chave | VARCHAR(255) |
| valor | TEXT         |

---

## Exemplos

```text
setup_completed
setup_date
system_version
default_checkin_interval
```

---

# 24. Índices Obrigatórios

```sql
organizations.sigla
users.email
stations.hostname
stations.station_token
scripts.nome
audit_events.timestamp
```

---

# 25. Resultado Esperado

Este modelo deve permitir:

* multi-organização real
* provisionamento escalável
* versionamento de scripts
* controle de módulos
* gestão de branding
* gestão de políticas
* inventário de estações
* cache de autenticação
* gestão de repositórios
* integração com SeederHub
* auditoria completa

Servindo como base oficial para toda implementação do SeederLinux Versão 3.0.
