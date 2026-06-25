
# Documento 04 – Arquitetura Funcional dos Módulos Core

**Versão 3.0**

---

# 1. Objetivo

Definir a arquitetura funcional dos módulos oficiais do SeederLinux.

Os módulos Core representam funcionalidades corporativas padronizadas e mantidas centralmente.

Seu comportamento é imutável.

As Organizações Militares (OMs) apenas fornecem os parâmetros necessários para personalização.

---

# 2. Princípios Arquiteturais

## Imutabilidade

O código dos módulos Core não pode ser alterado pelas OMs.

Permitido:

* alterar parâmetros
* ativar/desativar módulo
* selecionar perfil

Não permitido:

* editar script Core
* alterar lógica Core
* substituir módulo Core

---

## Parametrização

Todo comportamento organizacional deve ocorrer através de variáveis.

Exemplo:

Módulo Domain:

```yaml
DOMINIO=fab.mil.br
DC_IP=10.10.10.10
DNS_PRIMARIO=10.10.10.1
```

O script permanece igual.

Apenas os parâmetros mudam.

---

## Versionamento

Cada módulo possui:

```text
Nome
Versão
Serial
Data
Hash
```

Exemplo:

```text
Core.Domain
Versão: 3.1
Serial: 312
```

---

## Rollback

Todo módulo deve permitir reversão.

Exemplo:

```text
Ingressou no domínio
↓
Rollback
↓
Sai do domínio
↓
Remove configurações
```

---

# 3. Estrutura de um Módulo Core

Cada módulo possui:

```text
Manifesto
Script
Templates
Validação
Rollback
Documentação
```

Estrutura:

```text
core.domain/

├── manifest.yml
├── install.sh
├── rollback.sh
├── validate.sh
├── templates/
└── docs/
```

---

# 4. Core.Domain

## Objetivo

Ingresso automatizado em domínio.

---

## Funcionalidades

* DNS
* NTP
* Kerberos
* Samba
* SSSD
* Winbind
* PAM
* NSS
* mkhomedir
* sudo corporativo

---

## Métodos Suportados

### SSSD

```text
AD
Samba4
LDAP
```

---

### Winbind

```text
AD
Samba4
```

---

## Variáveis Obrigatórias

```text
DOMINIO
DOMINIO_NETBIOS
DC_IP
DNS_PRIMARIO
```

---

## Variáveis Opcionais


```text
DNS_SECUNDARIO
NTP_SERVER
OU_PADRAO
GRUPO_ADMIN
OFFLINE_AUTH_ENABLED
OFFLINE_AUTH_DAYS
OFFLINE_AUTH_MAX_LOGINS
```

---

## Novidade V3.0

### Cache de Credenciais

Permite login offline.

Exemplo:

```text
Usuário logou na rede

Rede caiu

Usuário continua autenticando
```

Parâmetro:

```text
ENABLE_CACHE_CREDENTIALS=true
```

---

# 5. Core.Files

## Objetivo

Gerenciar compartilhamentos corporativos.

---

## Funcionalidades

### SMB

Montagem de:

```text
Departamentos
Perfis
Pastas de rede
```

---

### Automount

Montagem sob demanda.

---

### Atalhos

Criação automática:

```text
Área de Trabalho
Menu
Painel
```

---

## Variáveis

```text
SERVIDOR_ARQUIVOS
COMPARTILHAMENTOS
MOUNT_BASE
```

---

# 6. Core.Browser

## Objetivo

Padronizar navegadores.

---

## Funcionalidades

### Homepage

```text
Portal da OM
Portal Corporativo
```

---

### Proxy

Suporte:

```text
Sem Proxy
Proxy Manual
PAC
```

---

### Certificados

Instalação automática.

---

### Políticas

Firefox

Chromium

Chrome

---

## Variáveis

```text
HOMEPAGE
PROXY_MODE
PROXY_HTTP
PROXY_PORTA
PAC_URL
```

---

# 7. Core.Branding

