# Documento 13 — Plano de Evolução e Roadmap do Produto

## SeederLinux / SoftwareLivre

### Versão 3.0

---

# 1. Objetivo

Este documento define o roadmap oficial do SeederLinux e do ecossistema SoftwareLivre.

Seu objetivo é orientar:

* desenvolvimento do produto
* priorização de funcionalidades
* implantação gradual nas OMs
* homologação institucional
* integração futura com SeederHub

---

# 2. Filosofia de Evolução

O projeto será desenvolvido em fases.

Cada fase deve resultar em um sistema funcional e utilizável.

Não serão implementadas funcionalidades experimentais que comprometam:

* estabilidade
* auditoria
* segurança
* operação offline

Princípios:

* Offline First
* Simplicidade Operacional
* Padronização Institucional
* Automação Progressiva
* Compatibilidade Multidistro

---

# 3. MVP (Versão 3.0)

## Objetivo

Entregar uma plataforma totalmente funcional para:

* cadastro de organizações
* gerenciamento de variáveis
* gerenciamento de scripts
* provisionamento
* inventário básico
* auditoria

---

## Funcionalidades Obrigatórias

### Setup Wizard

Criação inicial de:

* Administrador Global
* Organização Raiz
* Variáveis iniciais

---

### Organizações

CRUD completo.

Campos:

* Nome
* Sigla
* Domínio
* Repositório padrão
* Branding

---

### Usuários

CRUD completo.

Perfis:

* Admin GAP
* Operador OM
* Auditor

---

### Variáveis

Catálogo institucional.

Suporte:

* string
* boolean
* integer
* array
* json

---

### Scripts

Suporte:

* Core
* Personalizados

Recursos:

* versionamento
* serial
* auditoria

---

### Provisionamento

Geração de bundle.

Substituição automática de variáveis.

---

### Inventário

Cadastro de estações.

Check-in.

Status:

* Online
* Atrasada
* Nunca conectou

---

### Auditoria

Registro completo de:

* criação
* alteração
* exclusão
* provisionamento

---

# 4. Versão 3.1

## Objetivo

Melhorar experiência operacional.

---

## Novidades

### Catálogo Inteligente de Variáveis

Scripts poderão exibir:

* descrição da variável
* tipo
* valor padrão
* obrigatoriedade

---

### Assistente de Criação de Scripts

Validação automática:

* placeholders inexistentes
* variáveis inválidas
* conflitos

---

### Perfis de Deploy

Criação de perfis reutilizáveis.

Exemplo:

Perfil Mint Corporativo:

* Core.Domain
* Core.Files
* Core.Browser
* Core.Branding

---

### Dashboard Operacional

Indicadores:

* estações online
* estações desatualizadas
* organizações ativas
* provisionamentos executados

---

# 5. Versão 3.2

## Objetivo

Automação das estações.

---

## SeederAgent

Primeira versão funcional.

Recursos:

* check-in automático
* coleta de inventário
* recebimento de jobs

---

## Execução Remota

Enviar tarefas para estação:

* atualizar
* reiniciar
* aplicar configuração

---

## Inventário Avançado

Coleta:

* CPU
* memória
* disco
* versão do sistema
* IP
* usuário logado

---

# 6. Versão 3.3

## Objetivo

Gerenciamento completo de configurações.

---

## Desired State Management

O SeederLinux passa a controlar estado desejado.

Exemplo:

OM deseja:

Firefox = versão X

SeederAgent verifica:

Firefox = versão Y

Resultado:

Aplicar correção automaticamente.

---

## Drift Detection

Detectar desvios de configuração.

Exemplos:

* proxy removido
* DNS alterado
* pacote desinstalado

---

# 7. Versão 3.4

## Objetivo

Controle corporativo avançado.

---

## Cache de Credenciais Offline

Integração com:

* SSSD
* Winbind

Configuração centralizada.

Variáveis:

* OFFLINE_LOGIN_ENABLED
* OFFLINE_LOGIN_DAYS

Recursos:

* habilitar/desabilitar cache
* definir período
* auditoria

---

## Políticas de Segurança

Centralização de:

* PAM
* sudo
* bloqueio USB
* firewall local

---

# 8. Versão 3.5

## Objetivo

Gerenciamento de repositórios Linux.

---

## Repositório Institucional

Nova funcionalidade.

Configurações:

* Internet
* Repositório Próprio
* Herdar Padrão

---

## Variáveis

### Debian

DEBIAN_REPOSITORY_MODE

Valores:

* INTERNET
* LOCAL
* DEFAULT

---

### Ubuntu

UBUNTU_REPOSITORY_MODE

---

### Mint

MINT_REPOSITORY_MODE

---

## Provisionamento

Configuração automática de:

* apt sources
* chaves GPG
* prioridades

---

# 9. Versão 4.0

## Objetivo

Introduzir infraestrutura de espelhamento.

---

## Mirror Manager

Novo módulo.

Permite:

* criar mirror local
* monitorar sincronização
* gerenciar espaço

---

## Recursos

Seleção de:

* Debian
* Ubuntu
* Linux Mint

---

## Planejamento de Espaço

Antes da criação:

Sistema calcula:

* espaço necessário
* espaço disponível

---

## Proteções

Validações:

* espaço mínimo
* snapshot recomendado
* confirmação dupla

---

# 10. Versão 4.1

## Objetivo

Automação completa de infraestrutura.

---

## Mirror Automatizado

Funções:

* criar mirror
* atualizar mirror
* remover mirror

Tudo via interface gráfica.

---

## Monitoramento

Exibir:

* tamanho atual
* taxa de crescimento
* último sync
* erros

---

# 11. Versão 4.2

## Objetivo

Integração com SeederHub.

---

## SeederHub Federation

Compartilhamento de:

* scripts
* perfis
* módulos

---

## Controle

Importação:

* manual
* automática

---

## Assinatura

Todo conteúdo deve possuir:

* serial
* hash
* assinatura

---

# 12. Versão 4.3

## Objetivo

Marketplace Institucional.

---

## Catálogo Compartilhado

Disponibilização de:

* módulos
* scripts
* perfis

entre organizações autorizadas.

---

## Governança

Controle por:

* GAP
* COMAR
* COMARA
* Diretoria

---

# 13. Versão 5.0

## Objetivo

Transformar o SeederLinux em uma plataforma completa de gestão Linux corporativa.

---

## Funcionalidades

### Desired State Completo

Controle integral da estação.

---

### Gerenciamento de Aplicações

Instalar:

* LibreOffice
* OnlyOffice
* Firefox
* Chromium
* softwares corporativos

---

### Patch Management

Distribuição controlada de:

* atualizações
* correções
* segurança

---

### Compliance

Verificação automática:

* CIS
* políticas institucionais
* padrões internos

---

# 14. Critérios de Priorização

Toda nova funcionalidade deverá atender pelo menos um dos critérios:

### Operacional

Reduz esforço do administrador.

### Segurança

Aumenta proteção institucional.

### Padronização

Reduz divergência entre OMs.

### Escalabilidade

Permite crescimento da solução.

### Automação

Elimina tarefas manuais.

---

# 15. Visão de Longo Prazo

O SeederLinux deverá evoluir para uma plataforma capaz de:

* provisionar estações Linux
* gerenciar configurações corporativas
* manter inventário atualizado
* distribuir software
* controlar atualizações
* operar totalmente offline
* integrar múltiplas OMs
* compartilhar conhecimento através do SeederHub

Sem dependência de serviços externos e mantendo total soberania sobre a infraestrutura institucional.

---

**Fim do Documento 13 — Plano de Evolução e Roadmap do Produto (Versão 3.0)**
