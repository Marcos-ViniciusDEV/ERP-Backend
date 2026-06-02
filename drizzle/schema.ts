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
  inscricaoEstadual: varchar("inscricaoEstadual", { length: 20 }),
  inscricaoMunicipal: varchar("inscricaoMunicipal", { length: 20 }),
  crt: mysqlEnum("crt", ["1", "2", "3"]).default("1"),
  cnae: varchar("cnae", { length: 10 }),
  telefone: varchar("telefone", { length: 20 }),
  emailFiscal: varchar("emailFiscal", { length: 320 }),
  logradouro: varchar("logradouro", { length: 255 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 120 }),
  bairro: varchar("bairro", { length: 120 }),
  municipio: varchar("municipio", { length: 120 }),
  codigoMunicipio: varchar("codigoMunicipio", { length: 10 }),
  uf: varchar("uf", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
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
  onboardingEtapa: int("onboardingEtapa").default(1).notNull(),
  onboardingConcluido: boolean("onboardingConcluido").default(false).notNull(),
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
 * Checkout publico para a primeira cobranca da assinatura SaaS.
 */
export const checkoutAssinaturas = mysqlTable("checkout_assinaturas", {
  id: int("id").autoincrement().primaryKey(),
  uuid: varchar("uuid", { length: 36 }).notNull().unique(),
  empresaId: int("empresaId").references(() => empresas.id),
  usuarioId: int("usuarioId").references(() => users.id),
  planoCodigo: varchar("planoCodigo", { length: 30 }).notNull(),
  planoNome: varchar("planoNome", { length: 100 }).notNull(),
  nomeResponsavel: varchar("nomeResponsavel", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  telefone: varchar("telefone", { length: 20 }),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }),
  valorCentavos: int("valorCentavos").notNull(),
  periodoMeses: int("periodoMeses").notNull().default(1),
  formaPagamento: varchar("formaPagamento", { length: 40 }),
  status: mysqlEnum("status", [
    "PENDENTE",
    "APROVADO",
    "REJEITADO",
    "CANCELADO",
    "EXPIRADO",
    "ERRO",
  ]).default("PENDENTE").notNull(),
  mercadoPagoPaymentId: varchar("mercadoPagoPaymentId", { length: 80 }).unique(),
  mercadoPagoStatusDetail: varchar("mercadoPagoStatusDetail", { length: 120 }),
  qrCodePix: text("qrCodePix"),
  qrCodeBase64: text("qrCodeBase64"),
  ticketUrl: text("ticketUrl"),
  payloadOriginal: text("payloadOriginal"),
  aprovadoEm: timestamp("aprovadoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CheckoutAssinatura = typeof checkoutAssinaturas.$inferSelect;
export type InsertCheckoutAssinatura = typeof checkoutAssinaturas.$inferInsert;

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
 * Historico de tentativas de autenticacao para suporte e seguranca.
 */
export const loginHistorico = mysqlTable("login_historico", {
  id: int("id").autoincrement().primaryKey(),
  usuarioId: int("usuarioId").references(() => users.id),
  identificador: varchar("identificador", { length: 320 }).notNull(),
  codigoEmpresa: varchar("codigoEmpresa", { length: 120 }),
  sucesso: boolean("sucesso").default(false).notNull(),
  ip: varchar("ip", { length: 80 }),
  userAgent: varchar("userAgent", { length: 500 }),
  motivo: varchar("motivo", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoginHistorico = typeof loginHistorico.$inferSelect;
export type InsertLoginHistorico = typeof loginHistorico.$inferInsert;

/**
 * Refresh tokens persistidos apenas como hash para rotacao de sessao.
 */
export const refreshTokens = mysqlTable("refresh_tokens", {
  id: int("id").autoincrement().primaryKey(),
  usuarioId: int("usuarioId").notNull().references(() => users.id),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiraEm: timestamp("expiraEm").notNull(),
  revogadoEm: timestamp("revogadoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

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
  ncm: varchar("ncm", { length: 8 }),
  cest: varchar("cest", { length: 7 }),
  origem: int("origem").default(0),
  cstIcms: varchar("cstIcms", { length: 4 }),
  csosnIcms: varchar("csosnIcms", { length: 4 }),
  cfopPadraoVenda: varchar("cfopPadraoVenda", { length: 4 }),
  aliquotaIcms: int("aliquotaIcms").default(0), // percentual com 2 casas, ex: 1800 = 18%
  aliquotaPis: int("aliquotaPis").default(0),
  aliquotaCofins: int("aliquotaCofins").default(0),
  pisCst: varchar("pisCst", { length: 2 }),
  cofinsCst: varchar("cofinsCst", { length: 2 }),
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
  clienteId: int("clienteId").references(() => clientes.id),
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
 * Configuracoes fiscais por empresa.
 */
export const configuracoesFiscais = mysqlTable("configuracoes_fiscais", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  habilitarNfce: boolean("habilitarNfce").default(false).notNull(),
  ambiente: mysqlEnum("ambiente", ["HOMOLOGACAO", "PRODUCAO"]).default("HOMOLOGACAO").notNull(),
  regimeTributario: mysqlEnum("regimeTributario", ["SIMPLES_NACIONAL", "LUCRO_PRESUMIDO", "LUCRO_REAL"]).default("SIMPLES_NACIONAL").notNull(),
  certificadoDigitalCaminho: varchar("certificadoDigitalCaminho", { length: 500 }),
  certificadoDigitalSenha: text("certificadoDigitalSenha"),
  certificadoValidade: timestamp("certificadoValidade"),
  proximoNumeroNfce: int("proximoNumeroNfce").default(1).notNull(),
  proximoNumeroNfe: int("proximoNumeroNfe").default(1).notNull(),
  serieNfce: int("serieNfce").default(1).notNull(),
  serieNfe: int("serieNfe").default(1).notNull(),
  idTokenIsc: varchar("idTokenIsc", { length: 10 }),
  csc: varchar("csc", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConfiguracaoFiscal = typeof configuracoesFiscais.$inferSelect;
export type InsertConfiguracaoFiscal = typeof configuracoesFiscais.$inferInsert;

/**
 * Credenciais de provedores fiscais por empresa.
 */
export const fiscalProvedorCredenciais = mysqlTable("fiscal_provedor_credenciais", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  provedor: mysqlEnum("provedor", ["FOCUS_NFE", "NFE_IO", "PLUGNOTAS"]).notNull(),
  ambiente: mysqlEnum("ambiente", ["HOMOLOGACAO", "PRODUCAO"]).default("HOMOLOGACAO").notNull(),
  tokenCriptografado: text("tokenCriptografado").notNull(),
  baseUrl: varchar("baseUrl", { length: 500 }),
  companyId: varchar("companyId", { length: 120 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FiscalProvedorCredencial = typeof fiscalProvedorCredenciais.$inferSelect;
export type InsertFiscalProvedorCredencial = typeof fiscalProvedorCredenciais.$inferInsert;

/**
 * Credenciais fiscais globais administradas pelo backoffice Trakto.
 */
export const fiscalProvedorGlobalCredenciais = mysqlTable("fiscal_provedor_global_credenciais", {
  id: int("id").autoincrement().primaryKey(),
  provedor: mysqlEnum("provedor", ["FOCUS_NFE"]).notNull(),
  ambiente: mysqlEnum("ambiente", ["HOMOLOGACAO", "PRODUCAO"]).default("HOMOLOGACAO").notNull(),
  tokenCriptografado: text("tokenCriptografado").notNull(),
  baseUrl: varchar("baseUrl", { length: 500 }),
  companyId: varchar("companyId", { length: 120 }),
  ativo: boolean("ativo").default(true).notNull(),
  atualizadoPorUsuarioId: int("atualizadoPorUsuarioId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FiscalProvedorGlobalCredencial = typeof fiscalProvedorGlobalCredenciais.$inferSelect;
export type InsertFiscalProvedorGlobalCredencial = typeof fiscalProvedorGlobalCredenciais.$inferInsert;

/**
 * Documentos fiscais gerados, autorizados, rejeitados ou cancelados.
 */
export const documentosFiscais = mysqlTable("documentos_fiscais", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  vendaId: int("vendaId").references(() => vendas.id),
  modelo: mysqlEnum("modelo", ["NFE", "NFCE", "SAT", "MFE"]).notNull(),
  ambiente: mysqlEnum("ambiente", ["HOMOLOGACAO", "PRODUCAO"]).default("HOMOLOGACAO").notNull(),
  status: mysqlEnum("status", ["RASCUNHO", "PENDENTE", "VALIDACAO_FALHOU", "PRONTO_PARA_ENVIO", "PRONTA_PARA_EMISSAO", "ASSINADO", "ENVIADO", "AUTORIZADA", "AUTORIZADO", "REJEITADA", "REJEITADO", "DENEGADO", "CANCELADA", "CANCELADO", "CONTINGENCIA", "INUTILIZADO"]).default("RASCUNHO").notNull(),
  numero: int("numero"),
  serie: int("serie"),
  chaveAcesso: varchar("chaveAcesso", { length: 60 }),
  recibo: varchar("recibo", { length: 80 }),
  protocolo: varchar("protocolo", { length: 80 }),
  protocoloAutorizacao: varchar("protocoloAutorizacao", { length: 80 }),
  protocoloCancelamento: varchar("protocoloCancelamento", { length: 80 }),
  codigoStatusSefaz: varchar("codigoStatusSefaz", { length: 10 }),
  motivoStatusSefaz: text("motivoStatusSefaz"),
  motivoStatus: text("motivoStatus"),
  xml: text("xml"),
  xmlGerado: text("xmlGerado"),
  xmlAssinado: text("xmlAssinado"),
  xmlAutorizado: text("xmlAutorizado"),
  xmlCancelamento: text("xmlCancelamento"),
  danfeUrl: varchar("danfeUrl", { length: 500 }),
  qrcodeUrl: text("qrcodeUrl"),
  digestValue: varchar("digestValue", { length: 120 }),
  justificativaCancelamento: text("justificativaCancelamento"),
  emitidaEm: timestamp("emitidaEm"),
  autorizadaEm: timestamp("autorizadaEm"),
  canceladaEm: timestamp("canceladaEm"),
  inutilizadaEm: timestamp("inutilizadaEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentoFiscal = typeof documentosFiscais.$inferSelect;
export type InsertDocumentoFiscal = typeof documentosFiscais.$inferInsert;

/**
 * Certificados digitais A1 por empresa.
 */
export const certificadosDigitais = mysqlTable("certificados_digitais", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  tipo: mysqlEnum("tipo", ["A1"]).default("A1").notNull(),
  nomeArquivo: varchar("nomeArquivo", { length: 255 }).notNull(),
  caminhoSeguro: varchar("caminhoSeguro", { length: 500 }).notNull(),
  senhaCriptografada: text("senhaCriptografada"),
  validade: timestamp("validade"),
  cnpj: varchar("cnpj", { length: 20 }),
  razaoSocial: varchar("razaoSocial", { length: 255 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CertificadoDigital = typeof certificadosDigitais.$inferSelect;
export type InsertCertificadoDigital = typeof certificadosDigitais.$inferInsert;

/**
 * Eventos fiscais oficiais e pendentes.
 */
export const fiscalEventos = mysqlTable("fiscal_eventos", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  documentoFiscalId: int("documentoFiscalId").references(() => documentosFiscais.id),
  tipo: mysqlEnum("tipo", ["CANCELAMENTO", "CARTA_CORRECAO", "INUTILIZACAO", "CONSULTA_STATUS", "CONSULTA_PROTOCOLO", "MANIFESTACAO"]).notNull(),
  status: mysqlEnum("status", ["PENDENTE", "ENVIADO", "AUTORIZADO", "REJEITADO", "ERRO"]).default("PENDENTE").notNull(),
  codigoStatusSefaz: varchar("codigoStatusSefaz", { length: 10 }),
  motivoStatusSefaz: text("motivoStatusSefaz"),
  protocolo: varchar("protocolo", { length: 80 }),
  xmlEvento: text("xmlEvento"),
  xmlRetorno: text("xmlRetorno"),
  justificativa: text("justificativa"),
  sequencia: int("sequencia").default(1),
  usuarioId: int("usuarioId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FiscalEvento = typeof fiscalEventos.$inferSelect;
export type InsertFiscalEvento = typeof fiscalEventos.$inferInsert;

/**
 * Auditoria tecnica de transmissao fiscal.
 */
export const fiscalTransmissoes = mysqlTable("fiscal_transmissoes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  documentoFiscalId: int("documentoFiscalId").references(() => documentosFiscais.id),
  tipoOperacao: varchar("tipoOperacao", { length: 80 }).notNull(),
  ambiente: mysqlEnum("ambiente", ["HOMOLOGACAO", "PRODUCAO"]).default("HOMOLOGACAO").notNull(),
  uf: varchar("uf", { length: 2 }),
  endpoint: varchar("endpoint", { length: 500 }),
  requestXml: text("requestXml"),
  responseXml: text("responseXml"),
  httpStatus: int("httpStatus"),
  codigoStatusSefaz: varchar("codigoStatusSefaz", { length: 10 }),
  motivo: text("motivo"),
  duracaoMs: int("duracaoMs"),
  erroTecnico: text("erroTecnico"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FiscalTransmissao = typeof fiscalTransmissoes.$inferSelect;
export type InsertFiscalTransmissao = typeof fiscalTransmissoes.$inferInsert;

/**
 * Auditoria funcional das alteracoes fiscais realizadas por usuarios.
 */
export const fiscalAuditoria = mysqlTable("fiscal_auditoria", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  usuarioId: int("usuarioId").references(() => users.id),
  acao: varchar("acao", { length: 80 }).notNull(),
  entidade: varchar("entidade", { length: 80 }).notNull(),
  entidadeId: varchar("entidadeId", { length: 80 }),
  detalhesJson: text("detalhesJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FiscalAuditoria = typeof fiscalAuditoria.$inferSelect;
export type InsertFiscalAuditoria = typeof fiscalAuditoria.$inferInsert;

/**
 * Equipamentos SAT/MFE vinculados aos PDVs.
 */
export const satMfeEquipamentos = mysqlTable("sat_mfe_equipamentos", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  pdvId: varchar("pdvId", { length: 50 }).notNull(),
  tipo: mysqlEnum("tipo", ["SAT", "MFE"]).notNull(),
  fabricante: varchar("fabricante", { length: 120 }),
  modelo: varchar("modelo", { length: 120 }),
  numeroSerie: varchar("numeroSerie", { length: 120 }),
  codigoAtivacaoCriptografado: text("codigoAtivacaoCriptografado"),
  assinaturaAplicativoComercial: text("assinaturaAplicativoComercial"),
  cnpjSoftwareHouse: varchar("cnpjSoftwareHouse", { length: 20 }),
  status: mysqlEnum("status", ["ATIVO", "INATIVO", "ERRO", "NAO_TESTADO"]).default("NAO_TESTADO").notNull(),
  ultimoTesteComunicacao: timestamp("ultimoTesteComunicacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SatMfeEquipamento = typeof satMfeEquipamentos.$inferSelect;
export type InsertSatMfeEquipamento = typeof satMfeEquipamentos.$inferInsert;

/**
 * Cupons fiscais SAT/MFE sincronizados pelo PDV/agent local.
 */
export const satMfeCupons = mysqlTable("sat_mfe_cupons", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  vendaId: int("vendaId").references(() => vendas.id),
  equipamentoId: int("equipamentoId").references(() => satMfeEquipamentos.id),
  modelo: mysqlEnum("modelo", ["SAT", "MFE"]).notNull(),
  numeroSessao: int("numeroSessao"),
  chaveConsulta: varchar("chaveConsulta", { length: 80 }),
  numeroCupom: varchar("numeroCupom", { length: 80 }),
  xmlEnvio: text("xmlEnvio"),
  xmlRetorno: text("xmlRetorno"),
  xmlCancelamento: text("xmlCancelamento"),
  status: mysqlEnum("status", ["PENDENTE_EQUIPAMENTO", "EMITIDO", "CANCELADO", "REJEITADO", "ERRO"]).default("PENDENTE_EQUIPAMENTO").notNull(),
  codigoRetorno: varchar("codigoRetorno", { length: 20 }),
  mensagemRetorno: text("mensagemRetorno"),
  qrCode: text("qrCode"),
  emitidoEm: timestamp("emitidoEm"),
  canceladoEm: timestamp("canceladoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SatMfeCupom = typeof satMfeCupons.$inferSelect;
export type InsertSatMfeCupom = typeof satMfeCupons.$inferInsert;

/**
 * Provedores de pagamento disponiveis para configuracao.
 */
export const provedoresPagamento = mysqlTable("provedores_pagamento", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  nome: varchar("nome", { length: 120 }).notNull(),
  tipo: mysqlEnum("tipo", ["manual", "tef", "pos_api", "pix_gateway", "adquirente"]).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  permitePix: boolean("permitePix").default(false).notNull(),
  permiteCartao: boolean("permiteCartao").default(false).notNull(),
  permiteEnvioValorPdv: boolean("permiteEnvioValorPdv").default(false).notNull(),
  requerHomologacao: boolean("requerHomologacao").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProvedorPagamento = typeof provedoresPagamento.$inferSelect;
export type InsertProvedorPagamento = typeof provedoresPagamento.$inferInsert;

/**
 * Configuracao principal de pagamentos por empresa.
 */
export const configuracoesPagamentoEmpresa = mysqlTable("configuracoes_pagamento_empresa", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  habilitarPagamentosManuais: boolean("habilitarPagamentosManuais").default(true).notNull(),
  habilitarTef: boolean("habilitarTef").default(false).notNull(),
  habilitarPosApi: boolean("habilitarPosApi").default(false).notNull(),
  habilitarPixIntegrado: boolean("habilitarPixIntegrado").default(false).notNull(),
  modoPadraoCartao: mysqlEnum("modoPadraoCartao", ["manual", "tef", "pos_api"]).default("manual").notNull(),
  exigirNsuNoManual: boolean("exigirNsuNoManual").default(false).notNull(),
  permitirVendaOfflineCartaoManual: boolean("permitirVendaOfflineCartaoManual").default(true).notNull(),
  permitirVendaOfflineTef: boolean("permitirVendaOfflineTef").default(false).notNull(),
  enviarCargaAutomaticaPdv: boolean("enviarCargaAutomaticaPdv").default(true).notNull(),
  versaoCarga: int("versaoCarga").default(1).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConfiguracaoPagamentoEmpresa = typeof configuracoesPagamentoEmpresa.$inferSelect;
export type InsertConfiguracaoPagamentoEmpresa = typeof configuracoesPagamentoEmpresa.$inferInsert;

/**
 * Formas de pagamento que aparecem no PDV.
 */
export const formasPagamentoEmpresa = mysqlTable("formas_pagamento_empresa", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  codigo: varchar("codigo", { length: 50 }).notNull(),
  nome: varchar("nome", { length: 120 }).notNull(),
  tipo: mysqlEnum("tipo", ["dinheiro", "debito", "credito", "pix", "voucher", "outro"]).notNull(),
  modoCaptura: mysqlEnum("modoCaptura", ["manual", "tef", "pos_api", "pix_integrado"]).default("manual").notNull(),
  provedorId: int("provedorId").references(() => provedoresPagamento.id),
  adquirenteId: int("adquirenteId"),
  permiteTroco: boolean("permiteTroco").default(false).notNull(),
  permiteParcelamento: boolean("permiteParcelamento").default(false).notNull(),
  maxParcelas: int("maxParcelas").default(1).notNull(),
  exigirAutorizacao: boolean("exigirAutorizacao").default(false).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  ordem: int("ordem").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FormaPagamentoEmpresa = typeof formasPagamentoEmpresa.$inferSelect;
export type InsertFormaPagamentoEmpresa = typeof formasPagamentoEmpresa.$inferInsert;

/**
 * Adquirentes configuradas por empresa.
 */
export const adquirentesEmpresa = mysqlTable("adquirentes_empresa", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  provedorId: int("provedorId").references(() => provedoresPagamento.id),
  nomeExibicao: varchar("nomeExibicao", { length: 120 }).notNull(),
  cnpjCredenciadora: varchar("cnpjCredenciadora", { length: 18 }),
  codigoEstabelecimento: varchar("codigoEstabelecimento", { length: 100 }),
  ambiente: mysqlEnum("ambiente", ["homologacao", "producao"]).default("homologacao").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdquirenteEmpresa = typeof adquirentesEmpresa.$inferSelect;
export type InsertAdquirenteEmpresa = typeof adquirentesEmpresa.$inferInsert;

/**
 * Taxas por adquirente/modalidade para previsao financeira.
 */
export const taxasAdquirentes = mysqlTable("taxas_adquirentes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  adquirenteEmpresaId: int("adquirenteEmpresaId").references(() => adquirentesEmpresa.id),
  modalidade: mysqlEnum("modalidade", ["debito", "credito_vista", "credito_parcelado", "pix"]).notNull(),
  bandeira: varchar("bandeira", { length: 50 }),
  parcelasInicio: int("parcelasInicio").default(1).notNull(),
  parcelasFim: int("parcelasFim").default(1).notNull(),
  taxaPercentual: int("taxaPercentual").default(0).notNull(),
  taxaFixaCentavos: int("taxaFixaCentavos").default(0).notNull(),
  prazoRecebimentoDias: int("prazoRecebimentoDias").default(0).notNull(),
  origem: mysqlEnum("origem", ["manual", "api_provedor", "arquivo_importado", "ajuste_usuario"]).default("manual").notNull(),
  provedorTaxaId: varchar("provedorTaxaId", { length: 120 }),
  ultimaConsultaApiEm: timestamp("ultimaConsultaApiEm"),
  ultimaConfirmacaoUsuarioEm: timestamp("ultimaConfirmacaoUsuarioEm"),
  confirmadaPeloUsuarioId: int("confirmadaPeloUsuarioId").references(() => users.id),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaxaAdquirente = typeof taxasAdquirentes.$inferSelect;
export type InsertTaxaAdquirente = typeof taxasAdquirentes.$inferInsert;

export const historicoTaxasAdquirentes = mysqlTable("historico_taxas_adquirentes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  taxaAdquirenteId: int("taxaAdquirenteId").references(() => taxasAdquirentes.id),
  adquirenteEmpresaId: int("adquirenteEmpresaId").references(() => adquirentesEmpresa.id),
  modalidade: varchar("modalidade", { length: 50 }).notNull(),
  bandeira: varchar("bandeira", { length: 50 }),
  parcelasInicio: int("parcelasInicio").default(1),
  parcelasFim: int("parcelasFim").default(1),
  taxaAnteriorPercentual: int("taxaAnteriorPercentual"),
  taxaNovaPercentual: int("taxaNovaPercentual"),
  taxaFixaAnteriorCentavos: int("taxaFixaAnteriorCentavos"),
  taxaFixaNovaCentavos: int("taxaFixaNovaCentavos"),
  prazoAnteriorDias: int("prazoAnteriorDias"),
  prazoNovoDias: int("prazoNovoDias"),
  origem: varchar("origem", { length: 50 }).notNull(),
  payloadApi: text("payloadApi"),
  alteradoPorUsuarioId: int("alteradoPorUsuarioId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoTaxaAdquirente = typeof historicoTaxasAdquirentes.$inferSelect;
export type InsertHistoricoTaxaAdquirente = typeof historicoTaxasAdquirentes.$inferInsert;

export const terminaisPagamento = mysqlTable("terminais_pagamento", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  pdvId: varchar("pdvId", { length: 50 }).notNull(),
  nomeTerminal: varchar("nomeTerminal", { length: 120 }).notNull(),
  tipo: mysqlEnum("tipo", ["manual", "tef", "pos_api"]).default("manual").notNull(),
  provedorId: int("provedorId").references(() => provedoresPagamento.id),
  adquirenteEmpresaId: int("adquirenteEmpresaId").references(() => adquirentesEmpresa.id),
  serialEquipamento: varchar("serialEquipamento", { length: 120 }),
  codigoTerminal: varchar("codigoTerminal", { length: 120 }),
  ipTerminal: varchar("ipTerminal", { length: 60 }),
  portaTerminal: int("portaTerminal"),
  pathIntegradorLocal: varchar("pathIntegradorLocal", { length: 500 }),
  estabelecimentoTef: varchar("estabelecimentoTef", { length: 120 }),
  terminalTef: varchar("terminalTef", { length: 120 }),
  ativo: boolean("ativo").default(true).notNull(),
  ultimaCargaEnviadaEm: timestamp("ultimaCargaEnviadaEm"),
  ultimoStatus: varchar("ultimoStatus", { length: 80 }).default("Nao configurado"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TerminalPagamento = typeof terminaisPagamento.$inferSelect;
export type InsertTerminalPagamento = typeof terminaisPagamento.$inferInsert;

export const pinpadPareamentoKeys = mysqlTable("pinpad_pareamento_keys", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  pdvId: varchar("pdvId", { length: 50 }).notNull(),
  terminalPagamentoId: int("terminalPagamentoId").references(() => terminaisPagamento.id),
  cnpjEmpresa: varchar("cnpjEmpresa", { length: 18 }).notNull(),
  chaveHash: varchar("chaveHash", { length: 128 }).notNull(),
  chavePrefixo: varchar("chavePrefixo", { length: 40 }).notNull(),
  expiraEm: timestamp("expiraEm").notNull(),
  usadaEm: timestamp("usadaEm"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PinpadPareamentoKey = typeof pinpadPareamentoKeys.$inferSelect;
export type InsertPinpadPareamentoKey = typeof pinpadPareamentoKeys.$inferInsert;

export const credenciaisPagamento = mysqlTable("credenciais_pagamento", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  provedorId: int("provedorId").notNull().references(() => provedoresPagamento.id),
  adquirenteEmpresaId: int("adquirenteEmpresaId").references(() => adquirentesEmpresa.id),
  ambiente: mysqlEnum("ambiente", ["homologacao", "producao"]).default("producao").notNull(),
  publicKey: varchar("publicKey", { length: 255 }),
  clientId: varchar("clientId", { length: 255 }),
  clientSecretEncrypted: text("clientSecretEncrypted"),
  accessTokenEncrypted: text("accessTokenEncrypted"),
  webhookSecretEncrypted: text("webhookSecretEncrypted"),
  providerConfigJson: text("providerConfigJson"),
  statusValidacao: varchar("statusValidacao", { length: 80 }).default("Pendente de configuracao"),
  ultimaValidacaoEm: timestamp("ultimaValidacaoEm"),
  ultimoErro: text("ultimoErro"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CredencialPagamento = typeof credenciaisPagamento.$inferSelect;
export type InsertCredencialPagamento = typeof credenciaisPagamento.$inferInsert;

export const transacoesPagamento = mysqlTable("transacoes_pagamento", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId").notNull().references(() => empresas.id),
  vendaId: int("vendaId").references(() => vendas.id),
  vendaUuid: varchar("vendaUuid", { length: 36 }),
  pdvId: varchar("pdvId", { length: 50 }),
  terminalPagamentoId: int("terminalPagamentoId").references(() => terminaisPagamento.id),
  formaPagamentoEmpresaId: int("formaPagamentoEmpresaId").references(() => formasPagamentoEmpresa.id),
  provedorId: int("provedorId").references(() => provedoresPagamento.id),
  adquirenteEmpresaId: int("adquirenteEmpresaId").references(() => adquirentesEmpresa.id),
  tipo: mysqlEnum("tipo", ["dinheiro", "debito", "credito", "pix", "voucher", "outro"]).notNull(),
  modoCaptura: mysqlEnum("modoCaptura", ["manual", "tef", "pos_api", "pix_integrado"]).default("manual").notNull(),
  status: mysqlEnum("status", ["pendente", "aprovada", "negada", "cancelada", "estornada", "erro", "conciliada"]).default("aprovada").notNull(),
  valorBrutoCentavos: int("valorBrutoCentavos").notNull(),
  valorTaxaPrevistaCentavos: int("valorTaxaPrevistaCentavos").default(0).notNull(),
  valorLiquidoPrevistoCentavos: int("valorLiquidoPrevistoCentavos").default(0).notNull(),
  parcelas: int("parcelas").default(1).notNull(),
  bandeira: varchar("bandeira", { length: 50 }),
  nsu: varchar("nsu", { length: 80 }),
  codigoAutorizacao: varchar("codigoAutorizacao", { length: 80 }),
  tid: varchar("tid", { length: 120 }),
  endToEndIdPix: varchar("endToEndIdPix", { length: 120 }),
  qrCodePix: text("qrCodePix"),
  payloadOriginal: text("payloadOriginal"),
  erroCodigo: varchar("erroCodigo", { length: 80 }),
  erroMensagem: text("erroMensagem"),
  dataTransacao: timestamp("dataTransacao").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TransacaoPagamento = typeof transacoesPagamento.$inferSelect;
export type InsertTransacaoPagamento = typeof transacoesPagamento.$inferInsert;

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
  razaoSocial: varchar("razaoSocial", { length: 255 }),
  nomeFantasia: varchar("nomeFantasia", { length: 255 }),
  tipoPessoa: mysqlEnum("tipoPessoa", ["FISICA", "JURIDICA", "ESTRANGEIRO"]).default("FISICA").notNull(),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }).unique(),
  inscricaoEstadual: varchar("inscricaoEstadual", { length: 20 }),
  indicadorInscricaoEstadual: mysqlEnum("indicadorInscricaoEstadual", ["1", "2", "9"]).default("9"),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  endereco: text("endereco"), // JSON string: { rua, numero, bairro, cidade, cep }
  logradouro: varchar("logradouro", { length: 255 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 120 }),
  bairro: varchar("bairro", { length: 120 }),
  municipio: varchar("municipio", { length: 120 }),
  codigoMunicipio: varchar("codigoMunicipio", { length: 10 }),
  uf: varchar("uf", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
  pais: varchar("pais", { length: 60 }).default("Brasil"),
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
