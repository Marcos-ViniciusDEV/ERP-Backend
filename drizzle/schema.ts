import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  mysqlEnum,
  text,
  boolean,
  foreignKey
} from "drizzle-orm/mysql-core";

/**
 * Empresas (Tenants) — cada registro representa um cliente do SaaS.
 */
export const empresas = mysqlTable("empresas", {
  id: int("id").autoincrement().primaryKey(),
  razaoSocial: varchar("razaoSocial", { length: 255 }).notNull(),
  nomeFantasia: varchar("nomeFantasia", { length: 255 }),
  cnpj: varchar("cnpj", { length: 18 }).notNull().unique(),
  codigoAcesso: varchar("codigoAcesso", { length: 20 }).notNull().unique(), // ex: "LOJA-X123"
  senhaAtivacao: text("senhaAtivacao").notNull(), // Hash da senha para ativar PDVs
  plano: mysqlEnum("plano", ["BASICO", "PRO", "ENTERPRISE", "TRIAL", "STARTER", "PROFESSIONAL"]).default("TRIAL").notNull(),
  tipoVarejo: varchar("tipoVarejo", { length: 100 }),
  faturamentoMensal: varchar("faturamentoMensal", { length: 50 }),
  vendedores: int("vendedores").default(0),
  ativo: boolean("ativo").default(true).notNull(),
  bloqueado: boolean("bloqueado").default(false).notNull(),
  motivoBloqueio: text("motivoBloqueio"),
  dataBloqueio: timestamp("dataBloqueio"),
  dataDesbloqueio: timestamp("dataDesbloqueio"),
  limiteUsuarios: int("limiteUsuarios").default(5),
  limitePdvs: int("limitePdvs").default(2),
  limiteProdutos: int("limiteProdutos").default(1000),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Empresa = typeof empresas.$inferSelect;
export type InsertEmpresa = typeof empresas.$inferInsert;

/**
 * PDVs Ativos — terminais registrados por empresa.
 */
export const pdvsAtivos = mysqlTable("pdvs_ativos", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  pdvId: varchar("pdvId", { length: 50 }).notNull(),   // ex: "PDV-01"
  apelido: varchar("apelido", { length: 100 }),          // ex: "Caixa Central"
  ultimoAcesso: timestamp("ultimoAcesso"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PdvAtivo = typeof pdvsAtivos.$inferSelect;
export type InsertPdvAtivo = typeof pdvsAtivos.$inferInsert;

/**
 * Planos do SaaS.
 */
export const planosSaas = mysqlTable("planos_saas", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  codigo: varchar("codigo", { length: 30 }).notNull().unique(),
  descricao: text("descricao"),
  precoMensal: int("precoMensal").notNull().default(0),
  precoAnual: int("precoAnual").default(0),
  limiteUsuarios: int("limiteUsuarios").notNull().default(1),
  limitePdvs: int("limitePdvs").notNull().default(1),
  limiteProdutos: int("limiteProdutos").notNull().default(500),
  modulosPermitidos: text("modulosPermitidos"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlanoSaas = typeof planosSaas.$inferSelect;
export type InsertPlanoSaas = typeof planosSaas.$inferInsert;

/**
 * Assinaturas das empresas.
 */
export const assinaturas = mysqlTable("assinaturas", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  planoId: int("planoId").notNull().references(() => planosSaas.id),
  status: mysqlEnum("status", [
    "ATIVA",
    "INADIMPLENTE",
    "CANCELADA",
    "SUSPENSA",
    "TRIAL",
  ]).default("TRIAL").notNull(),
  dataInicio: timestamp("dataInicio").defaultNow().notNull(),
  dataFim: timestamp("dataFim"),
  dataProximoVencimento: timestamp("dataProximoVencimento"),
  valorMensal: int("valorMensal").default(0),
  diasTrial: int("diasTrial").default(7),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Assinatura = typeof assinaturas.$inferSelect;
export type InsertAssinatura = typeof assinaturas.$inferInsert;

/**
 * Licenças emitidas por empresa.
 */
export const licencas = mysqlTable("licencas", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  tipo: mysqlEnum("tipo", ["ERP_WEB", "PDV_DESKTOP", "PDV_MOBILE", "API"]).notNull(),
  chave: varchar("chave", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["ATIVA", "REVOGADA", "EXPIRADA"]).default("ATIVA").notNull(),
  dispositivoNome: varchar("dispositivoNome", { length: 100 }),
  dispositivoId: varchar("dispositivoId", { length: 100 }),
  dataAtivacao: timestamp("dataAtivacao").defaultNow(),
  dataExpiracao: timestamp("dataExpiracao"),
  ultimoUso: timestamp("ultimoUso"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Licenca = typeof licencas.$inferSelect;
export type InsertLicenca = typeof licencas.$inferInsert;

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").references(() => empresas.id), // null = super admin do SaaS
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: text("password"), // Hash da senha (salt:hash) - opcional para OAuth users
  fotoCaminho: varchar("fotoCaminho", { length: 255 }), // Avatar do usuário
  supervisorPassword: text("supervisorPassword"), // Senha do supervisor para liberações
  loginMethod: varchar("loginMethod", { length: 64 })
    .default("local")
    .notNull(),
  role: mysqlEnum("role", ["user", "admin", "pdv_operator", "trakto_admin"])
    .default("user")
    .notNull(),
  permissions: text("permissions"), // Armazena o JSON string das permissões customizadas
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
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  codigo: varchar("codigo", { length: 20 }).notNull(),
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
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  codigo: varchar("codigo", { length: 50 }).notNull(),
  codigoBarras: varchar("codigoBarras", { length: 50 }),
  descricao: text("descricao").notNull(),
  marca: varchar("marca", { length: 100 }),
  departamentoId: int("departamentoId"),
  unidade: varchar("unidade", { length: 10 }).notNull(),
  precoVenda: int("precoVenda").notNull(),
  precoPdv: int("precoPdv").default(0),
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
  empresaId: int("empresaId").notNull().references(() => empresas.id),
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
    "DEVOLUCAO",
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
  empresaId: int("empresaId").notNull().references(() => empresas.id),
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
  empresaId: int("empresaId").notNull().references(() => empresas.id),
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
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  tipo: mysqlEnum("tipo", [
    "SANGRIA",
    "REFORCO",
    "ABERTURA",
    "FECHAMENTO",
    "VENDA",
  ]).notNull(),
  pdvId: varchar("pdvId", { length: 50 }), // Added PDV ID
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
  empresaId: int("empresaId").notNull().references(() => empresas.id),
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
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  numeroPedido: varchar("numeroPedido", { length: 50 }).notNull(),
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
  empresaId: int("empresaId").notNull().references(() => empresas.id),
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
  empresaId: int("empresaId").notNull().references(() => empresas.id),
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
  empresaId: int("empresaId").notNull().references(() => empresas.id),
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
  movimentacaoEstoqueId: int("movimentacaoEstoqueId").notNull(),
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
}, (table) => ({
  movFK: foreignKey({
    columns: [table.movimentacaoEstoqueId],
    foreignColumns: [movimentacoesEstoque.id],
    name: "fk_conf_mov_est",
  })
}));

export type ConferenciaMercadoria = typeof conferenciasMercadoria.$inferSelect;
export type InsertConferenciaMercadoria = typeof conferenciasMercadoria.$inferInsert;

/**
 * Ofertas Agendadas — Motor de Promoções Avançado
 */
export const offers = mysqlTable("offers", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  produtoId: int("produtoId")
    .notNull()
    .references(() => produtos.id),
  nome: varchar("nome", { length: 255 }), // Título da promoção
  tipoDesconto: mysqlEnum("tipoDesconto", [
    "PRECO_FIXO",
    "PERCENTUAL",
    "LEVE_X_PAGUE_Y",
    "DESCONTO_SEGUNDO",
  ]).default("PRECO_FIXO").notNull(),
  precoOferta: int("precoOferta").default(0), // em centavos — para PRECO_FIXO
  percentualDesconto: int("percentualDesconto").default(0), // em % — para PERCENTUAL e DESCONTO_SEGUNDO
  qtdLeve: int("qtdLeve").default(3), // para LEVE_X_PAGUE_Y
  qtdPague: int("qtdPague").default(2), // para LEVE_X_PAGUE_Y
  dataInicio: timestamp("dataInicio").notNull(),
  dataFim: timestamp("dataFim").notNull(),
  horaInicio: varchar("horaInicio", { length: 5 }), // ex: "06:00" — opcional para promoções relâmpago
  horaFim: varchar("horaFim", { length: 5 }),       // ex: "12:00"
  aplicacaoAutomatica: boolean("aplicacaoAutomatica").default(true).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

/**
 * Materiais (Insumos)
 */
export const materiais = mysqlTable("materiais", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  unidade: varchar("unidade", { length: 10 }).notNull(),
  estoque: int("estoque").notNull().default(0), // em quantidade (ex: gramas, ml, unidades)
  custoUnitario: int("custoUnitario").notNull().default(0), // em centavos
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Material = typeof materiais.$inferSelect;
export type InsertMaterial = typeof materiais.$inferInsert;

/**
 * Receitas (Ficha Técnica)
 */
export const receitas = mysqlTable("receitas", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: int("produtoId")
    .notNull()
    .references(() => produtos.id),
  materialId: int("materialId")
    .notNull()
    .references(() => materiais.id),
  quantidade: int("quantidade").notNull(), // Quantidade do material usada para 1 unidade do produto
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Receita = typeof receitas.$inferSelect;
export type InsertReceita = typeof receitas.$inferInsert;

/**
 * Produção
 */
export const producao = mysqlTable("producao", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  produtoId: int("produtoId")
    .notNull()
    .references(() => produtos.id),
  quantidade: int("quantidade").notNull(), // Quantidade produzida
  dataProducao: timestamp("dataProducao").defaultNow().notNull(),
  usuarioId: int("usuarioId").references(() => users.id),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Producao = typeof producao.$inferSelect;
export type InsertProducao = typeof producao.$inferInsert;

/**
 * Devoluções / Trocas
 */
export const returns = mysqlTable("returns", {
  id: int("id").autoincrement().primaryKey(),
  originalSaleId: int("originalSaleId")
    .references(() => vendas.id),
  reason: text("reason").notNull(),
  totalRefunded: int("totalRefunded").notNull(), // em centavos
  operatorId: int("operatorId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Return = typeof returns.$inferSelect;
export type InsertReturn = typeof returns.$inferInsert;

/**
 * Itens da Devolução
 */
export const returnItems = mysqlTable("return_items", {
  id: int("id").autoincrement().primaryKey(),
  returnId: int("returnId")
    .notNull()
    .references(() => returns.id, { onDelete: "cascade" }),
  produtoId: int("produtoId")
    .notNull()
    .references(() => produtos.id),
  quantidade: int("quantidade").notNull(),
  condition: mysqlEnum("condition", ["GOOD", "DAMAGED"]).default("GOOD"),
});

export type ReturnItem = typeof returnItems.$inferSelect;
export type InsertReturnItem = typeof returnItems.$inferInsert;

/**
 * Metas de Vendas
 */
export const salesGoals = mysqlTable("sales_goals", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  targetAmount: int("targetAmount").notNull(), // em centavos
  sellerId: int("sellerId").references(() => users.id), // Opcional, se for meta individual
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SalesGoal = typeof salesGoals.$inferSelect;
export type InsertSalesGoal = typeof salesGoals.$inferInsert;

/**
 * Metas de Despesas
 */
export const expenseGoals = mysqlTable("expense_goals", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  month: int("month").notNull(),
  year: int("year").notNull(),
  targetAmount: int("targetAmount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExpenseGoal = typeof expenseGoals.$inferSelect;
export type InsertExpenseGoal = typeof expenseGoals.$inferInsert;

/**
 * Funcionários (Gestão de Recursos Humanos)
 */
export const funcionarios = mysqlTable("funcionarios", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 100 }).notNull(),
  salario: int("salario").notNull().default(0), // em centavos
  dataAdmissao: timestamp("dataAdmissao").defaultNow().notNull(),
  dataDesligamento: timestamp("dataDesligamento"),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Funcionario = typeof funcionarios.$inferSelect;
export type InsertFuncionario = typeof funcionarios.$inferInsert;

/**
 * Configuracao de WhatsApp por empresa.
 */
export const whatsappConfigs = mysqlTable("whatsapp_configs", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  defaultMessage: text("defaultMessage"),
  businessHoursStart: varchar("businessHoursStart", { length: 5 }),
  businessHoursEnd: varchar("businessHoursEnd", { length: 5 }),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsappConfig = typeof whatsappConfigs.$inferSelect;
export type InsertWhatsappConfig = typeof whatsappConfigs.$inferInsert;

/**
 * Chamados da Central de Suporte.
 */
export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  usuarioId: int("usuarioId").references(() => users.id),
  tipo: mysqlEnum("tipo", ["SUPORTE", "BUG", "MELHORIA"]).default("SUPORTE").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao").notNull(),
  categoria: varchar("categoria", { length: 100 }),
  prioridade: mysqlEnum("prioridade", ["BAIXA", "MEDIA", "ALTA", "CRITICA"]).default("MEDIA").notNull(),
  status: mysqlEnum("status", ["ABERTO", "EM_ANALISE", "EM_ANDAMENTO", "RESOLVIDO", "FECHADO"]).default("ABERTO").notNull(),
  modulo: varchar("modulo", { length: 100 }),
  passosReproducao: text("passosReproducao"),
  resposta: text("resposta"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

/**
 * Base de conhecimento da Central de Suporte.
 */
export const supportArticles = mysqlTable("support_articles", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").references(() => empresas.id),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  resumo: text("resumo"),
  conteudo: text("conteudo").notNull(),
  categoria: varchar("categoria", { length: 100 }),
  tags: text("tags"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportArticle = typeof supportArticles.$inferSelect;
export type InsertSupportArticle = typeof supportArticles.$inferInsert;

/**
 * Tutoriais rapidos da Central de Suporte.
 */
export const supportTutorials = mysqlTable("support_tutorials", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").references(() => empresas.id),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  conteudo: text("conteudo").notNull(),
  youtubeUrl: varchar("youtubeUrl", { length: 500 }),
  youtubeVideoId: varchar("youtubeVideoId", { length: 32 }),
  modulo: varchar("modulo", { length: 100 }),
  tempoEstimado: varchar("tempoEstimado", { length: 50 }),
  fixado: boolean("fixado").default(false).notNull(),
  ordem: int("ordem").default(0),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportTutorial = typeof supportTutorials.$inferSelect;
export type InsertSupportTutorial = typeof supportTutorials.$inferInsert;
