# Documento 11 – Arquitetura de Provisionamento e Bundles

## SeederLinux – Versão 3.0

---

# 1. Objetivo

Este documento define como o SeederLinux gera, distribui, valida e aplica configurações nas estações Linux.

O provisionamento é o núcleo operacional do sistema.

Toda configuração aplicada em uma estação deve ser derivada de um Bundle de Provisionamento.

---

# 2. Conceito de Bundle

Um Bundle representa a configuração completa que uma estação deve receber.

Ele é gerado dinamicamente pelo SeederLinux.

---

## Estrutura Conceitual

```text
Bundle

├── Módulos Core
├── Scripts Personalizados
├── Variáveis da Organização
├── Branding
├── Políticas
├── Repositórios
├── Configurações de Segurança
└── Metadados
```

---

# 3. Objetivos do Bundle

Garantir:

* repetibilidade
* padronização
* auditoria
* rollback
* operação offline

---

# 4. Componentes do Bundle

## Módulos Core

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

---

## Scripts Personalizados

Desenvolvidos pela OM.

Exemplo:

```text
Instalar SIGADAER
Instalar Sistema Rancho
Instalar Ferramentas COMARA
```

---

## Variáveis

Substituem placeholders.

Exemplo:

```bash
realm join {{DOMINIO}}
```

Após geração:

```bash
realm join ccasj.intraer
```

---

# 5. Processo de Geração

Fluxo:

```text
Administrador
      ↓
Seleciona Perfil
      ↓
Seleciona Organização
      ↓
Seleciona Estação
      ↓
SeederLinux
      ↓
Gera Bundle
```

---

# 6. Ordem de Execução

A ordem deve ser obrigatória.

```text
1. Repositórios
2. Certificados
3. DNS
4. NTP
5. Domínio
6. Compartilhamentos
7. Navegadores
8. Branding
9. Impressoras
10. Inventário
11. Suporte Remoto
12. Scripts Personalizados
```

---

# 7. Sistema de Variáveis

Substituição:

```text
{{VARIAVEL}}
```

Exemplo:

```bash
echo "{{DNS_PRIMARIO}}"
```

Resultado:

```bash
echo "10.132.75.27"
```

---

# 8. Escopo das Variáveis

Variáveis pertencem à Organização.

Nunca ao Script.

---

## Correto

```text
OM COMARA

DNS_PRIMARIO
DOMINIO
PROXY_URL
```

---

## Incorreto

```text
Script possui DNS próprio
```

---

# 9. Serial Organizacional

Toda organização possui:

```text
Serial Organizacional
```

Exemplo:

```text
COMARA-000123
```

Sempre que houver alteração em:

* variáveis
* branding
* políticas
* módulos
* perfis

o serial deve ser incrementado.

---

# 10. Comparação de Serial

Serial Inicial da Estação
Para uma estação recém-cadastrada ou provisionada pela primeira vez:

text
serial_aplicado = 0
Isso assegura que a primeira verificação de serial resulte em "Servidor maior", disparando o provisionamento completo da estação.

Durante check-in:

```text
Estação → envia serial
Servidor → compara
```

Resultado:

```text
Servidor maior
```

gera:

```text
Provisionamento Necessário
```

---

# 11. Perfis de Deploy

Perfis agrupam configurações.

Exemplo:

### Administrativo

```text
Core.Domain
Core.Files
Firefox
LibreOffice
OCS
```

---

### Operacional

```text
Core.Domain
Core.Files
SIGADAER
OCS
```

---

### Laboratório

```text
Core.Domain
Firefox
Chromium
VSCode
```

---

# 12. Provisionamento por Perfil

Fluxo:

```text
Perfil
+
OM
+
Variáveis
=
Bundle
```

---

# 13. Provisionamento por Estação

Uma estação pode possuir ajustes específicos.

Exemplo:

```text
Hostname
Grupo
Função
```

Sem alterar o perfil principal.

---

# 14. Modos de Execução

## Automático

Aplicação imediata.

---

## Aprovado

Necessita aprovação do operador.

---

## Manual

Operador inicia.

---

# 15. Rollback

Todo bundle deve manter:

```text
Última Configuração Válida
```

Em caso de falha:

```text
Rollback Automático
```

---

# 16. Validação Pós-Execução

Após aplicar:

```text
DNS
Kerberos
AD
Compartilhamentos
Impressoras
Inventário
```

devem ser validados.

---

# 17. Resultado da Execução

Status possíveis:

```text
Sucesso
Sucesso com Avisos
Falha
Rollback Executado
```

---

# 18. Logs

Registrar:

```text
Início
Fim
Módulo
Script
Resultado
Erro
```

---

# 19. Assinatura de Bundle

Versão 3.x

Hash SHA256.

---

Versão 4.x

Assinatura Digital.

---

# 20. Cache de Bundle

A estação deve armazenar:

```text
Último Bundle Aplicado
```

para operação offline.

---

# 21. Integração com Repositórios

O bundle pode definir:

## Internet

```text
APT Oficial
```

---

## Espelho Institucional

```text
mirror.intraer
```

---

## Repositório Próprio da OM

```text
repo.comara.intraer
```

---

Variáveis:

```text
REPOSITORY_MODE
REPOSITORY_URL
```

---

# 22. Integração com Cache de Credenciais

O provisionamento pode configurar:

```text
SSSD Offline Cache
Winbind Offline Cache
```

Variáveis:

```text
OFFLINE_AUTH_ENABLED
OFFLINE_AUTH_DAYS
OFFLINE_AUTH_MAX_LOGINS
```

---

# 23. Operação Offline

A estação deve conseguir:

* aplicar bundle já recebido
* executar scripts locais
* utilizar cache de credenciais
* utilizar cache de repositórios

Mesmo sem comunicação com o servidor.

---

# 24. Auditoria

Toda geração de bundle deve registrar:

```text
Autor
OM
Perfil
Versão
Serial
Hash
Timestamp
```

---

# 25. Resultado Esperado

O sistema deve permitir que uma Organização Militar consiga provisionar centenas ou milhares de estações Linux de forma padronizada utilizando apenas:

* Módulos Core
* Variáveis Organizacionais
* Perfis de Deploy
* Scripts Personalizados

Sem necessidade de editar scripts ou realizar configurações manuais em cada estação.

---

### Situação da documentação v3.0

Com os documentos 01 a 11, você já possui documentação suficiente para reconstruir praticamente todo o sistema no Bolt, incluindo:

* Arquitetura completa
* Regras de negócio
* Modelo de dados
* RBAC
* Módulos Core
* Variáveis
* SeederClient
* SeederHub
* Provisionamento

Os próximos documentos que eu recomendaria criar são:

**Documento 12 – Modelo de Dados (ERD e tabelas detalhadas)**
**Documento 13 – API Specification (REST/OpenAPI)**
**Documento 14 – Wireframes e Fluxos de UI**
**Documento 15 – Roadmap Oficial do Produto**

Esses quatro documentos transformam a documentação em algo próximo de uma especificação de engenharia completa.
