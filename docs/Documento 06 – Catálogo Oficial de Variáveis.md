
# Documento 06 – Catálogo Oficial de Variáveis

## Versão 3.0

---

# 1. Objetivo

Definir todas as variáveis oficiais suportadas pelo SeederLinux.

Estas variáveis podem ser utilizadas:

* nos módulos Core
* nos perfis de deploy
* nos scripts customizados
* nos templates
* no SeederAgent

---

# 2. Regras Gerais

## Catálogo Global

Toda variável pertence ao catálogo global.

---

## Cada Variável Possui

```text
Nome
Descrição
Categoria
Tipo
Obrigatória
Valor Padrão
Visível para OM
```

---

## Tipos Permitidos

```text
string
integer
boolean
url
ip
cidr
array
json
password
```

---

## Escopo

As variáveis são armazenadas por Organização.

Exemplo:

```text
COMARA.DOMINIO
GAP-BR.DOMINIO
CCA-BR.DOMINIO
```

---

## Regra Crítica

Alterar uma variável:

```text
não altera scripts
não cria nova versão do script
incrementa serial da OM
```

---

# 3. Categoria: Domínio

## DOMINIO

Tipo:

```text
string
```

Exemplo:

```text
fab.mil.br
```

Obrigatória:

```text
Sim
```

---

## DOMINIO_NETBIOS

Exemplo:

```text
FAB
```

Obrigatória:

```text
Sim
```

---

## DC_IP

Tipo:

```text
ip
```

Obrigatória:

```text
Sim
```

---

## DNS_PRIMARIO

Tipo:

```text
ip
```

Obrigatória:

```text
Sim
```

---

## DNS_SECUNDARIO

Tipo:

```text
ip
```

Obrigatória:

```text
Não
```

---

## NTP_SERVER

Tipo:

```text
string
```

Exemplo:

```text
ntp.fab.mil.br
```

---

## OU_PADRAO

Tipo:

```text
string
```

Exemplo:

```text
OU=Computadores,DC=fab,DC=mil,DC=br
```

---

## GRUPO_ADMIN

Tipo:

```text
string
```

Exemplo:

```text
GG-TI-LINUX
```

---

## OFFLINE_AUTH_ENABLED

Tipo:

```text
boolean
```

Padrão:

```text
true
```


# 4. Categoria: Arquivos

## SERVIDOR_ARQUIVOS

Tipo:

```text
string
```

Exemplo:

```text
filesrv01
```

---

## COMPARTILHAMENTOS

Tipo:

```text
array
```

Exemplo:

```json
[
  "Publico",
  "Administrativo",
  "Tecnico"
]
```

---

## MOUNT_BASE

Tipo:

```text
string
```

Padrão:

```text
/mnt
```

---

# 5. Categoria: Navegadores

## HOMEPAGE

Tipo:

```text
url
```

---

## PROXY_MODE

Valores:

```text
NONE
MANUAL
PAC
```

---

## PROXY_HTTP

Tipo:

```text
string
```

---

## PROXY_PORTA

Tipo:

```text
integer
```

---

## PAC_URL

Tipo:

```text
url
```

---

## NO_PROXY

Tipo:

```text
array
```

Exemplo:

```json
[
  "localhost",
  "10.0.0.0/8",
  "*.intraer"
]
```

Observação:

A interface deve aceitar múltiplos valores separados por vírgula.

---

# 6. Categoria: Branding

## DISPLAY_NAME

Nome amigável da OM.

---

## WALLPAPER

URL da imagem.

---

## WALLPAPER_LOGIN

URL da imagem de login.

---

## LOGO

URL da logomarca.

---

## GREETER_URL

Imagem da tela de autenticação.

---

## THEME

Exemplo:

```text
Mint-Y-Dark
```

---

## CONKY_PROFILE

Perfil institucional.

---

## SHORTCUTS_ENABLED

Tipo:

```text
boolean
```

---

# 7. Categoria: Inventário

## OCS_SERVER

Tipo:

```text
url
```

---

## GLPI_SERVER

Tipo:

```text
url
```

---

## INVENTORY_ENABLED

Tipo:

```text
boolean
```

---

# 8. Categoria: Acesso Remoto

## REMOTE_METHOD

Valores:

```text
RUSTDESK
VNC
ANYDESK
```