## Objetivo

Padronizar identidade visual.

---

## Funcionalidades

### Wallpaper

Desktop.

---

### Wallpaper Login

Tela de login.

---

### Logo

Identidade da OM.

---

### Greeter

Imagem da tela de autenticação.

---

### Tema

GTK.

---

### Conky

Perfil institucional.

---

## Variáveis

```text
DISPLAY_NAME
WALLPAPER
WALLPAPER_LOGIN
LOGO
GREETER_URL
THEME
CONKY_PROFILE
```

---

# 8. Core.Inventory

## Objetivo

Inventário corporativo.

---

## Funcionalidades

### OCS

Inventário automático.

---

### GLPI Agent

Integração opcional.

---

### Check-in

A cada:

```text
15 minutos
```

---

### Telemetria

Informações:

```text
Hostname
IP
RAM
CPU
Disco
SO
Serial
```

---

## Variáveis

```text
OCS_SERVER
GLPI_SERVER
```

---

# 9. Core.Remote

## Objetivo

Suporte remoto.

---

## Métodos

### RustDesk

Padrão recomendado.

---

### VNC

Compatibilidade.

---

### AnyDesk

Legado.

---

## Variáveis

```text
REMOTE_METHOD
REMOTE_SERVER
```

---

# 10. Core.Printers

## Objetivo

Padronização de impressão.

---

## Funcionalidades

### CUPS

Configuração automática.

---

### Impressora Padrão

Por OM.

---

### Drivers

Distribuição automática.

---

## Variáveis

```text
PRINT_SERVER
DEFAULT_PRINTER
PRINTERS
```

---

# 11. Core.Certificates

## Objetivo

Distribuir certificados institucionais.

---

## Funcionalidades

### Sistema Operacional

```text
/usr/local/share/ca-certificates
```

---

### Firefox

NSS Database.

---

### Chromium

Trust Store.

---

## Variáveis

```text
CERTIFICATE_BUNDLE
```

---

# 12. Core.Repositories (NOVO V3.0)

## Objetivo

Gerenciar repositórios corporativos.

---

## Funcionalidades

### Internet

Uso dos repositórios oficiais.

```text
Ubuntu
Debian
Mint
```

---

### Repositório Corporativo

Uso de mirror local.

---

### Modo Híbrido

Internet + Mirror.

---

## Variáveis

```text
REPOSITORY_MODE
REPOSITORY_URL
REPOSITORY_FALLBACK
```

---

## Valores Permitidos

```text
PUBLIC
MIRROR
HYBRID
CUSTOM
```

---

# 13. Core.LocalRepository (NOVO V3.0)

## Objetivo

Criar e administrar mirrors locais.

---

## Funcionalidades

### Criação Assistida

Via interface web.

---

### Validação de Espaço

Verificação automática:

```text
Espaço livre
Espaço necessário
Margem de segurança
```

---

### Snapshot Recommendation

Antes da criação:

```text
Criar snapshot da VM
```

---

### Distribuições Suportadas

```text
Debian
Ubuntu
Linux Mint
```

---

### Sincronização

Manual ou agendada.

---

## Variáveis

```text
MIRROR_ENABLED
MIRROR_DISTROS
MIRROR_STORAGE_PATH
MIRROR_SYNC_SCHEDULE
```

---

# 14. Dependências Entre Módulos

```text
Core.Domain
 ├─ Core.Files
 ├─ Core.Printers
 ├─ Core.Inventory
 └─ Core.Remote

Core.Repositories
 └─ Core.LocalRepository
```

---

# 15. Resultado Esperado

Uma OM deve conseguir provisionar uma estação Linux completa apenas:

```text
1. Selecionando módulos

2. Preenchendo variáveis

3. Gerando o bundle

4. Executando o SeederAgent
```

Sem necessidade de editar scripts ou conhecer shell scripting.

---

**Fim do Documento 04 – Arquitetura Funcional dos Módulos Core (Versão 3.0)**
