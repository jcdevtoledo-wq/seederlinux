
# 📘 Documento 15 — API Specification (OpenAPI Funcional)

## SeederLinux / SoftwareLivre

### Versão 3.1 (Atualizado com Segurança TLS/PKI)

---

# 1. Objetivo

Definir a API oficial do SeederLinux.

Este documento estabelece:

* endpoints
* métodos
* payloads
* validações
* permissões
* respostas
* segurança de transporte (TLS obrigatório)

Toda implementação deve seguir esta especificação sem exceções.

---

# 2. Base da API

## Base URL

```
https://<host>/api
```

> HTTP NÃO é permitido em produção.

---

## Formato

```
application/json
```

---

# 3. Segurança de Transporte (OBRIGATÓRIO)

## 3.1 Requisito geral

Toda comunicação deve usar:

* Frontend ↔ Backend
* SeederClient ↔ API
* SeederHub ↔ SeederLinux
* Navegador ↔ Sistema

### Protocolo permitido:

```
TLS 1.2
TLS 1.3
```

### Proibido:

```
SSLv2
SSLv3
TLS 1.0
TLS 1.1
HTTP direto
```

---

## 3.2 Modos de Certificado

### 🔵 Modo 1 — Certificado Público

Usado quando há internet e DNS válido.

Exemplo:

```
https://seeder.comara.intraer
```

Suporte:

* Let's Encrypt
* ACME

---

### 🟡 Modo 2 — Certificado Corporativo (PKI)

Usado em ambientes governamentais/militares.

Exemplo:

* CA FAB
* CA COMARA
* CA institucional

---

### 🔴 Modo 3 — Certificado Autoassinado (Offline)

Usado em ambientes isolados.

O sistema deve permitir:

* gerar CA local
* gerar certificado do servidor
* assinar automaticamente
* exportar CA
* distribuir CA para estações

---

## 3.3 Infraestrutura obrigatória

O SeederLinux deve operar com:

* CA interna (Seeder CA)
* Certificado do servidor assinado pela CA
* Distribuição automática via provisionamento

Fluxo:

```
Seeder CA
   ↓
Certificado Servidor
   ↓
SeederClient confia
   ↓
HTTPS válido sem alertas
```

---

# 4. Resposta padrão da API

## Sucesso

```json
{
  "success": true,
  "data": {}
}
```

## Erro

```json
{
  "success": false,
  "message": "Descrição do erro"
}
```

---

# 5. Autenticação

## JWT Bearer Token

```
Authorization: Bearer <token>
```

Cookies devem ser:

* Secure
* HttpOnly
* SameSite=Strict

---

# 6. Setup Wizard (ALTERADO)

## POST /api/setup

Executado apenas uma vez.

---

### Request

```json
{
  "adminName": "Administrador",
  "adminEmail": "admin@empresa.local",
  "password": "SenhaForte",

  "organization": {
    "name": "COMARA",
    "sigla": "COMARA",
    "domain": "intraer",
    "netbios": "INTRAER"
  },

  "tls": {
    "mode": "SELF_SIGNED | PKI | ACME",
    "generateCA": true
  }
}
```

---

### Etapas obrigatórias

1. Admin global
2. Organização raiz
3. Configuração TLS
4. Geração de certificados
5. Inicialização do sistema

---

# 7. Auth

## POST /api/auth/login

```json
{
  "email": "admin@om.local",
  "password": "senha"
}
```

---

## GET /api/auth/me

## POST /api/auth/logout

---

# 8. Organizações

(inalterado funcionalmente)

* GET /api/organizations
* POST /api/organizations
* PUT /api/organizations/{id}
* DELETE /api/organizations/{id}

---

# 9. Usuários

(inalterado funcionalmente)

---

# 10. Variáveis

(inalterado)

---

# 11. Scripts

(inalterado)

Regra crítica mantida:

```
CORE scripts não podem ser alterados ou removidos
```

---

# 12. Perfis de Deploy

(inalterado)

---

# 13. Branding

(inalterado)

---

# 14. Browser Policies

(inalterado)

---

# 15. Desktop Policies

(inalterado)

---

# 16. Impressoras

(inalterado)

---

# 17. Estações

(inalterado)

---

# 18. Check-in do SeederAgent

## POST /api/stations/checkin

Adição importante:

### Validação obrigatória TLS:

O agente deve validar:

* CN do certificado
* SAN
* CA confiável
* validade
* cadeia completa

antes de enviar:

* inventário
* jobs
* telemetria

---

# 19. Tokens de Estação

(inalterado)

---

# 20. Provisionamento

(inalterado)

---

# 21. Jobs Remotos

(inalterado)

---

# 22. Auditoria

(inalterado)

---

# 23. SeederHub

(inalterado)

---

# 24. Segurança

```json
{
  "jwtExpiration": 3600,
  "offlineLoginEnabled": true,
  "offlineLoginDays": 30
}
```

---

# 25. Configurações Globais

(inalterado)

---

# 26. Repositórios Linux

(inalterado)

---

# 27. Regras Obrigatórias da API

Agora incluindo segurança:

### Todos endpoints devem:

* validar JWT
* validar RBAC
* validar organização
* registrar auditoria
* validar ownership
* operar apenas em HTTPS

---

# 28. Infraestrutura (NOVO MÓDULO)

## Core.CertManager

Funções:

* gerar CA local
* gerar certificados
* renovar certificados
* importar CA externa
* exportar CA
* distribuir CA via provisioning

Variáveis:

```
TLS_MODE
TLS_CERT_PATH
TLS_KEY_PATH
TLS_CA_PATH
TLS_AUTO_RENEW
```

---

# 29. Docker / Deploy (ATUALIZADO)

## Proibido:

```
http://localhost:8000
```

## Obrigatório:

```
https://localhost:8443
```

## Arquitetura:

```
Internet/LAN
     ↓
  Traefik (TLS)
     ↓
Frontend ─ Backend
     ↓
 PostgreSQL
```

---

# 30. Critérios de Homologação

Sistema só é válido se:

* HTTPS funcionando (obrigatório)
* CA interna funcional (offline)
* Login OK
* Setup Wizard completo
* Organização criada
* Usuários criados
* Scripts versionados
* Provisionamento funcional
* Check-in do agente OK
* Auditoria ativa
* RBAC funcionando
* Distribuição de certificados operacional

---

# 31. Regra Final (CRÍTICA)

O SeederLinux deve ser:

> **offline-first, TLS-first e CA-native**

Ou seja:

* nunca depende de HTTP
* nunca depende de certificado externo obrigatório
* nunca falha em ambiente isolado

---

**Fim do Documento 15 — API Specification v3.1**