# Documento 07 – Catálogo Oficial de Módulos Core

## SeederLinux – Versão 3.0

---

# 1. Objetivo

Este documento define o catálogo oficial de módulos Core do SeederLinux.

Os módulos Core representam funcionalidades institucionais padronizadas mantidas centralmente pelo projeto.

Seu objetivo é eliminar a necessidade de desenvolvimento de scripts para funções básicas corporativas.

Toda Organização Militar (OM) deve conseguir implantar uma estação Linux apenas preenchendo variáveis organizacionais e selecionando módulos.

---

# 2. Princípios dos Módulos Core

## Obrigatoriamente

Os módulos Core:

* são mantidos pelo projeto SeederLinux
* possuem versionamento próprio
* possuem serial próprio
* são auditáveis
* suportam rollback
* suportam múltiplas distribuições
* suportam múltiplos ambientes desktop

---

## Não podem

Os módulos Core não podem ser alterados pela OM.

A OM apenas:

* habilita/desabilita módulos
* preenche variáveis
* define parâmetros

---

# 3. Estrutura Padrão

Todo módulo Core deve conter:

```yaml
nome:
identificador:
versao:
serial:
descricao:
dependencias:
variaveis:
templates:
rollback:
validacao:
```

---

# 4. Core.Domain

## Identificador

```yaml
core.domain
```

---

## Objetivo

Ingresso institucional em domínio.

---

## Funcionalidades

* Kerberos
* Samba
* SSSD
* Winbind
* NSS
* PAM
* mkhomedir
* sudo por grupos
* DNS corporativo
* NTP corporativo

---

## Métodos

```yaml
SSSD
WINBIND
```

---

## Variáveis Obrigatórias

```yaml
DOMINIO
DOMINIO_NETBIOS
DC_IP
DNS_PRIMARIO
```

---

## Variáveis Opcionais

```yaml
DNS_SECUNDARIO
NTP_SERVER
OU_PADRAO
GRUPO_ADMIN
CACHE_CREDENCIAIS
CACHE_DIAS
```

---

## Novidades Versão 3.0

Inclui suporte oficial para:

* cache de credenciais offline
* configuração automática do SSSD
* política de expiração de cache

---

# 5. Core.Repositories

## Identificador

```yaml
core.repositories
```

---

## Objetivo

Padronizar repositórios de atualização.

---

## Funcionalidades

* repositórios oficiais
* repositórios internos
* espelhos locais
* atualização automática
* validação de conectividade

---

## Modos

### Internet

```yaml
repository_mode=internet
```

Utiliza repositórios públicos.

---

### Default

```yaml
repository_mode=default
```

Utiliza padrão da distribuição.

---

### Interno

```yaml
repository_mode=internal
```

Utiliza espelho corporativo.

---

## Variáveis

```yaml
REPOSITORY_MODE
REPOSITORY_URL
REPOSITORY_MIRROR
REPOSITORY_GPG_KEY
```

---

# 6. Core.Files

## Identificador

```yaml
core.files
```

---

## Objetivo

Gerenciamento de compartilhamentos corporativos.

---

## Funcionalidades

* SMB
* CIFS
* Automount
* Montagem por usuário
* Montagem global
* Atalhos automáticos

---

## Variáveis

```yaml
SERVIDOR_ARQUIVOS
COMPARTILHAMENTOS
MOUNT_BASE
```

---

# 7. Core.Browser

## Identificador

```yaml
core.browser
```

---

## Objetivo

Padronização dos navegadores corporativos.

---

## Funcionalidades

### Firefox

* Homepage
* Proxy
* Certificados
* Atualizações
* Telemetria

---

### Chromium

* Homepage
* Proxy
* Certificados
* Atualizações

---

## Variáveis

```yaml
HOMEPAGE
PROXY_HTTP
PROXY_PORTA
PAC_URL
NO_PROXY
```

---

# 8. Core.Branding

## Identificador

```yaml
core.branding
```

---

## Objetivo

Padronização visual.

---

## Funcionalidades

* Wallpaper
* Logo
* Tela de login
* Greeter
* Conky
* Temas

---

## Variáveis

```yaml
WALLPAPER
WALLPAPER_LOGIN
LOGO
GREETER
THEME
CONKY_PROFILE
```

---

# 9. Core.Inventory

## Identificador

```yaml
core.inventory
```

---

## Objetivo

Inventário institucional.

---

## Funcionalidades

* OCS Inventory
* GLPI Agent
* Telemetria
* Hardware
* Software

---

## Variáveis

```yaml
OCS_SERVER
GLPI_SERVER
```

---

# 10. Core.Remote

## Identificador

```yaml
core.remote
```

---

## Objetivo

Suporte remoto.

---

## Métodos

```yaml
RustDesk
VNC
AnyDesk
```

---

## Variáveis

```yaml
REMOTE_METHOD
REMOTE_SERVER
```

