# Documento 09 – Arquitetura dos Agentes SeederAgent

## SeederLinux – Versão 3.0

---

# 1. Objetivo

Este documento define a arquitetura oficial dos agentes instalados nas estações Linux gerenciadas pelo SeederLinux.

Os agentes são responsáveis por:

* inventário
* provisionamento
* execução de módulos
* execução de scripts personalizados
* coleta de telemetria
* auditoria local
* sincronização com o servidor

---

# 2. Princípios Arquiteturais

O agente deve ser:

* leve
* resiliente
* tolerante a falhas
* offline-first
* compatível com múltiplas distribuições

Suporte obrigatório:

* Debian
* Ubuntu
* Linux Mint

Suporte futuro:

* Rocky Linux
* AlmaLinux
* RHEL
* Fedora
* openSUSE

---

# 3. Componentes do SeederAgent

O agente é composto por:

```text
SeederAgent

├── Inventory Engine
├── Provision Engine
├── Module Engine
├── Script Engine
├── Sync Engine
├── Audit Engine
├── Cache Engine
├── Update Engine
└── Local Database
```

---

# 4. Inventory Engine

Responsável por coletar informações da estação.

Coleta:

* hostname
* IP
* MAC
* domínio
* usuário logado
* versão do SO
* kernel
* memória
* CPU
* discos
* uptime
* serial da configuração aplicada

---

# 5. Provision Engine

Responsável por aplicar configurações.

Recebe:

```text
Bundle de Provisionamento
```

composto por:

```text
Módulos Core
+
Scripts Personalizados
+
Variáveis da OM
+
Branding
+
Políticas
```

Executa:

```text
Provisionamento Determinístico
```

---

# 6. Module Engine

Executa módulos Core oficiais.

Exemplos:

```text
Core.Domain
Core.Files
Core.Browser
Core.Branding
Core.Inventory
Core.Remote
Core.Printers
Core.Certificates
Core.Repositories
Core.Authentication
```

Os módulos são:

```text
imutáveis
versionados
assinados
```

---

# 7. Script Engine

Executa scripts personalizados.

Características:

```text
bash
python
ansible (futuro)
```

Suporta:

```text
placeholders
variáveis
rollback
logs
```

Exemplo:

```bash
apt install {{PACOTE}}
```

---

# 8. Sync Engine

Responsável pela comunicação com o SeederLinux.

Funções:

* check-in
* download de bundles
* upload de inventário
* upload de logs
* sincronização de serial

---

# 9. Audit Engine

Registra todas as ações locais.

Eventos:

```text
provisionamento
execução de módulo
execução de script
erro
rollback
atualização
```

---

# 10. Cache Engine

Responsável pela operação offline.

Armazena:

* último bundle aplicado
* variáveis
* branding
* políticas
* módulos

Permite:

```text
funcionamento sem conexão
```

---

# 11. Update Engine

Responsável pela atualização do agente.

Modos:

### Manual

Administrador executa atualização.

### Centralizada

Servidor envia nova versão.

### Automática

Atualização programada.

---

# 12. Banco Local

O agente deve possuir banco local.

Tecnologias permitidas:

```text
SQLite
BoltDB
```

Armazena:

```text
inventário
último serial
cache
logs
```

---

# 13. Check-in

Intervalo padrão:

```text
15 minutos
```

Configurável por OM.

Fluxo:

```text
SeederAgent
    ↓
POST /api/stations/checkin
    ↓
Servidor responde
    ↓
Cliente compara serial
```

---

# 14. Controle por Serial

Cada OM possui:

```text
Serial Organizacional
```

Exemplo:

```text
OM-COMARA-000123
```

A estação armazena:

```text
Último Serial Aplicado
```

Comparação:

```text
Servidor > Cliente
```

Resultado:

```text
Nova configuração disponível
```

---

# 15. Execução de Bundle

Fluxo:

```text
Servidor
    ↓
gera bundle
    ↓
assina bundle
    ↓
cliente recebe
    ↓
valida assinatura
    ↓
executa
```

---

# 16. Rollback

O agente deve manter:

```text
última configuração válida
```

Em caso de falha:

```text
rollback automático
```

Itens restaurados:

* arquivos
* configurações
* branding
* módulos

---

# 17. Segurança

Todo agente possui:

```text
Station Token
```

Identificador único.

Formato:

```text
UUID v4
```

Autenticação:

```text
Bearer Token
```

---

# 18. Cache de Credenciais

Suporte obrigatório para:

```text
SSSD Offline Authentication
Winbind Credential Cache
```

Objetivo:

Permitir login quando:

```text
AD indisponível
DNS indisponível
Link indisponível
```

Políticas configuráveis:

```text
Dias de cache
Quantidade de logins offline
Expiração
```

Variáveis:

```text
OFFLINE_AUTH_ENABLED
OFFLINE_AUTH_DAYS
OFFLINE_AUTH_MAX_LOGINS
```

---

# 19. Integração com Repositórios

O agente deve suportar:

## Internet

```text
repositórios públicos
```

## Espelho Institucional

```text
mirror local
```

## Repositório da OM

```text
repositório próprio
```

Definido por:

```text
REPOSITORY_MODE
REPOSITORY_URL
```

---

# 20. Integração com SeederHub

Quando habilitado:

```text
SeederAgent
↓
SeederLinux
↓
SeederHub
```

Permite:

* sincronização de módulos
* sincronização de scripts
* sincronização de catálogos

---

# 21. Operação Offline

O agente deve continuar funcionando mesmo sem conexão.

Permissões:

### Pode

* aplicar bundle já recebido
* executar scripts locais
* usar cache de credenciais
* consultar cache

### Não pode

* receber atualizações
* sincronizar inventário
* validar novos bundles

---

# 22. Telemetria

Dados enviados:

* versão do agente
* versão do SO
* uptime
* status do provisionamento
* serial aplicado

Nunca enviar:

* senhas
* hashes de senha
* conteúdo de arquivos do usuário
* dados pessoais

---

# 23. Roadmap Futuro

Versão 3.x

* assinatura criptográfica de bundles
* compactação diferencial
* execução paralela

Versão 4.x

* agente Windows
* agente macOS
* inventário avançado

Versão 5.x

* Desired State Management
* correção automática de desvios
* auto-healing

---

# 24. Resultado Esperado

O SeederAgent deve permitir que uma estação Linux:

* seja provisionada automaticamente
* opere offline
* mantenha cache de credenciais
* receba atualizações centralizadas
* execute módulos oficiais
* execute scripts personalizados
* realize inventário contínuo
* mantenha conformidade com a configuração definida pela OM

Sem necessidade de intervenção manual do usuário final.
