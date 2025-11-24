import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: text("password"), // Hash da senha (salt:hash) - opcional para OAuth users
  loginMethod: varchar("loginMethod", { length: 64 })
    .default("local")
    .notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Departamentos para segmentação de produtos e relatórios.
 */
export const departamentos = mysqlTable("departamentos", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Departamento = typeof departamentos.$inferSelect;
export type InsertDepartamento = typeof departamentos.$inferInsert;

/**
 * Produtos (Mestre de Dados).
 * O campo `estoque` é apenas um saldo calculado, a verdade está no Kardex.
 */
export const produtos = mysqlTable("produtos", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  codigoBarras: varchar("codigoBarras", { length: 50 }),
  descricao: text("descricao").notNull(),
  marca: varchar("marca", { length: 100 }),
  departamentoId: int("departamentoId"),
  unidade: varchar("unidade", { length: 10 }).notNull(),
  precoVenda: int("precoVenda").notNull(),
  precoVenda2: int("precoVenda2").default(0),
  precoAtacado: int("precoAtacado").default(0),
  precoCusto: int("precoCusto").notNull(),
  custoMedio: int("custoMedio").default(0),
  custoContabil: int("custoContabil").default(0),
  custoOperacional: int("custoOperacional").default(0),
  custoFiscal: int("custoFiscal").default(0),
  estoque: int("estoque").notNull().default(0),
  estoqueLoja: int("estoqueLoja").default(0),
  estoqueDeposito: int("estoqueDeposito").default(0),
  estoqueTroca: int("estoqueTroca").default(0),
  estoqueMinimo: int("estoqueMinimo").notNull().default(0),
  margemLucro: int("margemLucro").notNull().default(30),
  margemLucro2: int("margemLucro2").default(0),
  margemLucro3: int("margemLucro3").default(0),
  dataUltimaCompra: timestamp("dataUltimaCompra"),
  quantidadeUltimaCompra: int("quantidadeUltimaCompra").default(0),
  dataPrimeiraVenda: timestamp("dataPrimeiraVenda"),
  ativo: boolean("ativo").default(true).notNull(),
  controlaEstoque: boolean("controlaEstoque").default(true).notNull(),
  permiteDesconto: boolean("permiteDesconto").default(true).notNull(),
  localizacao: varchar("localizacao", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

/**
 * Movimentação de Estoque (Kardex).
 * Registra TODAS as alterações de estoque com rastreabilidade total.
 */
export const movimentacoesEstoque = mysqlTable("movimentacoes_estoque", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: int("produtoId")
    .notNull()
    .references(() => produtos.id),
  tipo: mysqlEnum("tipo", [
    "ENTRADA_NFE",
    "VENDA_PDV",
    "BAIXA_PERDA",
    "BAIXA_LANCHE",
    "BAIXA_USO",
    "AJUSTE_AUDITORIA",
    "TRANSFERENCIA_ENTRADA",
    "TRANSFERENCIA_SAIDA",
  ]).notNull(),
  quantidade: int("quantidade").notNull(), // positivo para entrada, negativo para saída
  saldoAnterior: int("saldoAnterior").notNull(),
  saldoAtual: int("saldoAtual").notNull(),
  custoUnitario: int("custoUnitario").default(0), // em centavos
  documentoReferencia: varchar("documentoReferencia", { length: 100 }),
  fornecedor: varchar("fornecedor", { length: 255 }),
  numeroTransacao: varchar("numeroTransacao", { length: 50 }), // Número único para identificar cada transação/importação
  observacao: text("observacao"),
  statusConferencia: mysqlEnum("statusConferencia", [
    "PENDENTE_CONFERENCIA",
    "EM_CONFERENCIA",
    "CONFERIDO",
    "CONFERIDO_COM_DIVERGENCIA",
  ]),
  usuarioId: int("usuarioId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MovimentacaoEstoque = typeof movimentacoesEstoque.$inferSelect;
export type InsertMovimentacaoEstoque =
  typeof movimentacoesEstoque.$inferInsert;

/**
 * Inventário (Auditoria de Estoque).
 */
export const inventarios = mysqlTable("inventarios", {
  id: int("id").autoincrement().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["ABERTO", "FECHADO", "CANCELADO"])
    .default("ABERTO")
    .notNull(),
  dataAbertura: timestamp("dataAbertura").defaultNow().notNull(),
  dataFechamento: timestamp("dataFechamento"),
  usuarioAberturaId: int("usuarioAberturaId").references(() => users.id),
  usuarioFechamentoId: int("usuarioFechamentoId").references(() => users.id),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inventario = typeof inventarios.$inferSelect;
export type InsertInventario = typeof inventarios.$inferInsert;

/**
 * Itens do Inventário (Contagem Cega).
 */
export const inventariosItens = mysqlTable("inventarios_itens", {
  id: int("id").autoincrement().primaryKey(),
  inventarioId: int("inventarioId")
    .notNull()
    .references(() => inventarios.id),
  produtoId: int("produtoId")
    .notNull()
    .references(() => produtos.id),
  estoqueSistema: int("estoqueSistema").notNull(),
  quantidadeContada: int("quantidadeContada"),
  diferenca: int("diferenca").default(0),
  status: mysqlEnum("status", ["PENDENTE", "CONTADO", "APROVADO"])
    .default("PENDENTE")
    .notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InventarioItem = typeof inventariosItens.$inferSelect;
export type InsertInventarioItem = typeof inventariosItens.$inferInsert;

/**
 * Vendas (Consolidação de Vendas do PDV).
 */
export const vendas = mysqlTable("vendas", {
  id: int("id").autoincrement().primaryKey(),
  uuid: varchar("uuid", { length: 36 }).notNull().unique(), // Added UUID
  numeroVenda: varchar("numeroVenda", { length: 50 }).notNull().unique(),
  ccf: varchar("ccf", { length: 6 }), // Added CCF
  coo: varchar("coo", { length: 6 }), // Added COO
  pdvId: varchar("pdvId", { length: 50 }), // Added PDV ID
  dataVenda: timestamp("dataVenda").defaultNow().notNull(),
  valorTotal: int("valorTotal").notNull().default(0), // em centavos
  valorDesconto: int("valorDesconto").notNull().default(0), // em centavos
  valorLiquido: int("valorLiquido").notNull().default(0), // em centavos
  formaPagamento: varchar("formaPagamento", { length: 50 }),
  status: mysqlEnum("status", ["CONCLUIDA", "CANCELADA"])
    .default("CONCLUIDA")
    .notNull(),
  nfceNumero: varchar("nfceNumero", { length: 50 }),
  nfceChave: varchar("nfceChave", { length: 100 }),
  operadorId: int("operadorId").references(() => users.id),
  operadorNome: varchar("operadorNome", { length: 255 }), // Added Operator Name
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Venda = typeof vendas.$inferSelect;
export type InsertVenda = typeof vendas.$inferInsert;

/**
 * Itens de Venda.
 */
export const itensVenda = mysqlTable("itens_venda", {
  id: int("id").autoincrement().primaryKey(),
  vendaId: int("vendaId")
    .notNull()
    .references(() => vendas.id),
  produtoId: int("produtoId")
    .notNull()
    .references(() => produtos.id),
  quantidade: int("quantidade").notNull(),
  precoUnitario: int("precoUnitario").notNull(), // em centavos
  valorTotal: int("valorTotal").notNull(), // em centavos
  valorDesconto: int("valorDesconto").notNull().default(0), // em centavos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ItemVenda = typeof itensVenda.$inferSelect;
export type InsertItemVenda = typeof itensVenda.$inferInsert;

/**
 * Movimentação de Caixa (Sangrias e Reforços).
 */
export const movimentacoesCaixa = mysqlTable("movimentacoes_caixa", {
  id: int("id").autoincrement().primaryKey(),
  tipo: mysqlEnum("tipo", [
    "SANGRIA",
    "REFORCO",
    "ABERTURA",
    "FECHAMENTO",
    "VENDA",
  ]).notNull(),
  valor: int("valor").notNull(), // em centavos
  dataMovimento: timestamp("dataMovimento").defaultNow().notNull(),
  operadorId: int("operadorId").references(() => users.id),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MovimentacaoCaixa = typeof movimentacoesCaixa.$inferSelect;
export type InsertMovimentacaoCaixa = typeof movimentacoesCaixa.$inferInsert;

/**
 * Fornecedores.
 */
export const fornecedores = mysqlTable("fornecedores", {
  id: int("id").autoincrement().primaryKey(),
  razaoSocial: varchar("razaoSocial", { length: 255 }).notNull(),
  nomeFantasia: varchar("nomeFantasia", { length: 255 }),
  cnpj: varchar("cnpj", { length: 18 }).notNull().unique(),
  inscricaoEstadual: varchar("inscricaoEstadual", { length: 20 }),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  endereco: text("endereco"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fornecedor = typeof fornecedores.$inferSelect;
export type InsertFornecedor = typeof fornecedores.$inferInsert;

/**
 * Pedidos de Compra.
 */
export const pedidosCompra = mysqlTable("pedidos_compra", {
  id: int("id").autoincrement().primaryKey(),
  numeroPedido: varchar("numeroPedido", { length: 50 }).notNull().unique(),
  fornecedorId: int("fornecedorId")
    .notNull()
    .references(() => fornecedores.id),
  dataPedido: timestamp("dataPedido").defaultNow().notNull(),
  dataPrevisaoEntrega: timestamp("dataPrevisaoEntrega"),
  valorTotal: int("valorTotal").notNull().default(0), // em centavos
  status: mysqlEnum("status", ["PENDENTE", "APROVADO", "RECEBIDO", "CANCELADO"])
    .default("PENDENTE")
    .notNull(),
  observacao: text("observacao"),
  usuarioId: int("usuarioId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PedidoCompra = typeof pedidosCompra.$inferSelect;
export type InsertPedidoCompra = typeof pedidosCompra.$inferInsert;

/**
 * Itens de Pedido de Compra.
 */
export const itensPedidoCompra = mysqlTable("itens_pedido_compra", {
  id: int("id").autoincrement().primaryKey(),
  pedidoCompraId: int("pedidoCompraId")
    .notNull()
    .references(() => pedidosCompra.id),
  produtoId: int("produtoId")
    .notNull()
    .references(() => produtos.id),
  quantidade: int("quantidade").notNull(),
  precoUnitario: int("precoUnitario").notNull(), // em centavos
  valorTotal: int("valorTotal").notNull(), // em centavos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ItemPedidoCompra = typeof itensPedidoCompra.$inferSelect;
export type InsertItemPedidoCompra = typeof itensPedidoCompra.$inferInsert;

/**
 * Contas a Pagar.
 */
export const contasPagar = mysqlTable("contas_pagar", {
  id: int("id").autoincrement().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  fornecedorId: int("fornecedorId").references(() => fornecedores.id),
  valor: int("valor").notNull(), // em centavos
  dataVencimento: timestamp("dataVencimento").notNull(),
  dataPagamento: timestamp("dataPagamento"),
  status: mysqlEnum("status", ["PENDENTE", "PAGO", "ATRASADO", "CANCELADO"])
    .default("PENDENTE")
    .notNull(),
  formaPagamento: varchar("formaPagamento", { length: 50 }),
  observacao: text("observacao"),
  usuarioId: int("usuarioId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContaPagar = typeof contasPagar.$inferSelect;
export type InsertContaPagar = typeof contasPagar.$inferInsert;

/**
 * Contas a Receber.
 */
export const contasReceber = mysqlTable("contas_receber", {
  id: int("id").autoincrement().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  valor: int("valor").notNull(), // em centavos
  dataVencimento: timestamp("dataVencimento").notNull(),
  dataRecebimento: timestamp("dataRecebimento"),
  status: mysqlEnum("status", ["PENDENTE", "RECEBIDO", "ATRASADO", "CANCELADO"])
    .default("PENDENTE")
    .notNull(),
  formaPagamento: varchar("formaPagamento", { length: 50 }),
  observacao: text("observacao"),
  usuarioId: int("usuarioId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContaReceber = typeof contasReceber.$inferSelect;
export type InsertContaReceber = typeof contasReceber.$inferInsert;

/**
 * Clientes.
 */
export const clientes = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }).unique(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  endereco: text("endereco"), // JSON string: { rua, numero, bairro, cidade, cep }
  fotoCaminho: varchar("fotoCaminho", { length: 255 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

/**
 * Conferências de Mercadoria (Verificação de Entrada de NFe).
 */
export const conferenciasMercadoria = mysqlTable("conferencias_mercadoria", {
  id: int("id").autoincrement().primaryKey(),
  movimentacaoEstoqueId: int("movimentacaoEstoqueId")
    .notNull()
    .references(() => movimentacoesEstoque.id),
  produtoId: int("produtoId")
    .notNull()
    .references(() => produtos.id),
  quantidadeEsperada: int("quantidadeEsperada").notNull(),
  quantidadeConferida: int("quantidadeConferida"),
  divergencia: int("divergencia").default(0), // conferida - esperada
  tipoDivergencia: mysqlEnum("tipoDivergencia", ["FALTA", "SOBRA", "OK"]),
  dataValidade: timestamp("dataValidade"),
  dataChegada: timestamp("dataChegada"),
  dataConferencia: timestamp("dataConferencia").defaultNow().notNull(),
  codigoBarrasLido: varchar("codigoBarrasLido", { length: 50 }),
  status: mysqlEnum("status", ["PENDENTE", "CONFERIDO", "DIVERGENCIA"])
    .default("PENDENTE")
    .notNull(),
  observacao: text("observacao"),
  usuarioId: int("usuarioId")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConferenciaMercadoria = typeof conferenciasMercadoria.$inferSelect;
export type InsertConferenciaMercadoria = typeof conferenciasMercadoria.$inferInsert;