---

# 11. Core.Printers

## Identificador

```yaml
core.printers
```

---

## Objetivo

Padronização de impressão.

---

## Funcionalidades

* CUPS
* Drivers
* Filas
* Impressora padrão

---

## Variáveis

```yaml
PRINT_SERVER
PRINTERS
DEFAULT_PRINTER
```

---

# 12. Core.Certificates

## Identificador

```yaml
core.certificates
```

---

## Objetivo

Distribuição de certificados institucionais.

---

## Funcionalidades

* Certificados raiz
* Certificados intermediários
* Firefox
* Chromium
* Sistema Operacional

---

## Variáveis

```yaml
CERTIFICATE_BUNDLE
```

---

# 13. Core.Security

## Identificador

```yaml
core.security
```

---

## Objetivo

Aplicação das políticas de segurança corporativas.

---

## Funcionalidades

* Hardening
* Firewall local
* Políticas de senha
* Auditoria
* Bloqueios automáticos

---

## Variáveis

```yaml
PASSWORD_POLICY
FIREWALL_PROFILE
AUDIT_PROFILE
LOCK_SCREEN_TIMEOUT
```

---

# 14. Core.Desktop

## Identificador

```yaml
core.desktop
```

---

## Objetivo

Padronização do ambiente gráfico.

---

## Funcionalidades

* Tema
* Sons
* Energia
* Atalhos
* Dock
* Menu

---

## Variáveis

```yaml
DESKTOP_THEME
ICON_THEME
POWER_PROFILE
SOUND_PROFILE
```

---

# 15. Core.Mirror (Futuro)

## Identificador

```yaml
core.mirror
```

---

## Objetivo

Criação e gerenciamento de espelhos locais de repositórios.

---

## Funcionalidades Planejadas

* criação de mirror Ubuntu
* criação de mirror Debian
* criação de mirror Mint
* criação de mirror Rocky
* criação de mirror AlmaLinux

---

## Funcionalidades Avançadas

Antes da criação do mirror o sistema deve:

* calcular espaço necessário
* validar espaço livre
* estimar crescimento
* emitir alertas
* recomendar snapshot do servidor

---

## Variáveis

```yaml
MIRROR_DISTROS
MIRROR_STORAGE_PATH
MIRROR_SYNC_SCHEDULE
```

---
## Core.Mirror vs Core.Repositories
Esclarecimento Arquitetural
Os módulos Core.Repositories e Core.Mirror possuem responsabilidades distintas:

Core.Repositories
Responsabilidade: Configurar o cliente (estação Linux) para utilizar repositórios.

O que faz:

Define qual modo de repositório será utilizado (PUBLIC, MIRROR, HYBRID, CUSTOM)

Configura o arquivo sources.list (APT) ou .repo (RPM)

Adiciona chaves GPG

Define prioridades de repositórios

Exemplo de uso:

bash
# Configura a estação para usar o mirror corporativo
REPOSITORY_MODE=MIRROR
REPOSITORY_URL=http://mirror.intraer/debian
Core.Mirror (Futuro)
Responsabilidade: Criar e manter o espelho (mirror) no servidor.

O que faz:

Sincroniza pacotes dos repositórios oficiais

Gerencia espaço em disco

Agenda sincronizações

Valida integridade dos pacotes

Exemplo de uso:

bash
# Cria um mirror do Debian 12 no servidor
MIRROR_DISTROS=DEBIAN_12
MIRROR_STORAGE_PATH=/opt/seederlinux/mirror
MIRROR_SYNC_SCHEDULE=02:00
Resumo
Core.Repositories: Configura o uso do repositório (lado cliente)

Core.Mirror: Gerencia a criação do repositório (lado servidor)

---

# 16. Relacionamento com Scripts Personalizados

Scripts personalizados podem:

* instalar aplicações locais
* instalar sistemas legados
* criar atalhos específicos
* executar rotinas da OM

---

Scripts personalizados não podem substituir:

* Core.Domain
* Core.Repositories
* Core.Files
* Core.Browser
* Core.Branding
* Core.Inventory
* Core.Remote
* Core.Printers
* Core.Certificates
* Core.Security
* Core.Desktop

---

# 17. Catálogo Oficial Versão 3.0

| Módulo            | Status      |
| ----------------- | ----------- |
| Core.Domain       | Obrigatório |
| Core.Repositories | Obrigatório |
| Core.Files        | Opcional    |
| Core.Browser      | Obrigatório |
| Core.Branding     | Obrigatório |
| Core.Inventory    | Obrigatório |
| Core.Remote       | Opcional    |
| Core.Printers     | Opcional    |
| Core.Certificates | Obrigatório |
| Core.Security     | Obrigatório |
| Core.Desktop      | Obrigatório |
| Core.Mirror       | Futuro      |

---

**Fim do Documento 07 – Catálogo Oficial de Módulos Core (Versão 3.0)**