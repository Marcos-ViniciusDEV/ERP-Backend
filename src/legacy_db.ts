/**
 * @module Database
 * @description Camada de acesso a dados para o sistema ERP usando Drizzle ORM + MySQL
 *
 * Este módulo contém todas as operações CRUD organizadas por domínio:
 * - **Autenticação**: Gestão de usuários (login local e OAuth)
 * - **Produtos**: CRUD de produtos com controle de preços e estoque
 * - **Kardex**: Movimentações de estoque com rastreamento de saldo
 * - **Departamentos**: Categorização de produtos
 * - **Inventário**: Contagem física de estoque
 * - **Vendas**: Registro de vendas e itens vendidos
 * - **Fornecedores**: Gestão de fornecedores
 * - **Compras**: Pedidos de compra
 * - **Financeiro**: Contas a pagar, contas a receber e movimentações de caixa
 *
 * Todas as funções retornam undefined ou array vazio quando o banco está indisponível,
 * permitindo que ferramentas locais executem sem banco de dados configurado.
 */

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./libs/env";
import { getDb } from "./libs/db";

/**
 * Cria ou atualiza um usuário baseado no openId (upsert)
 *
 * Usado principalmente para autenticação OAuth onde o usuário pode já existir.
 * Se ENV.ownerOpenId corresponder ao openId, o usuário recebe role "admin".
 *
 * @param user - Dados do usuário a inserir/atualizar
 * @param user.openId - ID único do provedor OAuth (obrigatório)
 * @param user.name - Nome do usuário
 * @param user.email - Email do usuário
 * @param user.loginMethod - Método de login (google, github, etc)
 * @param user.lastSignedIn - Data do último login
 * @param user.role - Papel do usuário (user, admin)
 * @throws Error se openId não for fornecido
 * @returns Promise<void>
 *
 * @example
 * await upsertUser({
 *   openId: "google_123456",
 *   name: "João Silva",
 *   email: "joao@empresa.com",
 *   loginMethod: "google"
 * });
 */
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Email is required for user identification
    if (!user.email) {
      throw new Error("User email is required for upsert");
    }

    const values: InsertUser = {
      openId: user.openId,
      email: user.email,
    };
    const updateSet: Partial<InsertUser> = {};

    // Handle optional text fields
    if (user.name !== undefined) {
      values.name = user.name;
      updateSet.name = user.name;
    }
    if (user.email !== undefined) {
      updateSet.email = user.email;
    }
    if (user.loginMethod !== undefined) {
      values.loginMethod = user.loginMethod;
      updateSet.loginMethod = user.loginMethod;
    }
    if (user.password !== undefined && user.password) {
      updateSet.password = user.password;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

/**
 * Busca um usuário pelo openId (OAuth)
 *
 * @param openId - ID único do provedor OAuth
 * @returns Objeto do usuário ou undefined se não encontrado/DB indisponível
 */
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== PRODUTOS ==========

/**
 * Lista todos os produtos cadastrados
 * @returns Array de produtos ou array vazio se DB indisponível
 */
export async function getAllProdutos() {
  const db = await getDb();
  if (!db) return [];
  const { produtos } = await import("../drizzle/schema");
  return db.select().from(produtos);
}

/**
 * Busca um produto pelo ID
 * @param id - ID do produto
 * @returns Objeto do produto ou undefined se não encontrado
 */
export async function getProdutoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { produtos } = await import("../drizzle/schema");
  const result = await db.select().from(produtos).where(eq(produtos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Cria um novo produto
 * @param produto - Dados do produto (nome, código, preços, estoque, etc)
 * @returns Resultado da inserção com insertId
 * @throws Error se DB indisponível
 */
export async function createProduto(produto: typeof import("../drizzle/schema").produtos.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { produtos } = await import("../drizzle/schema");
  const result = await db.insert(produtos).values(produto);
  return result;
}

/**
 * Atualiza um produto existente
 * @param data - Objeto contendo id e campos a atualizar
 * @param data.id - ID do produto a atualizar
 * @returns {success: true} se atualizado com sucesso
 * @throws Error se DB indisponível
 */
export async function updateProduto(data: { id: number } & Partial<typeof import("../drizzle/schema").produtos.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { produtos } = await import("../drizzle/schema");
  const { id, ...produto } = data;
  await db.update(produtos).set(produto).where(eq(produtos.id, id));
  return { success: true };
}

/**
 * Deleta um produto
 *
 * Verifica se o produto tem movimentações no Kardex antes de deletar.
 * Produtos com histórico de movimentações não podem ser excluídos para
 * manter a integridade do rastreamento de estoque.
 *
 * @param id - ID do produto a deletar
 * @returns {success: true} se deletado com sucesso
 * @throws Error se produto tiver movimentações ou DB indisponível
 */
export async function deleteProduto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se o produto tem movimentações no Kardex
  const { movimentacoesEstoque } = await import("../drizzle/schema");
  const movimentacoes = await db.select().from(movimentacoesEstoque).where(eq(movimentacoesEstoque.produtoId, id)).limit(1);

  if (movimentacoes.length > 0) {
    throw new Error(
      "Não é possível excluir este produto pois ele possui movimentações de estoque registradas. Para manter a integridade do histórico, produtos com movimentações não podem ser excluídos."
    );
  }

  const { produtos } = await import("../drizzle/schema");
  await db.delete(produtos).where(eq(produtos.id, id));
  return { success: true };
}

/**
 * Atualiza preços de um produto com base no custo e margem de lucro
 *
 * Calcula automaticamente o preço de venda usando a margem de lucro configurada.
 * Fórmula: precoVenda = precoCusto * (1 + margemLucro/100)
 *
 * @param produtoId - ID do produto
 * @param precoCusto - Novo preço de custo
 * @returns Objeto com precoCusto, precoVenda calculado e margemLucro aplicada
 * @throws Error se produto não encontrado ou DB indisponível
 *
 * @example
 * // Produto com margem de 30%:
 * await updateProdutoPrecos(1, 100);
 * // Retorna: { precoCusto: 100, precoVenda: 130, margemLucro: 30 }
 */
export async function updateProdutoPrecos(produtoId: number, precoCusto: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { produtos } = await import("../drizzle/schema");

  // Buscar o produto para pegar a margem de lucro
  const produto = await getProdutoById(produtoId);
  if (!produto) throw new Error("Produto não encontrado");

  // Calcular novo preço de venda baseado na margem de lucro
  const margemLucro = produto.margemLucro || 30;
  const precoVenda = Math.round(precoCusto * (1 + margemLucro / 100));

  // Atualizar preço de custo e preço de venda
  await db.update(produtos).set({ precoCusto, precoVenda }).where(eq(produtos.id, produtoId));

  return { precoCusto, precoVenda, margemLucro };
}

// ========== KARDEX (MOVIMENTAÇÃO DE ESTOQUE) ==========

/**
 * Registra uma movimentação de estoque (entrada ou saída) no Kardex
 *
 * O Kardex é um livro contábil que rastreia todas as movimentações de estoque.
 * Após inserir a movimentação, atualiza automaticamente o campo `estoque` do produto
 * com o valor de `saldoAtual`.
 *
 * @param movimentacao - Dados da movimentação
 * @param movimentacao.produtoId - ID do produto
 * @param movimentacao.tipo - Tipo de movimentação (entrada, saida, ajuste, etc)
 * @param movimentacao.quantidade - Quantidade movimentada
 * @param movimentacao.saldoAtual - Saldo após a movimentação
 * @param movimentacao.precoUnitario - Preço unitário da movimentação
 * @returns Resultado da inserção
 * @throws Error se DB indisponível
 */
export async function createMovimentacaoEstoque(movimentacao: typeof import("../drizzle/schema").movimentacoesEstoque.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { movimentacoesEstoque, produtos } = await import("../drizzle/schema");

  // Inserir movimentação no Kardex
  const result = await db.insert(movimentacoesEstoque).values(movimentacao);

  // Atualizar estoque do produto com o saldoAtual
  if (movimentacao.saldoAtual !== undefined && movimentacao.produtoId) {
    await db.update(produtos).set({ estoque: movimentacao.saldoAtual }).where(eq(produtos.id, movimentacao.produtoId));
  }

  return result;
}

/**
 * Lista todas as movimentações de estoque de um produto específico
 *
 * Usado para exibir o histórico completo do Kardex (livro de controle de estoque)
 * com todas as entradas, saídas e ajustes do produto.
 *
 * @param produtoId - ID do produto
 * @returns Array de movimentações ordenado por data
 */
export async function getMovimentacoesByProdutoId(produtoId: number) {
  const db = await getDb();
  if (!db) return [];
  const { movimentacoesEstoque } = await import("../drizzle/schema");
  return db.select().from(movimentacoesEstoque).where(eq(movimentacoesEstoque.produtoId, produtoId));
}

// ========== DEPARTAMENTOS ==========

/**
 * Lista todos os departamentos cadastrados
 *
 * Departamentos são usados para categorizar produtos (ex: Alimentos, Bebidas, Limpeza)
 *
 * @returns Array de departamentos ou array vazio se DB indisponível
 */
export async function getAllDepartamentos() {
  const db = await getDb();
  if (!db) return [];
  const { departamentos } = await import("../drizzle/schema");
  return db.select().from(departamentos);
}

/**
 * Cria um novo departamento
 * @param departamento - Dados do departamento (nome, descrição)
 * @returns Resultado da inserção
 * @throws Error se DB indisponível
 */
export async function createDepartamento(departamento: typeof import("../drizzle/schema").departamentos.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { departamentos } = await import("../drizzle/schema");
  const result = await db.insert(departamentos).values(departamento);
  return result;
}

// ========== CLIENTES ==========

/**
 * Lista todos os clientes (com filtro opcional)
 */
export async function getAllClientes(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const { clientes } = await import("../drizzle/schema");
  const { like, or, desc } = await import("drizzle-orm");

  if (search) {
    return db
      .select()
      .from(clientes)
      .where(or(like(clientes.nome, `%${search}%`), like(clientes.cpfCnpj, `%${search}%`)))
      .orderBy(desc(clientes.id));
  }

  return db.select().from(clientes).orderBy(desc(clientes.id));
}

/**
 * Busca um cliente pelo ID
 */
export async function getClienteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { clientes } = await import("../drizzle/schema");
  const result = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Cria um novo cliente
 */
export async function createCliente(cliente: typeof import("../drizzle/schema").clientes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { clientes } = await import("../drizzle/schema");
  const result = await db.insert(clientes).values(cliente);
  return result;
}

/**
 * Atualiza um cliente existente
 */
export async function updateCliente(data: { id: number } & Partial<typeof import("../drizzle/schema").clientes.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { clientes } = await import("../drizzle/schema");
  const { id, ...cliente } = data;
  await db.update(clientes).set(cliente).where(eq(clientes.id, id));
  return { success: true };
}

/**
 * Deleta um cliente
 */
export async function deleteCliente(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { clientes } = await import("../drizzle/schema");
  await db.delete(clientes).where(eq(clientes.id, id));
  return { success: true };
}

// ========== INVENTÁRIO ==========

/**
 * Cria um novo inventário (contagem física de estoque)
 *
 * Inventário é uma contagem periódica do estoque real para validar
 * se o estoque sistêmico coincide com o estoque físico.
 *
 * @param inventario - Dados do inventário (data, status, observações)
 * @returns Resultado da inserção com insertId
 * @throws Error se DB indisponível
 */
export async function createInventario(inventario: typeof import("../drizzle/schema").inventarios.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { inventarios } = await import("../drizzle/schema");
  await db.insert(inventarios).values(inventario);
  return { success: true };
}

/**
 * Busca um inventário pelo ID
 * @param id - ID do inventário
 * @returns Objeto do inventário ou undefined se não encontrado
 */
export async function getInventarioById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { inventarios } = await import("../drizzle/schema");
  const result = await db.select().from(inventarios).where(eq(inventarios.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Adiciona um item (produto contado) a um inventário
 * @param item - Dados do item (inventarioId, produtoId, quantidadeContada, quantidadeSistema)
 * @returns Resultado da inserção
 * @throws Error se DB indisponível
 */
export async function createInventarioItem(item: typeof import("../drizzle/schema").inventariosItens.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { inventariosItens } = await import("../drizzle/schema");
  const result = await db.insert(inventariosItens).values(item);
  return result;
}

/**
 * Lista todos os itens de um inventário específico
 * @param inventarioId - ID do inventário
 * @returns Array de itens com quantidades contadas vs sistema
 */
export async function getInventarioItensByInventarioId(inventarioId: number) {
  const db = await getDb();
  if (!db) return [];
  const { inventariosItens } = await import("../drizzle/schema");
  return db.select().from(inventariosItens).where(eq(inventariosItens.inventarioId, inventarioId));
}

// ========== VENDAS ==========

/**
 * Registra uma nova venda
 * @param venda - Dados da venda (data, clienteId, total, metodoPagamento, status)
 * @returns Resultado da inserção com insertId
 * @throws Error se DB indisponível
 */
export async function createVenda(venda: typeof import("../drizzle/schema").vendas.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { vendas } = await import("../drizzle/schema");
  const result = await db.insert(vendas).values(venda);
  return result;
}

/**
 * Adiciona um item (produto vendido) a uma venda
 * @param item - Dados do item (vendaId, produtoId, quantidade, precoUnitario, desconto)
 * @returns Resultado da inserção
 * @throws Error se DB indisponível
 */
export async function createItemVenda(item: typeof import("../drizzle/schema").itensVenda.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { itensVenda } = await import("../drizzle/schema");
  const result = await db.insert(itensVenda).values(item);
  return result;
}

/**
 * Lista todas as vendas registradas
 * @returns Array de vendas ou array vazio se DB indisponível
 */
export async function getAllVendas() {
  const db = await getDb();
  if (!db) return [];
  const { vendas } = await import("../drizzle/schema");
  return db.select().from(vendas);
}

// ========== MOVIMENTAÇÃO DE CAIXA ==========

/**
 * Registra uma movimentação de caixa (entrada ou saída de dinheiro)
 * @param movimentacao - Dados da movimentação (tipo, valor, descricao, data, metodoPagamento)
 * @returns Resultado da inserção
 * @throws Error se DB indisponível
 */
export async function createMovimentacaoCaixa(movimentacao: typeof import("../drizzle/schema").movimentacoesCaixa.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { movimentacoesCaixa } = await import("../drizzle/schema");
  const result = await db.insert(movimentacoesCaixa).values(movimentacao);
  return result;
}

/**
 * Lista todas as movimentações de caixa
 * @returns Array de movimentações ou array vazio se DB indisponível
 */
export async function getAllMovimentacoesCaixa() {
  const db = await getDb();
  if (!db) return [];
  const { movimentacoesCaixa } = await import("../drizzle/schema");
  return db.select().from(movimentacoesCaixa);
}

// ========== FORNECEDORES ==========

/**
 * Lista todos os fornecedores cadastrados
 * @returns Array de fornecedores ou array vazio se DB indisponível
 */
export async function getAllFornecedores() {
  const db = await getDb();
  if (!db) return [];
  const { fornecedores } = await import("../drizzle/schema");
  return db.select().from(fornecedores);
}

/**
 * Cria um novo fornecedor
 * @param fornecedor - Dados do fornecedor (nome, cnpj, email, telefone, endereco)
 * @returns Resultado da inserção
 * @throws Error se DB indisponível
 */
export async function createFornecedor(fornecedor: typeof import("../drizzle/schema").fornecedores.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { fornecedores } = await import("../drizzle/schema");
  const result = await db.insert(fornecedores).values(fornecedor);
  return result;
}

/**
 * Atualiza um fornecedor existente
 * @param data - Objeto contendo id e campos a atualizar
 * @param data.id - ID do fornecedor a atualizar
 * @returns {success: true} se atualizado com sucesso
 * @throws Error se DB indisponível
 */
export async function updateFornecedor(data: { id: number } & Partial<typeof import("../drizzle/schema").fornecedores.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { fornecedores } = await import("../drizzle/schema");
  const { id, ...fornecedor } = data;
  await db.update(fornecedores).set(fornecedor).where(eq(fornecedores.id, id));
  return { success: true };
}

/**
 * Deleta um fornecedor
 * @param id - ID do fornecedor a deletar
 * @returns {success: true} se deletado com sucesso
 * @throws Error se DB indisponível
 */
export async function deleteFornecedor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { fornecedores } = await import("../drizzle/schema");
  await db.delete(fornecedores).where(eq(fornecedores.id, id));
  return { success: true };
}

// ========== PEDIDOS DE COMPRA ==========

/**
 * Cria um novo pedido de compra
 * @param pedido - Dados do pedido (fornecedorId, data, total, status, observacoes)
 * @returns Resultado da inserção com insertId
 * @throws Error se DB indisponível
 */
export async function createPedidoCompra(pedido: typeof import("../drizzle/schema").pedidosCompra.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { pedidosCompra } = await import("../drizzle/schema");
  const result = await db.insert(pedidosCompra).values(pedido);
  return result;
}

/**
 * Lista todos os pedidos de compra
 * @returns Array de pedidos ou array vazio se DB indisponível
 */
export async function getAllPedidosCompra() {
  const db = await getDb();
  if (!db) return [];
  const { pedidosCompra } = await import("../drizzle/schema");
  return db.select().from(pedidosCompra);
}

// ========== CONTAS A PAGAR ==========

/**
 * Cria uma nova conta a pagar (despesa/obrigação financeira)
 * @param conta - Dados da conta (descricao, valor, dataVencimento, status, fornecedorId)
 * @returns Resultado da inserção
 * @throws Error se DB indisponível
 */
export async function createContaPagar(conta: typeof import("../drizzle/schema").contasPagar.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { contasPagar } = await import("../drizzle/schema");
  const result = await db.insert(contasPagar).values(conta);
  return result;
}

/**
 * Lista todas as contas a pagar
 * @returns Array de contas ou array vazio se DB indisponível
 */
export async function getAllContasPagar() {
  const db = await getDb();
  if (!db) return [];
  const { contasPagar } = await import("../drizzle/schema");
  return db.select().from(contasPagar);
}

// ========== CONTAS A RECEBER ==========

/**
 * Cria uma nova conta a receber (crédito/direito financeiro)
 * @param conta - Dados da conta (descricao, valor, dataVencimento, status, clienteId)
 * @returns Resultado da inserção
 * @throws Error se DB indisponível
 */
export async function createContaReceber(conta: typeof import("../drizzle/schema").contasReceber.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { contasReceber } = await import("../drizzle/schema");
  const result = await db.insert(contasReceber).values(conta);
  return result;
}

/**
 * Lista todas as contas a receber
 * @returns Array de contas ou array vazio se DB indisponível
 */
export async function getAllContasReceber() {
  const db = await getDb();
  if (!db) return [];
  const { contasReceber } = await import("../drizzle/schema");
  return db.select().from(contasReceber);
}

// ========== AUTH ==========

/**
 * Busca um usuário pelo email (usado no login local)
 * @param email - Email do usuário
 * @returns Objeto do usuário ou undefined se não encontrado
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Cria um novo usuário com autenticação local (email/senha)
 *
 * Gera um openId único usando nanoid e armazena o hash da senha.
 * Novos usuários recebem role "user" por padrão.
 *
 * @param email - Email do usuário (único)
 * @param name - Nome completo do usuário
 * @param passwordHash - Hash bcrypt da senha (nunca senha em texto plano)
 * @returns Objeto completo do usuário criado
 * @throws Error se falhar ao criar ou DB indisponível
 *
 * @example
 * const hash = await bcrypt.hash("senha123", 10);
 * const user = await createUser("joao@email.com", "João Silva", hash);
 */
export async function createUser(email: string, name: string, passwordHash: string): Promise<typeof users.$inferSelect> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate a unique openId
  const { nanoid } = await import("nanoid");
  const openId = `user_${nanoid()}`;

  const result = await db.insert(users).values({
    openId,
    email,
    name,
    password: passwordHash,
    loginMethod: "local",
    role: "user",
    lastSignedIn: new Date(),
  });

  const user = await getUserByEmail(email);
  if (!user) throw new Error("Failed to create user");

  return user;
}
