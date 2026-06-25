# Documento 08 – Arquitetura do SeederAgent e Agente de Check-in

## SeederLinux – Versão 3.0

---

# 1. Objetivo

Definir a arquitetura oficial do SeederAgent, o agente responsável pela comunicação entre as estações Linux e o SeederLinux Server.

O SeederAgent é o componente instalado nas estações Linux e tem como responsabilidades:

* provisionamento inicial
* aplicação de configurações
* execução de módulos Core
* execução de scripts personalizados
* inventário
* auditoria
* sincronização de estado
* validação de conformidade
* operação offline

---

# 2. Conceito Geral

O SeederAgent deve funcionar como um agente persistente.

Após instalado, ele passa a responder ao SeederLinux Server periodicamente.

---

## Fluxo Simplificado

```text
SeederLinux Server
        ↑
        ↓
   SeederAgent
        ↑
        ↓
 Sistema Operacional
```

---

# 3. Componentes do SeederAgent

## 3.1 Agent Service

Serviço principal.

Responsável por:

* check-in
* sincronização
* inventário
* execução de tarefas

---

## 3.2 Provision Engine

Motor de provisionamento.

Responsável por:

* baixar bundles
* processar templates
* executar scripts
* aplicar módulos

---

## 3.3 Inventory Engine

Responsável pela coleta de informações.

Coleta:

* hardware
* software
* usuários
* rede
* domínio
* impressoras
* estado dos serviços

---

## 3.4 Compliance Engine

Responsável pela validação da estação.

Verifica:

* serial atual
* conformidade
* divergências
* falhas de aplicação

---

## 3.5 Cache Engine

Permite operação offline.

Armazena:

* configurações
* scripts
* módulos
* variáveis

---

# 4. Instalação

O SeederAgent deve ser instalável por:

---

## Pacote DEB

```text
Ubuntu
Debian
Linux Mint
```

---

## Pacote RPM

```text
Rocky
AlmaLinux
RHEL
```

---

## Script Bootstrap

```bash
curl https://seeder/agent.sh | bash
```

ou

```bash
wget https://seeder/agent.sh
```

---

# 5. Registro Inicial

Durante o primeiro registro o agente deve informar:

---

## Dados da Máquina

```yaml
hostname:
serial:
mac:
ip:
os:
kernel:
desktop:
```

---

## Dados da Organização

```yaml
organization_id:
station_token:
```

---

# 6. Identidade da Estação

Cada estação possui:

```yaml
station_id
station_token
serial_aplicado
```

---

## station_id

Identificador único.

Nunca muda.

---

## station_token

Credencial da estação.

Utilizada para autenticação.

---

## serial_aplicado

Versão da configuração atualmente aplicada.

---

# 7. Processo de Check-in

Check-in padrão:

```text
15 minutos
```

Configurável pela organização.

---

## Dados enviados

```yaml
hostname
ip
status
serial
uptime
usuarios_logados
ultima_execucao
```

---

## Resposta do servidor

```yaml
configuracao_disponivel
novo_serial
tarefas
scripts
```

---

# 8. Controle por Serial

O serial é o mecanismo oficial de controle de versão.

Inicialização do Serial da Estação
Quando uma estação é provisionada pela primeira vez:

text
serial_aplicado = 0
Isso garante que, no primeiro check-in, a estação seja considerada desatualizada e receba imediatamente a configuração completa do servidor.
---

## Exemplo

Servidor:

```yaml
serial: 125
```

Estação:

```yaml
serial: 122
```

Resultado:

```text
Atualização necessária
```

---

# 9. Provisionamento

Quando um novo serial é detectado:

---

## Processo

1. baixar bundle
2. validar hash
3. aplicar módulos
4. aplicar scripts
5. registrar resultado
6. atualizar serial

---

# 10. Bundle de Provisionamento

Bundle gerado pelo servidor.

Formato:

```text
tar.gz
```

ou

