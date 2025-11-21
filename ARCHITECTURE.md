# 🏗️ Arquitetura MVC + Services - Backend ERP

## 📁 Estrutura de Pastas

```
backend/src/
├── models/              # 📋 Models - Interfaces e Schemas de Validação
│   ├── produto.model.ts
│   ├── venda.model.ts
│   ├── cliente.model.ts
│   └── ...
│
├── services/            # 💼 Services - Lógica de Negócio
│   ├── produto.service.ts
│   ├── venda.service.ts
│   ├── auth.service.ts
│   └── ...
│
├── controllers/         # 🎮 Controllers - Camada de Apresentação
│   ├── produto.controller.ts
│   ├── venda.controller.ts
│   ├── auth.controller.ts
│   └── ...
│
├── routes/              # 🛣️ Routes - Definição de Endpoints tRPC
│   ├── produtos-mvc.routes.ts
│   ├── vendas-mvc.routes.ts
│   └── ...
│
├── middleware/          # 🔒 Middlewares
│   ├── auth.middleware.ts
│   └── ...
│
├── config/              # ⚙️ Configurações
│   └── database.config.ts
│
├── utils/               # 🛠️ Utilitários
│   └── helpers.ts
│
├── _core/               # 🧱 Core (tRPC, Auth, etc)
│   ├── trpc.ts
│   ├── auth.ts
│   └── ...
│
├── db.ts                # 🗄️ Camada de Acesso a Dados (DAL)
└── routers.ts           # 📡 Router Principal
```

---

## 🔄 Fluxo de Requisição

```
┌─────────┐      ┌────────────┐      ┌─────────┐      ┌─────┐
│ Cliente │ ───> │   Route    │ ───> │Controller│ ───> │Service│
│ (tRPC)  │      │ (Endpoint) │      │          │      │       │
└─────────┘      └────────────┘      └─────────┘      └───┬───┘
                                                            │
                                                            ▼
                                                        ┌───────┐
                                                        │  DB   │
                                                        │(DAL)  │
                                                        └───────┘
```

**Exemplo Prático:**

1. **Cliente** faz request: `trpc.produtos.create.mutate({ codigo: "001", ... })`
2. **Route** (`produtos-mvc.routes.ts`) recebe e valida com Zod
3. **Controller** (`produto.controller.ts`) trata erros HTTP
4. **Service** (`produto.service.ts`) executa lógica de negócio
5. **DAL** (`db.ts`) executa query no banco
6. Resposta retorna pelo caminho inverso

---

## 📋 Responsabilidades de Cada Camada

### 1️⃣ **Models** (`models/`)

**O QUE FAZ:**

- Define interfaces TypeScript
- Schemas de validação (Zod)
- Tipos de input/output

**EXEMPLO:**

```typescript
// models/produto.model.ts
export const createProdutoSchema = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  precoCusto: z.number().min(0),
});

export interface Produto {
  id: number;
  codigo: string;
  descricao: string;
  // ...
}
```

**NÃO FAZ:**

- ❌ Lógica de negócio
- ❌ Acesso ao banco
- ❌ Tratamento de erros HTTP

---

### 2️⃣ **Services** (`services/`)

**O QUE FAZ:**

- Lógica de negócio (cálculos, validações complexas)
- Orquestração de múltiplas operações
- Regras de domínio da aplicação

**EXEMPLO:**

```typescript
// services/venda.service.ts
export class VendaService {
  async create(data: CreateVendaInput, usuarioId: number) {
    // 1. Validar estoque
    for (const item of data.itens) {
      const temEstoque = await this.checkEstoque(item.produtoId, item.quantidade);
      if (!temEstoque) throw new Error("Estoque insuficiente");
    }

    // 2. Calcular totais
    const valorLiquido = this.calcularTotal(data.itens, data.desconto);

    // 3. Criar venda
    const venda = await createVenda({ ...data, valorLiquido });

    // 4. Movimentar estoque
    await this.movimentarEstoque(venda);

    return venda;
  }
}
```

**NÃO FAZ:**

- ❌ Tratamento de erros HTTP (TRPCError)
- ❌ Validação de input (Zod faz isso)
- ❌ Queries diretas no banco (DAL faz isso)

---

### 3️⃣ **Controllers** (`controllers/`)

**O QUE FAZ:**

- Recebe requisições HTTP/tRPC
- Valida permissões
- Chama services
- Trata erros e retorna códigos HTTP corretos

**EXEMPLO:**

```typescript
// controllers/produto.controller.ts
export class ProdutoController {
  async create(data: CreateProdutoInput) {
    try {
      return await produtoService.create(data);
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });
    }
  }
}
```

