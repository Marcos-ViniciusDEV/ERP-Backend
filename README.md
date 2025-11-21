# backend

API backend para sistema de gestão empresarial completo, incluindo controle de estoque, vendas, compras, financeiro e inventário.

## Badges

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Deploy Status](https://img.shields.io/badge/deploy-pending-yellow.svg)

## Sumário

- [Guia de Instalação](#guia-de-instalação)
- [Rotas da API](#rotas-da-api)
  - [Autenticação](#autenticação)
  - [Clientes](#clientes)
  - [Produtos](#produtos)
  - [Vendas](#vendas)
  - [Fornecedores](#fornecedores)
  - [Pedidos de Compra](#pedidos-de-compra)
  - [Inventário](#inventário)
  - [Kardex](#kardex)
  - [Caixa](#caixa)
  - [Contas a Pagar](#contas-a-pagar)
  - [Contas a Receber](#contas-a-receber)
  - [Departamentos](#departamentos)
- [Tecnologias](#tecnologias)

## Guia de Instalação

### Pré-requisitos

- Node.js (versão 18 ou superior)
- MySQL (versão 8 ou superior)
- npm ou yarn

### Passos de Instalação

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd backend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   # ou
   yarn install
   ```

3. **Configure as variáveis de ambiente:**
   - Crie um arquivo `.env` na raiz do projeto
   - Configure as variáveis necessárias (banco de dados, JWT, AWS S3, etc.)

4. **Execute as migrações do banco de dados:**
   ```bash
   npm run db:push
   ```

5. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

6. **Para build de produção:**
   ```bash
   npm run build
   npm start
   ```

## Rotas da API

### Autenticação

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| POST | `/auth/login` | `body`: { email, password } | JSON com token JWT e dados do usuário |
| POST | `/auth/register` | `body`: { name, email, password } | JSON com usuário criado (201 Created) |
| GET | `/auth/me` | `headers`: Authorization Bearer token | JSON com dados do usuário autenticado |

### Clientes

> **Nota:** Todas as rotas de clientes requerem autenticação (Bearer token).

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| GET | `/clientes` | - | JSON com lista de clientes |
| POST | `/clientes` | `body`: { nome, email, telefone, endereco, ... } | JSON com cliente criado (201 Created) |
| PUT | `/clientes/:id` | `params`: id<br>`body`: dados a atualizar | JSON com cliente atualizado |
| DELETE | `/clientes/:id` | `params`: id | Status 204 No Content |

### Produtos

> **Nota:** Todas as rotas de produtos requerem autenticação (Bearer token).

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| GET | `/produtos` | - | JSON com lista de produtos |
| POST | `/produtos` | `body`: { nome, descricao, preco, estoque, ... } | JSON com produto criado (201 Created) |
| PUT | `/produtos/:id` | `params`: id<br>`body`: dados a atualizar | JSON com produto atualizado |
| PUT | `/produtos/:id/precos` | `params`: id<br>`body`: { precoVenda, precoCusto, ... } | JSON com preços atualizados |
| DELETE | `/produtos/:id` | `params`: id | Status 204 No Content |

### Vendas

> **Nota:** Todas as rotas de vendas requerem autenticação (Bearer token).

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| GET | `/vendas` | - | JSON com lista de vendas |
| POST | `/vendas` | `body`: { clienteId, itens[], total, ... } | JSON com venda criada (201 Created) |

### Fornecedores

> **Nota:** Todas as rotas de fornecedores requerem autenticação (Bearer token).

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| GET | `/fornecedores` | - | JSON com lista de fornecedores |
| POST | `/fornecedores` | `body`: { nome, cnpj, contato, ... } | JSON com fornecedor criado (201 Created) |
| PUT | `/fornecedores/:id` | `params`: id<br>`body`: dados a atualizar | JSON com fornecedor atualizado |
| DELETE | `/fornecedores/:id` | `params`: id | Status 204 No Content |

### Pedidos de Compra

> **Nota:** Todas as rotas de pedidos de compra requerem autenticação (Bearer token).

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| GET | `/pedidos-compra` | - | JSON com lista de pedidos de compra |
| POST | `/pedidos-compra` | `body`: { fornecedorId, itens[], total, ... } | JSON com pedido criado (201 Created) |

### Inventário

> **Nota:** Todas as rotas de inventário requerem autenticação (Bearer token).

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| GET | `/inventario` | - | JSON com lista de inventários |
| POST | `/inventario` | `body`: { data, observacoes, ... } | JSON com inventário criado (201 Created) |
| GET | `/inventario/:id` | `params`: id | JSON com detalhes do inventário |
| POST | `/inventario/:id/itens` | `params`: id<br>`body`: { produtoId, quantidadeContada, ... } | JSON com item adicionado ao inventário |

### Kardex

> **Nota:** Todas as rotas de kardex requerem autenticação (Bearer token).

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| GET | `/kardex/produto/:produtoId` | `params`: produtoId | JSON com movimentações do produto |
| GET | `/kardex` | - | JSON com todas as movimentações |
| POST | `/kardex` | `body`: { produtoId, tipo, quantidade, ... } | JSON com movimentação criada (201 Created) |

### Caixa

> **Nota:** Todas as rotas de caixa requerem autenticação (Bearer token).

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| GET | `/caixa` | - | JSON com lista de movimentações de caixa |
| POST | `/caixa` | `body`: { tipo, valor, descricao, ... } | JSON com movimentação criada (201 Created) |

### Contas a Pagar

> **Nota:** Todas as rotas de contas a pagar requerem autenticação (Bearer token).

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| GET | `/contas-pagar` | - | JSON com lista de contas a pagar |
| POST | `/contas-pagar` | `body`: { fornecedorId, valor, vencimento, ... } | JSON com conta criada (201 Created) |

### Contas a Receber

> **Nota:** Todas as rotas de contas a receber requerem autenticação (Bearer token).

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| GET | `/contas-receber` | - | JSON com lista de contas a receber |
| POST | `/contas-receber` | `body`: { clienteId, valor, vencimento, ... } | JSON com conta criada (201 Created) |

### Departamentos

> **Nota:** Todas as rotas de departamentos requerem autenticação (Bearer token).

| Método | Rota | Parâmetros | Retorno |
|--------|------|------------|---------|
| GET | `/departamentos` | - | JSON com lista de departamentos |
| POST | `/departamentos` | `body`: { nome, descricao, ... } | JSON com departamento criado (201 Created) |

## Tecnologias

### Dependências Principais

- **express** - Framework web minimalista e flexível para Node.js
- **drizzle-orm** - ORM TypeScript-first para SQL databases
- **mysql2** - Cliente MySQL para Node.js
- **zod** - Validação de schemas TypeScript-first
- **jose** - Implementação de JWT/JWS/JWE/JWK/JWA
- **axios** - Cliente HTTP baseado em Promises
- **cors** - Middleware para habilitar CORS
- **dotenv** - Carregamento de variáveis de ambiente
- **cookie** - Parsing e serialização de cookies HTTP
- **nanoid** - Gerador de IDs únicos
- **@aws-sdk/client-s3** - Cliente AWS SDK para S3
- **@aws-sdk/s3-request-presigner** - Gerador de URLs pré-assinadas para S3

### Dependências de Desenvolvimento

- **typescript** - Superset JavaScript com tipagem estática
- **tsx** - TypeScript executor para Node.js
- **esbuild** - Bundler e minificador JavaScript extremamente rápido
- **drizzle-kit** - CLI para migrações e gerenciamento do Drizzle ORM
- **@types/node** - Definições de tipos TypeScript para Node.js
- **@types/express** - Definições de tipos TypeScript para Express
- **@types/cors** - Definições de tipos TypeScript para CORS
- **@types/cookie** - Definições de tipos TypeScript para Cookie
- **@types/axios** - Definições de tipos TypeScript para Axios

---

**Desenvolvido com ❤️ usando Node.js e TypeScript**
