# Backend - ERP System API

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)

RESTful API for complete ERP system with inventory management, sales, purchases, financial control, and PDV integration.

---

## 📑 Table of Contents

- [Installation](#-installation)
- [Features](#-features)
- [API Routes](#-api-routes)
- [Technologies](#-technologies)
- [Environment Variables](#-environment-variables)
- [Database](#-database)

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Steps

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your settings

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

---

## ✨ Features

### 📦 Inventory Management
- Product CRUD with barcode support
- Stock control and movements (Kardex)
- Inventory counting and reconciliation
- Departments and categories

### 💰 Sales & Financial
- Complete sales management
- Accounts receivable
- Accounts payable
- Cash flow control
- Multiple payment methods

### 🛒 Purchase Management
- Purchase orders
- Supplier management
- Invoice verification (NFe)
- Automatic stock updates

### 🏪 PDV Integration
- Real-time synchronization with offline PDV
- WebSocket support for live updates
- Catalog distribution
- Sales consolidation

### 👥 User Management
- Role-based access control (RBAC)
- JWT authentication
- Password encryption (PBKDF2)

---

## 🔌 API Routes

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |

### Products
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/produtos` | List all products |
| GET | `/api/produtos/:id` | Get product by ID |
| POST | `/api/produtos` | Create product |
| PUT | `/api/produtos/:id` | Update product |
| DELETE | `/api/produtos/:id` | Delete product |

### Sales
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/vendas` | List sales |
| GET | `/api/vendas/:id` | Get sale by ID |
| POST | `/api/vendas` | Create sale |
| PUT | `/api/vendas/:id` | Update sale |

### PDV Sync
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/pdv/carga-inicial` | Get initial catalog |
| POST | `/api/pdv/sincronizar` | Sync sales and cash movements |
| WS | `/pdv-ws` | WebSocket for real-time updates |

### Purchases
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/pedidos-compra` | List purchase orders |
| POST | `/api/pedidos-compra` | Create purchase order |
| PUT | `/api/pedidos-compra/:id` | Update purchase order |

### Financial
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/contas-receber` | Accounts receivable |
| GET | `/api/contas-pagar` | Accounts payable |
| GET | `/api/caixa` | Cash flow |

---

## 🛠 Technologies

### Core
- **express** - Web framework
- **typescript** - Type safety
- **drizzle-orm** - SQL ORM
- **mysql2** - MySQL driver

### Authentication & Security
- **jose** - JWT handling
- **cookie** - Cookie parsing
- **cors** - CORS middleware

### Utilities
- **axios** - HTTP client
- **zod** - Schema validation
- **dotenv** - Environment variables
- **ws** - WebSocket server
- **nanoid** - ID generation

### AWS Integration
- **@aws-sdk/client-s3** - S3 file storage
- **@aws-sdk/s3-request-presigner** - Presigned URLs

### Development
- **tsx** - TypeScript execution
- **esbuild** - Fast bundler
- **drizzle-kit** - Database migrations

---

## 🔐 Environment Variables

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/erp_db

# JWT (use at least 64 random characters in production)
# Example generation: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-strong-random-secret
REFRESH_TOKEN_DAYS=7
FISCAL_PENDING_WARNING_MINUTES=15
FISCAL_PENDING_CRITICAL_MINUTES=60
FISCAL_CONTINGENCY_LEGAL_HOURS=24
FISCAL_POLLING_INTERVAL_MS=60000
FISCAL_POLLING_BATCH_SIZE=20

# Mercado Pago: checkout comercial PIX da assinatura SaaS
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-your-access-token
MERCADO_PAGO_PUBLIC_KEY=APP_USR-your-public-key
MERCADO_PAGO_WEBHOOK_SECRET=your-webhook-secret
MERCADO_PAGO_WEBHOOK_URL=https://erp.example.com/api/checkout/webhooks/mercado-pago

# Encryption for persisted provider/certificate secrets
# Use a different strong random value in production. Existing installations
# temporarily fall back to JWT_SECRET until this variable is configured.
SECRETS_ENCRYPTION_KEY=your-dedicated-encryption-key

# AWS S3 (optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket

# Server
PORT=3000
NODE_ENV=development
```

---

## Commercial checkout

The public checkout uses Mercado Pago Payment Brick for PIX, card and boleto payments:

```text
GET  /api/checkout/planos
GET  /api/checkout/configuracao
POST /api/checkout/pix
POST /api/checkout/pagamentos
GET  /api/checkout/:uuid/status
POST /api/checkout/webhooks/mercado-pago
```

Configure a publicly accessible `MERCADO_PAGO_WEBHOOK_URL`; Mercado Pago cannot notify `localhost`.

---

## Health checks

```text
GET /health        # Liveness compativel com instalacoes existentes
GET /health/live   # Processo HTTP ativo, sem depender do banco
GET /health/ready  # Pronto para trafego somente quando o MySQL responder
```

Use `/health/live` para reinicio automatico do processo e `/health/ready` para retirar a instancia do balanceador quando o banco estiver indisponivel.

---

## 💾 Database

### Schema
- **users** - System users
- **produtos** - Products catalog
- **vendas** - Sales records
- **venda_itens** - Sale items
- **pedidos_compra** - Purchase orders
- **fornecedores** - Suppliers
- **clientes** - Customers
- **contas_receber** - Accounts receivable
- **contas_pagar** - Accounts payable
- **caixa** - Cash movements
- **kardex** - Stock movements
- **conferencias** - Inventory counts

### Migrations

```bash
# Generate migration
npm run db:push

# View database in Drizzle Studio
npx drizzle-kit studio
```

---

## 📜 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run db:push  # Run database migrations
```

---

## 📝 License

 Author: Marcos Vinicius
 Last Updated: November 2025