```text
zip
```

---

## Conteúdo

```text
manifest.json
modules/
scripts/
variables/
branding/
```

---

# 11. Manifest

Exemplo:

```json
{
  "organization":"COMARA",
  "serial":125,
  "generated":"2026-06-01",
  "modules":[
    "core.domain",
    "core.browser",
    "core.certificates"
  ]
}
```

---

# 12. Processamento de Variáveis

Scripts nunca são alterados.

Variáveis são substituídas apenas durante a geração do bundle.

---

## Exemplo

Script:

```bash
realm join {{DOMINIO}}
```

Variável:

```yaml
DOMINIO: comara.intraer
```

Resultado:

```bash
realm join comara.intraer
```

---

# 13. Execução dos Módulos Core

Ordem padrão:

```text
Core.Repositories
Core.Domain
Core.Certificates
Core.Browser
Core.Files
Core.Printers
Core.Inventory
Core.Remote
Core.Security
Core.Desktop
Core.Branding
```

---

# 14. Execução de Scripts Personalizados

Executados após os módulos Core.

---

## Regras

Podem:

* instalar aplicações
* configurar sistemas locais
* criar atalhos

Não podem substituir módulos Core.

---

# 15. Inventário

Informações coletadas:

---

## Hardware

```yaml
cpu
memoria
disco
placa_mae
serial
```

---

## Sistema

```yaml
distro
versao
kernel
desktop
```

---

## Rede

```yaml
hostname
dns
gateway
ip
```

---

## Domínio

```yaml
dominio
metodo
dc
```

---

# 16. Operação Offline

O SeederAgent deve continuar funcionando sem acesso ao servidor.

---

## Mantém localmente

* última configuração
* último bundle
* scripts
* módulos

---

## Continua executando

* login
* cache de credenciais
* impressoras
* compartilhamentos

---

# 17. Cache de Credenciais

Funcionalidade obrigatória.

Permite login quando:

```text
AD indisponível
Rede indisponível
Servidor desligado
```

---

## Configuração

Variáveis:

```yaml
OFFLINE_AUTH_ENABLED=true
OFFLINE_AUTH_DAYS=90
OFFLINE_AUTH_MAX_LOGINS=10
```

---

## Implementação

SSSD:

```ini
cache_credentials = true
offline_credentials_expiration = 90
```

---

# 18. Auditoria

Toda ação deve ser registrada.

---

## Eventos

```yaml
script_executado
modulo_aplicado
falha
rollback
inventario
checkin
```

---

# 19. Rollback

Caso uma execução falhe.

---

## Processo

1. identificar último serial válido
2. restaurar configurações
3. registrar evento

---

# 20. Segurança

Comunicação obrigatória via HTTPS.

---

## Autenticação

```text
station_token
```

---

## Requisitos

* TLS
* validação de certificado
* rotação de token

---

# 21. SeederHub

Integração futura.

Permite:

* sincronização de módulos
* sincronização de perfis
* sincronização de scripts

---

# 22. Compatibilidade Oficial

## Distribuições

* Ubuntu
* Debian
* Linux Mint
* Rocky Linux
* AlmaLinux

---

## Ambientes Gráficos

* Cinnamon
* XFCE
* MATE
* GNOME
* KDE

---

# 23. Roadmap Futuro

## Versão 3.1

* Execução paralela
* Compressão avançada

---

## Versão 3.2

* Autoatualização do agente

---

## Versão 4.0

* Provisionamento por imagem
* PXE integrado
* Integração completa com espelhos locais

---

# 24. Princípio Fundamental

O SeederAgent deve permitir que uma estação Linux seja totalmente configurada, auditada e mantida utilizando apenas:

* módulos Core
* variáveis organizacionais
* scripts personalizados

Sem necessidade de intervenção manual do administrador após o provisionamento inicial.

---

Fim do Documento 08 – Arquitetura do SeederAgent e Agente de Check-in
