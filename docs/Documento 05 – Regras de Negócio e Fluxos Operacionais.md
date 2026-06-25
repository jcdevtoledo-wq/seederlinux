# Documento 05 – Regras de Negócio e Fluxos Operacionais

## Versão 3.0

---

# 1. Objetivo

Definir todas as regras de negócio obrigatórias do SeederLinux.

Estas regras possuem prioridade máxima sobre qualquer decisão de implementação.

Caso exista conflito entre código, interface ou documentação, prevalece este documento.

---

# 2. Conceito Fundamental

O SeederLinux é um sistema multi-organização.

Toda configuração pertence a uma Organização (OM).

A OM é a unidade de isolamento do sistema.

---

# 3. Hierarquia do Sistema

```text
SeederLinux
│
├── Organização (OM)
│   ├── Variáveis
│   ├── Branding
│   ├── Scripts Customizados
│   ├── Estações
│   ├── Impressoras
│   ├── Políticas
│   └── Inventário
│
└── Catálogo Global
    ├── Módulos Core
    ├── Templates
    ├── Perfis Oficiais
    └── SeederHub
```

---

# 4. Regras do Setup Wizard

## Objetivo

Executado apenas uma vez.

---

## Não Requer Login

A rota:

```text
/setup
```

deve funcionar sem autenticação.

---

## Pode Ser Executado Apenas Uma Vez

Após finalização:

```text
system_config.setup_completed=true
```

---

## Fluxo Obrigatório

### Etapa 1

Administrador Global

Campos:

```text
Nome
Email
Senha
Confirmar Senha
```

---

### Etapa 2

Organização Raiz

Campos:

```text
Nome da Organização
Sigla
Domínio
Descrição
```

---

### Etapa 3

Confirmação

Sistema cria:

```text
admin_gap
OM Raiz
Variáveis padrão
Branding padrão
```

---

## Regra Crítica

O administrador NÃO pode ser criado sem que a OM seja criada.

Ambos devem ser criados na mesma transação.

---

## Regra Crítica

Nenhuma tela do sistema deve exigir login durante o setup.

---

# 5. Regras de Organização (OM)

---

## Toda OM Possui

```text
ID
Nome
Sigla
Domínio
Status
Serial Atual
```

---

## Sigla

Deve ser única.

Exemplo:

```text
COMARA
GAP-BR
CCA-BR
```

---

## Criação Automática

Ao criar uma OM o sistema deve automaticamente criar:

```text
Branding padrão
Catálogo de variáveis padrão
Perfis padrão
```

---

## Não Pode Existir OM Sem Variáveis

Ao salvar a organização:

```text
organization_variables
```

devem ser criadas automaticamente.

---

# 6. Regras de Variáveis

---

## Variáveis Não Pertencem aos Scripts

Variáveis pertencem à OM.

---

## Regra Crítica

Alterar uma variável:

```text
NÃO altera scripts
NÃO cria nova versão do script
```

---

## Exemplo

Script:

```bash
realm join {{DOMINIO}}
```

OM A:

```text
DOMINIO=fab.mil.br
```

OM B:

```text
DOMINIO=comara.intraer
```

Mesmo script.

---

## Catálogo Global

Toda variável deve possuir:

```text
Nome
Descrição
Tipo
Categoria
Obrigatória
Valor padrão
```

---

## Tipos

```text
string
integer
boolean
array
url
ip
cidr
```

---

# 7. Regras de Scripts

---

## Dois Tipos

### Core

Imutáveis

### Customizados

Editáveis

---

## Core

Não podem:

```text
editar
remover
alterar conteúdo
```

---

## Permitido

```text
ativar
desativar
selecionar
```

---

## Customizados

Podem:

```text
criar
editar
versionar
remover
```

---

## Variáveis

Detectadas automaticamente:

```bash
{{DOMINIO}}
{{DNS_PRIMARIO}}
{{PRINT_SERVER}}
```

---

## Interface Obrigatória

Ao criar um script deve existir:

```text
Variáveis utilizadas
Descrição
Tipo
Origem
```

---

# 8. Regras de Provisionamento

---

## Geração

O provisionamento gera:

```text
Bundle Final
```

---

## Processo

```text
Seleciona Perfil

↓

Seleciona OM

↓

Carrega Variáveis

↓

Substitui Placeholders

↓

Gera Bundle
```

---