---

## REMOTE_SERVER

Tipo:

```text
string
```

---

# 9. Categoria: Impressoras

## PRINT_SERVER

Tipo:

```text
string
```

---

## DEFAULT_PRINTER

Tipo:

```text
string
```

---

## PRINTERS

Tipo:

```text
array
```

Exemplo:

```json
[
  "HP-LASER-01",
  "EPSON-ADM-02"
]
```

---

# 10. Categoria: Certificados

## CERTIFICATE_BUNDLE

Tipo:

```text
url
```

---

## CERTIFICATE_AUTO_INSTALL

Tipo:

```text
boolean
```

Padrão:

```text
true
```

---

# 11. Categoria: Repositórios

## REPOSITORY_MODE

Valores:

```text
PUBLIC
MIRROR
HYBRID
CUSTOM
```

---

## REPOSITORY_URL

Tipo:

```text
url
```

Exemplo:

```text
http://repo.comara.intraer/debian
```

---

## REPOSITORY_FALLBACK

Tipo:

```text
boolean
```

Permite fallback para Internet.

---

## REPOSITORY_DISTRO

Valores:

```text
DEBIAN
UBUNTU
MINT
```

---

# 12. Categoria: Mirror Local

## MIRROR_ENABLED

Tipo:

```text
boolean
```

---

## MIRROR_STORAGE_PATH

Exemplo:

```text
/opt/seederlinux/mirror
```

---

## MIRROR_DISTROS

Tipo:

```text
array
```

Exemplo:

```json
[
  "Debian 12",
  "Ubuntu 24.04",
  "Linux Mint 22"
]
```

---

## MIRROR_SYNC_SCHEDULE

Exemplo:

```text
02:00
```

---

## MIRROR_WARNING_THRESHOLD

Percentual mínimo livre.

Padrão:

```text
20
```

---

# 13. Categoria: SeederAgent

## AGENT_CHECKIN_INTERVAL

Padrão:

```text
15
```

(minutos)

---

## AGENT_AUTO_UPDATE

Tipo:

```text
boolean
```

---

## AGENT_ALLOW_REMOTE_EXECUTION

Tipo:

```text
boolean
```

---

# 14. Categoria: Segurança

## SESSION_TIMEOUT

Padrão:

```text
60
```

(minutos)

---

## JWT_EXPIRATION

Padrão:

```text
3600
```

(segundos)

---

## PASSWORD_MIN_LENGTH

Padrão:

```text
12
```

---

## AUDIT_ENABLED

Padrão:

```text
true
```

---

# 15. Categoria: Integrações Futuras

## NEXTCLOUD_URL

Tipo:

```text
url
```

---

## ONLYOFFICE_URL

Tipo:

```text
url
```

---

## ZABBIX_URL

Tipo:

```text
url
```

---

## GRAFANA_URL

Tipo:

```text
url
```

---

# 16. Variáveis Obrigatórias Criadas Automaticamente

Ao criar uma nova OM, o sistema deve criar automaticamente:

```text
DOMINIO
DOMINIO_NETBIOS
DC_IP
DNS_PRIMARIO

HOMEPAGE

DISPLAY_NAME

REPOSITORY_MODE

OFFLINE_AUTH_ENABLED


AGENT_CHECKIN_INTERVAL
```

Mesmo que inicialmente estejam vazias.

---

# 17. Comportamento do Frontend

Toda variável deve exibir:

```text
Nome
Descrição
Categoria
Tipo
Valor Atual
Obrigatória
```

---

## Busca

Deve permitir:

```text
Pesquisar
Filtrar por categoria
Filtrar obrigatórias
Filtrar utilizadas em scripts
```

---

## Integração com Scripts

Ao editar um script:

```bash
{{DOMINIO}}
{{DNS_PRIMARIO}}
{{PRINT_SERVER}}
```

o sistema deve:

```text
detectar automaticamente
consultar catálogo
mostrar descrição
mostrar tipo
mostrar valor atual da OM
```

---

# 18. Resultado Esperado

Uma Organização Militar deve conseguir implantar completamente seu ambiente Linux corporativo apenas preenchendo as variáveis do catálogo oficial, sem necessidade de editar scripts Core.

---

**Fim do Documento 06 – Catálogo Oficial de Variáveis (Versão 3.0)**