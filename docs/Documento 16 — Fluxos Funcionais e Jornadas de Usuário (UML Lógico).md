
# 📘 Documento 16 — Fluxos Funcionais e Jornadas de Usuário (UML Lógico)

## SeederLinux / SoftwareLivre

### Versão 1.0

---

# 1. Objetivo

Definir os fluxos funcionais completos do SeederLinux, incluindo:

* jornadas de usuário (UX flows)
* fluxos administrativos
* fluxos do SeederAgent
* fluxos de provisionamento
* fluxos de segurança
* estados do sistema
* diagramas UML em forma textual estruturada

Este documento elimina ambiguidades de comportamento entre frontend, backend e agente.

---

# 2. Visão Geral de Arquitetura Funcional

## 2.1 Componentes

* Frontend (Painel Web)
* Backend (API SeederLinux)
* SeederAgent (Estação Linux)
* SeederHub (Catálogo externo)
* Core.CertManager (Infraestrutura TLS)

---

## 2.2 Fluxo Macro do Sistema

```plaintext
[Usuário Admin]
      ↓
[Frontend Web]
      ↓
[API SeederLinux]
      ↓
[PostgreSQL]
      ↓
[Provisionamento]
      ↓
[SeederAgent]
      ↓
[Estação Linux configurada]
```

---

# 3. Jornada 1 — Setup Inicial do Sistema (CRÍTICA)

## 3.1 Objetivo

Inicializar completamente o SeederLinux em uma OM.

---

## 3.2 Fluxo

```plaintext
START
  ↓
Verificar sistema já inicializado?
  ↓ (não)
Exibir Setup Wizard
  ↓
Criar Admin Global
  ↓
Criar Organização Raiz
  ↓
Configurar TLS
  ↓
Gerar CA (se SELF_SIGNED)
  ↓
Criar certificado servidor
  ↓
Iniciar backend
  ↓
Sistema ONLINE
END
```

---

## 3.3 Estados do Sistema

```plaintext
UNINITIALIZED
→ SETUP_IN_PROGRESS
→ TLS_CONFIGURING
→ READY
→ ONLINE
```

---

## 3.4 Regras

* Setup só pode rodar uma vez
* TLS é obrigatório antes do estado ONLINE
* Sem certificado válido = sistema bloqueado

---

# 4. Jornada 2 — Login e Autenticação

## 4.1 Fluxo

```plaintext
Usuário acessa sistema
  ↓
Frontend chama /auth/login
  ↓
Backend valida credenciais
  ↓
Se válido:
    → gera JWT
    → retorna role + organização
  ↓
Frontend armazena sessão segura
  ↓
Redireciona Dashboard
```

---

## 4.2 Estados

```plaintext
LOGGED_OUT
→ AUTHENTICATING
→ LOGGED_IN
```

---

## 4.3 Falhas

* senha inválida → erro 401
* usuário sem organização → bloqueio
* JWT expirado → logout automático

---

# 5. Jornada 3 — Criação de Organização

## 5.1 Fluxo

```plaintext
Admin GAP acessa Organizations
  ↓
POST /organizations
  ↓
Backend cria:
    - organização
    - branding padrão
    - catálogo de variáveis
    - serial inicial
  ↓
Sistema retorna organização ativa
```

---

## 5.2 Regras

* sigla única
* domínio único
* sempre cria defaults automaticamente

---

# 6. Jornada 4 — Criação de Usuário

## 6.1 Fluxo

```plaintext
Admin seleciona Organização
  ↓
Cria usuário
  ↓
Define role:
    - admin_gap
    - operador_om
    - auditor
  ↓
Sistema valida RBAC
  ↓
Salva usuário
```

---

## 6.2 Regra crítica

```plaintext
operador_om SEM organização = inválido
```

---

# 7. Jornada 5 — Criação de Variáveis (Infraestrutura Base)

## 7.1 Fluxo

```plaintext
Admin acessa Variables
  ↓
Cria variável (DNS, proxy, AD, etc.)
  ↓
Sistema valida tipo
  ↓
Armazena por organização
  ↓
Disponível para scripts
```

---

## 7.2 Tipos suportados

* IP
* STRING
* BOOLEAN
* URL
* PATH