## Regra Crítica

Nenhum script deve armazenar valores fixos da OM.

---

# 9. Regras de Perfis de Deploy

---

## Perfil

Conjunto de módulos.

Exemplo:

```text
Linux Corporativo

├── Core.Domain
├── Core.Files
├── Core.Browser
├── Core.Inventory
└── Core.Remote
```

---

## Um Perfil

Pode ser reutilizado por múltiplas OMs.

---

# 10. Regras de Estações

---

## Cadastro Manual

Permitido apenas:

```text
Testes
Homologação
Importação
```

---

## Produção

Estações devem ser criadas automaticamente pelo SeederAgent.

---

## Check-in

Periodicidade:

```text
15 minutos
```

---

## Status

```text
Nunca
OK
Atrasada
Erro
```

---

## Serial

Cada estação mantém:

```text
Serial Aplicado
Serial Atual
```

---

## Divergência

Quando:

```text
Serial Atual > Serial Aplicado
```

Status:

```text
Atualização Pendente
```

---

# 11. Regras de Usuários

---

## Perfis

### admin_gap

Controle global.

---

### operador_om

Apenas sua OM.

---

### auditor

Somente leitura.

---

## Regra Crítica

Usuário comum deve estar vinculado a uma OM.

---

## Exceção

```text
admin_gap
```

pode não possuir OM.

---

# 12. Regras de Auditoria

---

## Obrigatória

Toda ação deve gerar evento.

---

## Eventos

```text
CREATE
UPDATE
DELETE
LOGIN
LOGOUT
DEPLOY
CHECKIN
```

---

## Dados Obrigatórios

```text
Usuário
IP
Timestamp
Entidade
ID da Entidade
```

---

## Auditoria Nunca Pode Ser Excluída

Nem por admin_gap.

---

# 13. Regras de Branding

---

## Pertence à OM

Nunca ao usuário.

---

## Campos

```text
Display Name
Wallpaper
Wallpaper Login
Logo
Greeter
Tema
Conky
```

---

## Alteração

Incrementa:

```text
Serial da OM
```

---

# 14. Regras de Políticas

---

## Browser

```text
Firefox
Chrome
Chromium
```

---

## Desktop

```text
Tema
Som
Energia
Bloqueio
```

---

## Impressoras

```text
Servidor CUPS
Filas
Padrão
```

---

## Alteração

Incrementa:

```text
Serial da OM
```

---

# 15. Regras de Repositórios

(Novidade V3.0)

---

## Modos

### PUBLIC

Repositórios oficiais da internet.

---

### MIRROR

Espelho corporativo/institucional.

---

### HYBRID

Mirror como primário e internet como fallback

---

### CUSTOM
Repositório específico não categorizado.

---

## Alteração

Incrementa serial.

---

# 16. Regras de Cache de Credenciais

(Novidade V3.0)

---

## Objetivo

Permitir login offline.

---

## Configuração

Por OM.

---

## Valores

```text
Habilitado
Desabilitado
```

---

## Implementação

SSSD:

```ini
cache_credentials = True
```

---

## Regra

Não requer conectividade após login inicial.

---

# 17. Regras do SeederHub

---

## Objetivo

Distribuição de conteúdo.

---

## Pode Distribuir

```text
Perfis
Templates
Scripts
Módulos
```

---

## Não Pode Distribuir

```text
Usuários
Senhas
Tokens
Credenciais
```

---

# 18. Regras de Segurança

---

## JWT

Stateless.

---

## Expiração

```text
1 hora
```

---

## Senhas

Hash obrigatório:

```text
bcrypt
```

---

## Nunca Armazenar

```text
senha em texto
token em texto
credenciais AD
```

---

# 19. Regras de Exclusão

---

## Organização

Não pode ser removida se possuir:

```text
Estações
Usuários
Perfis
```

---

## Usuário

Não pode remover o último:

```text
admin_gap
```

---

# 20. Resultado Esperado

O sistema deve permitir que uma OM complete toda a implantação Linux corporativa apenas:

```text
1. Criando a OM

2. Preenchendo variáveis

3. Selecionando perfis

4. Gerando o bundle

5. Executando o SeederAgent
```

Sem necessidade de alterar scripts ou conhecer Linux avançado.

---

**Fim do Documento 05 – Regras de Negócio e Fluxos Operacionais (Versão 3.0)**
