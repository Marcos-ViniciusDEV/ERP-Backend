# backend

API Backend para o sistema ERP

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg) ![License](https://img.shields.io/badge/license-ISC-green.svg) ![Deploy Status](https://img.shields.io/badge/deploy-pending-yellow.svg)

## Sumário

- [Guia de Instalação](#guia-de-instalação)
- [Rotas da API](#rotas-da-api)
- [Tecnologias](#tecnologias)

## Guia de Instalação

```bash
# Clone o repositório
git clone <seu-repositorio>

# Entre na pasta do backend
cd backend

# Instale as dependências
npm install

# Configure as variáveis de ambiente (.env)
# (Adicione aqui instruções sobre o .env se necessário)

# Inicie o servidor de desenvolvimento
npm run dev
```

## Rotas da API

| Método             | Rota                         | Parâmetros                    | Retorno                 |
| ------------------ | ---------------------------- | ----------------------------- | ----------------------- |
| **Auth**           |                              |                               |                         |
| POST               | `/auth/login`                | `body`: email, password       | Token JWT               |
| POST               | `/auth/register`             | `body`: name, email, password | Usuário criado          |
| GET                | `/auth/me`                   | `header`: Authorization       | Dados do usuário logado |
| **Clientes**       |                              |                               |                         |
| GET                | `/clientes`                  | `query`: filtros (opcional)   | Lista de clientes       |
| POST               | `/clientes`                  | `body`: dados do cliente      | Cliente criado          |
| PUT                | `/clientes/:id`              | `params`: id, `body`: dados   | Cliente atualizado      |
| DELETE             | `/clientes/:id`              | `params`: id                  | Confirmação de remoção  |
| **Produtos**       |                              |                               |                         |
| GET                | `/produtos`                  | `query`: filtros              | Lista de produtos       |
| POST               | `/produtos`                  | `body`: dados do produto      | Produto criado          |
| PUT                | `/produtos/:id`              | `params`: id, `body`: dados   | Produto atualizado      |
| PUT                | `/produtos/:id/precos`       | `params`: id, `body`: preços  | Preços atualizados      |
| DELETE             | `/produtos/:id`              | `params`: id                  | Confirmação de remoção  |
| **Vendas**         |                              |                               |                         |
| GET                | `/vendas`                    | `query`: filtros              | Lista de vendas         |
| POST               | `/vendas`                    | `body`: dados da venda        | Venda criada            |
| **Fornecedores**   |                              |                               |                         |
| GET                | `/fornecedores`              | `query`: filtros              | Lista de fornecedores   |
| POST               | `/fornecedores`              | `body`: dados                 | Fornecedor criado       |
| PUT                | `/fornecedores/:id`          | `params`: id, `body`: dados   | Fornecedor atualizado   |
| DELETE             | `/fornecedores/:id`          | `params`: id                  | Confirmação de remoção  |
| **Departamentos**  |                              |                               |                         |
| GET                | `/departamentos`             | -                             | Lista de departamentos  |
| POST               | `/departamentos`             | `body`: nome                  | Departamento criado     |
| **Pedidos Compra** |                              |                               |                         |
| GET                | `/pedidos-compra`            | `query`: filtros              | Lista de pedidos        |
| POST               | `/pedidos-compra`            | `body`: dados do pedido       | Pedido criado           |
| **Contas Pagar**   |                              |                               |                         |
| GET                | `/contas-pagar`              | `query`: filtros              | Lista de contas         |
| POST               | `/contas-pagar`              | `body`: dados da conta        | Conta criada            |
| **Contas Receber** |                              |                               |                         |
| GET                | `/contas-receber`            | `query`: filtros              | Lista de contas         |
| POST               | `/contas-receber`            | `body`: dados da conta        | Conta criada            |
| **Kardex**         |                              |                               |                         |
| GET                | `/kardex/produto/:produtoId` | `params`: produtoId           | Histórico do produto    |
| POST               | `/kardex`                    | `body`: dados de movimento    | Movimento registrado    |

## Tecnologias

### Dependencies

- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`
- `cors`
- `dotenv`
- `drizzle-orm`
- `express`
- `jose`
- `mysql2`
- `zod`
- `nanoid`

### DevDependencies

- `@types/cors`
- `@types/express`
- `@types/node`
- `drizzle-kit`
- `esbuild`
- `tsx`
- `typescript`
