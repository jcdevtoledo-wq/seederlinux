# Documento 02 – Arquitetura do Sistema

# SeederLinux

Versão 3.0
Status: Oficial
Data: Junho/2026

---

# 1. Objetivo

Definir a arquitetura oficial do SeederLinux.

Este documento estabelece os componentes obrigatórios do sistema, suas responsabilidades, limites funcionais e relacionamentos.

Nenhuma implementação futura poderá divergir desta arquitetura sem revisão formal.

---

# 2. Princípios Arquiteturais

O SeederLinux foi concebido para ambientes:

* militares
* governamentais
* corporativos
* educacionais

Portanto deve priorizar:

* simplicidade operacional
* funcionamento offline
* auditabilidade
* segurança
* manutenção facilitada

---

# 3. Arquitetura Oficial

Modelo adotado:

Monólito Modular

---

Estrutura lógica:

Frontend
↓
Backend API
↓
PostgreSQL

---

Não utilizar:

* Microsserviços
* Event Bus
* Kafka
* RabbitMQ
* Firebase
* Supabase
* Serviços Cloud obrigatórios

---

# 4. Componentes

## Frontend

Responsável por:

* Interface Web
* Dashboards
* Configuração
* Provisionamento
* Auditoria

Tecnologias:

* React
* TypeScript
* Vite
* TanStack Router
* TanStack Query
* Shadcn UI

---

## Backend

Responsável por:

* Regras de negócio
* APIs REST
* Autenticação
* Auditoria
* Provisionamento

Tecnologias:

* NodeJS  (versão 18 LTS ou superior)
* Fastify
* Prisma ORM
* JWT
* bcrypt

---

## Banco de Dados

Responsável por:

* Persistência
* Auditoria
* Inventário
* Configurações

Tecnologia:

* PostgreSQL

Versão mínima:

* PostgreSQL 16

---

# 5. Arquitetura Física

Containers oficiais:

frontend
backend
postgres

---

docker-compose obrigatório:

frontend :3000

backend :8000

postgres :5432

---

Não criar containers adicionais sem necessidade formal.

---

# 6. Núcleo do Sistema

A Organização (OM) é a entidade central.

Todos os objetos pertencem a uma organização.

Exemplos:

Usuários
↓
Organização

Variáveis
↓
Organização

Branding
↓
Organização

Estações
↓
Organização

Perfis
↓
Organização

Scripts personalizados
↓
Organização

---

# 7. Domínios Funcionais

## Auth

Responsável por:

* Login
* Logout
* JWT
* Sessões

---

## Organizations

Responsável por:

* Cadastro de OMs
* Configurações organizacionais
* Repositórios
* Branding

---

## Users

Responsável por:

* Usuários
* Permissões
* RBAC

---

## Variables

Responsável por:

* Catálogo de variáveis
* Variáveis organizacionais

---

## Scripts

Responsável por:

* Scripts Core
* Scripts Customizados
* Versionamento

---

## Profiles

Responsável por:

* Perfis de Deploy

---

## Branding

Responsável por:

* Logo
* Wallpaper
* Greeter
* Tema
* Conky

---

## Policies

Responsável por:

* Navegadores
* Desktop
* Impressoras
* Certificados
* Atualizações

---

## Stations

Responsável por:

* Inventário
* Check-in
* Telemetria

---

## Provisioning

Responsável por:

* Geração dos scripts finais
* Aplicação de variáveis
* Distribuição

---

## Audit

Responsável por:

* Auditoria global

---

## SeederHub

Responsável por:

* Sincronização federada

---

# 8. Scripts Core

Scripts Core representam funcionalidades oficiais do produto.

Características:

* Imutáveis
* Versionados
* Auditáveis
* Distribuídos pelo SeederHub

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

Nenhum operador pode editar Scripts Core.

---

# 9. Scripts Personalizados

Criados pelas organizações.

Podem:

* instalar aplicações
* criar atalhos
* executar configurações locais

Não podem substituir funcionalidades Core.

---

# 10. Sistema de Variáveis

Variáveis são independentes dos scripts.

Princípio obrigatório:

Scripts não armazenam valores organizacionais.

Exemplo:

Script:

{{DOMINIO}}

{{DNS_PRIMARIO}}

{{DC_IP}}

---

OM COMARA:

DOMINIO=comara.intraer

---

OM GAP-BR:

DOMINIO=gapbr.intraer

---

Mesmo script.
Valores diferentes.

---

# 11. Sistema de Perfis

Perfil é um agrupamento lógico.

Pode conter:

* módulos Core
* scripts customizados
* branding
* políticas

---

Exemplo:

Perfil Desktop Administrativo

↓

Core.Domain

Core.Files

Core.Browser

Core.Printers

Core.Inventory

---

# 12. Provisionamento

Fluxo:

Perfil
↓
Scripts
↓
Variáveis
↓
Renderização
↓
Script Final

---

A alteração de uma variável nunca altera o conteúdo do script original.

---

# 13. Serialização

Cada organização possui:

serial_config

Exemplo:

COMARA

Serial: 102

---

Mudanças que incrementam serial:

* Branding
* Variáveis
* Políticas
* Perfis
* Repositórios

---

Mudanças que NÃO incrementam serial:

* Login
* Auditoria
* Consultas

---

# 14. SeederClient

Agente instalado nas estações.

Responsabilidades:

* Inventário
* Check-in
* Execução
* Desired State
* Provisionamento

Comunicação:

HTTPS REST

---

Check-in padrão:

15 minutos

---

# 15. Autenticação Offline

Suportar:

SSSD

Winbind

---

Recursos:

* cache_credentials
* offline_login
* expiração configurável

---

# 16. Repositórios

Modos suportados:

Internet

Corporativo

Herdado

---

As configurações pertencem à organização.

---

# 17. SeederHub

Permite:

* Compartilhar módulos
* Compartilhar perfis
* Compartilhar scripts

Modelo federado.

---

# 18. SeederMirror (Roadmap)

Módulo futuro.

Objetivo:

Criar e manter mirrors Linux corporativos.

Suportar:

* Ubuntu
* Debian
* Linux Mint
* Rocky Linux
* AlmaLinux

---

# 19. Segurança

Autenticação:

JWT Stateless

Tempo padrão:

1 hora

---

Senhas:

bcrypt

---

Auditoria:

Obrigatória em todas as operações.

---

# 20. Escalabilidade

Meta inicial:

* 100 organizações
* 10.000 estações
* 500 perfis
* 50.000 eventos de auditoria/dia

Sem necessidade de microsserviços.

A escalabilidade deverá ocorrer prioritariamente por aumento vertical dos recursos do servidor.

---

# 21. Restrições Arquiteturais

Não utilizar:

* Supabase
* Firebase
* Auth0
* Clerk
* Microsserviços
* Dependência obrigatória de internet

---

Toda funcionalidade deve operar integralmente em ambiente local e isolado.







FIM DO DOCUMENTO 02