**NÃO FAZ:**

- ❌ Lógica de negócio complexa
- ❌ Acesso direto ao banco
- ❌ Cálculos de domínio

---

### 4️⃣ **Routes** (`routes/`)

**O QUE FAZ:**

- Define endpoints
- Aplica middlewares (auth, validação)
- Conecta controller aos endpoints tRPC

**EXEMPLO:**

```typescript
// routes/produtos-mvc.routes.ts
export const produtosRouter = router({
  create: protectedProcedure
    .input(createProdutoSchema) // Validação Zod
    .mutation(async ({ input }) => {
      return produtoController.create(input);
    }),
});
```

**NÃO FAZ:**

- ❌ Lógica de negócio
- ❌ Tratamento de erros (Controller faz)

---

### 5️⃣ **DAL - Data Access Layer** (`db.ts`)

**O QUE FAZ:**

- Queries SQL/ORM
- CRUD básico
- Conexão com banco

**EXEMPLO:**

```typescript
// db.ts
export async function createProduto(produto: InsertProduto) {
  const db = await getDb();
  return db.insert(produtos).values(produto);
}
```

**NÃO FAZ:**

- ❌ Lógica de negócio
- ❌ Validações complexas

---

## 🎯 Vantagens da Arquitetura MVC + Services

✅ **Separação de Responsabilidades** - Cada camada tem função clara  
✅ **Testabilidade** - Services podem ser testados isoladamente  
✅ **Manutenibilidade** - Fácil localizar e modificar código  
✅ **Reusabilidade** - Services podem ser usados por múltiplos controllers  
✅ **Escalabilidade** - Fácil adicionar novos módulos

---

## 📦 Como Adicionar Novo Módulo

### Exemplo: Adicionar módulo de **Fornecedores**

1. **Criar Model** (`models/fornecedor.model.ts`)

```typescript
export const createFornecedorSchema = z.object({
  nome: z.string(),
  cnpj: z.string(),
});

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
}
```

2. **Criar Service** (`services/fornecedor.service.ts`)

```typescript
export class FornecedorService {
  async create(data: CreateFornecedorInput) {
    // Validar CNPJ
    if (!this.validarCNPJ(data.cnpj)) {
      throw new Error("CNPJ inválido");
    }

    return createFornecedor(data);
  }
}
```

3. **Criar Controller** (`controllers/fornecedor.controller.ts`)

```typescript
export class FornecedorController {
  async create(data: CreateFornecedorInput) {
    try {
      return await fornecedorService.create(data);
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
  }
}
```

4. **Criar Router** (`routes/fornecedores-mvc.routes.ts`)

```typescript
export const fornecedoresRouter = router({
  create: protectedProcedure.input(createFornecedorSchema).mutation(({ input }) => fornecedorController.create(input)),
});
```

5. **Registrar no Router Principal** (`routers.ts`)

```typescript
export const appRouter = router({
  // ...
  fornecedores: fornecedoresRouter,
});
```

---

## 🧪 Testes

```typescript
// tests/services/produto.service.test.ts
describe("ProdutoService", () => {
  it("deve calcular preço de venda com margem", async () => {
    const produto = await produtoService.create({
      codigo: "001",
      precoCusto: 100,
      margemLucro: 30,
    });

    expect(produto.precoVenda).toBe(130);
  });
});
```

---

## 📚 Padrões de Código

### Nomenclatura:

- **Models**: `produto.model.ts`, `ProdutoSchema`, `Produto`
- **Services**: `produto.service.ts`, `ProdutoService`, `produtoService`
- **Controllers**: `produto.controller.ts`, `ProdutoController`, `produtoController`
- **Routes**: `produtos-mvc.routes.ts`, `produtosRouter`

### Exportações:

```typescript
// Service (exporta classe e instância)
export class ProdutoService {}
export const produtoService = new ProdutoService();

// Controller (igual)
export class ProdutoController {}
export const produtoController = new ProdutoController();
```

---

## 🔄 Migração do Código Antigo

Para migrar rotas antigas do `routers.ts`:

1. Extrair validação → **Model**
2. Extrair lógica de negócio → **Service**
3. Extrair tratamento de erro → **Controller**
4. Manter apenas definição de rota → **Route**

---

## 🚀 Próximos Passos

- [ ] Migrar todos os módulos para MVC
- [ ] Adicionar testes unitários para Services
- [ ] Implementar Repository Pattern (opcional)
- [ ] Adicionar validação de permissões nos Controllers
- [ ] Criar DTOs para responses