---

# 8. Jornada 6 — Scripts de Provisionamento

## 8.1 Fluxo

```plaintext
Admin cria script
  ↓
Define categoria
  ↓
Usa variáveis (placeholders)
  ↓
Backend valida dependências
  ↓
Armazena script versionado
```

---

## 8.2 Regra

```plaintext
CORE scripts são imutáveis
```

---

# 9. Jornada 7 — Criação de Perfil de Deploy

## 9.1 Fluxo

```plaintext
Admin seleciona scripts
  ↓
Agrupa em Profile
  ↓
Associa à organização
  ↓
Salva perfil
```

---

## 9.2 Resultado

Perfil representa uma “imagem lógica da estação”

---

# 10. Jornada 8 — Provisionamento de Estação

## 10.1 Fluxo principal

```plaintext
Admin seleciona Profile
  ↓
POST /provisioning/generate
  ↓
Backend:
    - carrega scripts
    - injeta variáveis
    - monta bundle final
  ↓
Bundle enviado ao SeederAgent
```

---

## 10.2 Resultado

```plaintext
Station Linux configurada automaticamente
```

---

# 11. Jornada 9 — Check-in do SeederAgent

## 11.1 Fluxo

```plaintext
SeederAgent inicia
  ↓
Obtém token da estação
  ↓
Valida certificado TLS
  ↓
Envia check-in
  ↓
Backend responde:
    - serial de configuração
    - jobs pendentes
```

---

## 11.2 Ciclo contínuo

```plaintext
check-in a cada X minutos
```

---

# 12. Jornada 10 — Execução de Jobs Remotos

## 12.1 Fluxo

```plaintext
Admin envia job
  ↓
Backend armazena job
  ↓
SeederAgent busca via check-in
  ↓
Executa:
    - script
    - reboot
    - update
```

---

## 12.2 Estados do Job

```plaintext
PENDING
RUNNING
SUCCESS
FAILED
```

---

# 13. Jornada 11 — Gestão de Certificados (CRÍTICA)

## 13.1 Fluxo

```plaintext
Admin acessa TLS Manager
  ↓
Escolhe modo:
    - ACME
    - PKI
    - SELF_SIGNED
  ↓
Core.CertManager executa:
    - gera CA (se necessário)
    - gera certificado servidor
    - distribui CA
```

---

## 13.2 Distribuição automática

```plaintext
SeederHub → SeederAgent → estação confia automaticamente
```

---

# 14. UML — Estados do Sistema

```plaintext
UNINITIALIZED
   ↓
SETUP
   ↓
TLS_CONFIG
   ↓
READY
   ↓
ONLINE
   ↓
MAINTENANCE
```

---

# 15. UML — Fluxo de Estação

```plaintext
BOOT
 ↓
LOAD AGENT
 ↓
VALIDATE CERT
 ↓
CHECK-IN
 ↓
RECEIVE CONFIG
 ↓
EXECUTE JOBS
 ↓
IDLE LOOP
```

---

# 16. UML — Componentes

```plaintext
Frontend
   ↔
Backend API
   ↔
Database
   ↔
CertManager
   ↔
SeederAgent
   ↔
SeederHub
```

---

# 17. Regras Gerais de Consistência

* Todo fluxo depende de organização
* Todo dado é multi-tenant
* Nenhum agente opera sem TLS válido
* Nenhuma estação opera sem check-in inicial
* Nenhuma configuração existe fora de organização
* Toda estação nova possui serial_aplicado = 0


---

# 18. Critérios de Aceitação do Sistema

O sistema só é considerado funcional se:

* Setup Wizard completa sem intervenção manual
* Login e RBAC funcionam
* Organização cria dados automaticamente
* Scripts são versionados corretamente
* Provisionamento gera estação funcional
* Agent realiza check-in contínuo
* Jobs são executados remotamente
* TLS funciona em modo offline

---

# 19. Fechamento

Este documento define o comportamento real do SeederLinux.

Ele transforma a API (Documento 15) em **fluxos executáveis e testáveis**, permitindo:

* desenvolvimento frontend sem ambiguidades
* implementação backend determinística
* integração do SeederAgent sem interpretação livre
