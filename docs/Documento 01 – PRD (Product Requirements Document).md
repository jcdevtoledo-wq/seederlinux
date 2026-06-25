# Documento 01 – PRD (Product Requirements Document)

# SeederLinux

Versão 3.0
Status: Oficial
Data: Junho/2026

---

# 1. Visão Geral

O SeederLinux é uma plataforma institucional destinada ao provisionamento, padronização, gerenciamento e auditoria de estações Linux em ambientes corporativos, governamentais, militares e educacionais.

O sistema foi concebido para substituir processos manuais, scripts dispersos e configurações descentralizadas, fornecendo uma solução unificada para implantação e manutenção de ambientes Linux.

O produto deve operar prioritariamente em ambientes restritos, com suporte a operação offline e sincronização eventual.

---

# 2. Objetivos do Produto

O SeederLinux deve permitir:

* Provisionamento automatizado de estações Linux
* Padronização de ambientes institucionais
* Gerenciamento multi-organização
* Aplicação automatizada de configurações
* Inventário de ativos
* Auditoria completa
* Distribuição de módulos corporativos
* Operação offline-first
* Controle de conformidade (Desired State)
* Integração com Active Directory, Samba4 e LDAP

---

# 3. Escopo

O sistema deverá gerenciar:

* Organizações (OMs)
* Usuários
* Perfis de implantação
* Variáveis organizacionais
* Scripts Core
* Scripts personalizados
* Branding institucional
* Inventário de estações
* Provisionamento
* Auditoria
* Repositórios corporativos
* Políticas corporativas
* Sincronização federada

---

# 4. Conceitos Fundamentais

## Organização (OM)

Unidade lógica de isolamento administrativo.

Cada organização possui:

* domínio próprio
* DNS próprio
* controladores próprios
* branding próprio
* variáveis próprias
* perfis próprios
* estações próprias

Nenhuma configuração organizacional deve impactar outra organização.

---

## Script Core

Scripts oficiais distribuídos pelo SeederLinux.

Características:

* Imutáveis
* Mantidos centralmente
* Versionados
* Auditáveis

Não podem ser editados por operadores.

---

## Script Personalizado

Scripts criados pelas organizações.

Características:

* Editáveis
* Versionados
* Auditáveis

Utilizados para necessidades específicas.

---

## Variáveis

As variáveis representam os parâmetros organizacionais utilizados durante o provisionamento.

Exemplos:

```text
DOMINIO
DC_IP
DNS_PRIMARIO
PROXY_URL
OCS_SERVER
```

Princípio fundamental:

Scripts não devem ser modificados para atender uma organização.

Somente as variáveis organizacionais devem mudar.

---

## Perfil de Deploy

Conjunto de módulos, scripts e políticas aplicados a uma estação.

Um perfil representa uma configuração corporativa reutilizável.

---

## Estação

Equipamento Linux gerenciado pelo SeederLinux através do SeederClient.

---

# 5. Perfis de Usuário

## admin_gap

Administrador global.

Permissões:

* gerenciamento total
* criação de organizações
* criação de usuários
* auditoria global
* publicação de módulos

---

## operador_om

Administrador local da organização.

Permissões:

* gerenciamento da própria organização
* criação de perfis
* gerenciamento de estações
* gerenciamento de scripts personalizados

---

## auditor

Somente leitura.

Permissões:

* visualização global
* relatórios
* auditoria

Sem permissão de alteração.

---

# 6. Funcionalidades MVP

## Autenticação

O sistema deverá fornecer:

* login
* logout
* recuperação de senha
* bloqueio de usuário
* autenticação JWT

---

## Setup Wizard

Disponível apenas durante a instalação inicial.

Funções:

* criar administrador global
* criar organização raiz
* configurar parâmetros iniciais
* ativar o sistema

Após conclusão:

```text
setup_completed = true
```

O wizard deve ser permanentemente bloqueado.

---

## Gestão de Organizações

Permitir:

* criar organização
* editar organização
* remover organização
* ativar/desativar organização

---

## Gestão de Usuários

Permitir:

* criar usuário
* editar usuário
* bloquear usuário
* redefinir senha
* vincular usuário a organização

---

## Gestão de Variáveis

Permitir:

* criar variável
* editar variável
* remover variável
* importar catálogo

---

## Gestão de Scripts

Permitir:

* scripts Core
* scripts personalizados
* versionamento
* rollback
* validação

---

## Branding

Permitir:

* logotipo
* wallpaper
* wallpaper login
* greeter
* tema GTK
* Conky
* atalhos corporativos

---

## Inventário

Permitir:

* cadastro automático
* check-in
* status operacional
* telemetria básica

---

## Provisionamento

Permitir:

* seleção de módulos
* substituição de variáveis
* geração do script final
* distribuição para estações

---

## Auditoria

Registrar:

* criação
* alteração
* exclusão
* login
* execução remota
* provisionamento

---

# 7. Gestão de Repositórios

Cada organização poderá utilizar:

## Internet

Repositórios oficiais da distribuição.

---

## Repositório Corporativo

Mirror próprio da organização.

---

## Repositório Herdado

Mirror fornecido pela organização superior.

---

# 8. Autenticação Offline

O sistema deverá permitir:

* cache de credenciais
* login sem contato com AD
* expiração configurável

Compatível com:

* SSSD
* Winbind

---

# 9. Políticas Corporativas

O sistema deverá permitir gerenciamento centralizado de:

* navegadores
* certificados
* impressão
* desktop
* energia
* proxy
* atualizações
* autenticação

---

# 10. SeederClient

Agente instalado nas estações.

Responsável por:

* inventário
* check-in
* aplicação de perfis
* execução de scripts
* desired state
* auditoria local

---

# 11. SeederHub

Sistema federado de distribuição.

Responsável por:

* sincronização entre GAPs
* compartilhamento de módulos
* compartilhamento de perfis
* compartilhamento de scripts

---

# 12. SeederMirror (Roadmap)

Módulo responsável por:

* criação de mirrors Linux
* sincronização de repositórios
* validação de espaço
* gestão de snapshots
* distribuição corporativa

---

# 13. Requisitos Não Funcionais

O sistema deverá:

* funcionar sem internet
* suportar múltiplas organizações
* ser auditável
* suportar Docker
* suportar PostgreSQL
* suportar Debian
* suportar Ubuntu
* suportar Linux Mint
* possuir API REST
* possuir interface web responsiva

---

# 14. Roadmap Oficial

## Fase 1 — MVP

* Organizações
* Usuários
* Variáveis
* Scripts
* Inventário
* Provisionamento

---

## Fase 2 — Gestão Corporativa

* Políticas
* Branding
* Repositórios
* Login Offline

---

## Fase 3 — SeederHub

* Sincronização federada
* Catálogo compartilhado

---

## Fase 4 — SeederMirror

* Mirrors corporativos
* Gestão de repositórios

---

## Fase 5 — Desired State Management

* Compliance contínuo
* Correção automática
* Drift Detection
* Remediação automática

-



FIM DO DOCUMENTO 01