import { z } from "zod";

export const pagamentoConfigSchema = z.object({
  habilitarPagamentosManuais: z.boolean().default(true),
  habilitarTef: z.boolean().default(false),
  habilitarPosApi: z.boolean().default(false),
  habilitarPixIntegrado: z.boolean().default(false),
  modoPadraoCartao: z.enum(["manual", "tef", "pos_api"]).default("manual"),
  exigirNsuNoManual: z.boolean().default(false),
  permitirVendaOfflineCartaoManual: z.boolean().default(true),
  permitirVendaOfflineTef: z.boolean().default(false),
  enviarCargaAutomaticaPdv: z.boolean().default(true),
  ativo: z.boolean().default(true),
});

export const formaPagamentoSchema = z.object({
  codigo: z.string().min(2).max(50),
  nome: z.string().min(2).max(120),
  tipo: z.enum(["dinheiro", "debito", "credito", "pix", "voucher", "outro"]),
  modoCaptura: z.enum(["manual", "tef", "pos_api", "pix_integrado"]).default("manual"),
  provedorId: z.number().int().positive().nullable().optional(),
  adquirenteId: z.number().int().positive().nullable().optional(),
  permiteTroco: z.boolean().default(false),
  permiteParcelamento: z.boolean().default(false),
  maxParcelas: z.number().int().min(1).max(24).default(1),
  exigirAutorizacao: z.boolean().default(false),
  ativo: z.boolean().default(true),
  ordem: z.number().int().min(0).default(0),
});

export const adquirenteSchema = z.object({
  provedorId: z.number().int().positive().nullable().optional(),
  provedorCodigo: z.string().max(50).nullable().optional(),
  nomeExibicao: z.string().min(2).max(120),
  cnpjCredenciadora: z.string().max(18).nullable().optional(),
  codigoEstabelecimento: z.string().max(100).nullable().optional(),
  ambiente: z.enum(["homologacao", "producao"]).default("homologacao"),
  ativo: z.boolean().default(true),
});

export const taxaSchema = z.object({
  adquirenteEmpresaId: z.number().int().positive().nullable().optional(),
  modalidade: z.enum(["debito", "credito_vista", "credito_parcelado", "pix"]),
  bandeira: z.string().max(50).nullable().optional(),
  parcelasInicio: z.number().int().min(1).max(24).default(1),
  parcelasFim: z.number().int().min(1).max(24).default(1),
  taxaPercentual: z.number().int().min(0).max(10000).default(0),
  taxaFixaCentavos: z.number().int().min(0).default(0),
  prazoRecebimentoDias: z.number().int().min(0).max(365).default(0),
  origem: z.enum(["manual", "api_provedor", "arquivo_importado", "ajuste_usuario"]).default("manual"),
  ativo: z.boolean().default(true),
});

export const terminalPagamentoSchema = z.object({
  pdvId: z.string().min(2).max(50),
  nomeTerminal: z.string().min(2).max(120),
  tipo: z.enum(["manual", "tef", "pos_api"]).default("manual"),
  provedorId: z.number().int().positive().nullable().optional(),
  adquirenteEmpresaId: z.number().int().positive().nullable().optional(),
  serialEquipamento: z.string().max(120).nullable().optional(),
  codigoTerminal: z.string().max(120).nullable().optional(),
  ipTerminal: z.string().max(60).nullable().optional(),
  portaTerminal: z.number().int().min(0).max(65535).nullable().optional(),
  pathIntegradorLocal: z.string().max(500).nullable().optional(),
  estabelecimentoTef: z.string().max(120).nullable().optional(),
  terminalTef: z.string().max(120).nullable().optional(),
  ativo: z.boolean().default(true),
});

export const credencialPagamentoSchema = z.object({
  provedorId: z.number().int().positive().nullable().optional(),
  provedorCodigo: z.string().max(50).nullable().optional(),
  adquirenteEmpresaId: z.number().int().positive().nullable().optional(),
  ambiente: z.enum(["homologacao", "producao"]).default("producao"),
  publicKey: z.string().max(255).nullable().optional(),
  clientId: z.string().max(255).nullable().optional(),
  clientSecret: z.string().max(1000).nullable().optional(),
  accessToken: z.string().max(2000).nullable().optional(),
  webhookSecret: z.string().max(1000).nullable().optional(),
  providerConfig: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  ativo: z.boolean().default(true),
});

export const testarConexaoSchema = z.object({
  adquirenteEmpresaId: z.number().int().positive().nullable().optional(),
  terminalPagamentoId: z.number().int().positive().nullable().optional(),
  provedorId: z.number().int().positive().nullable().optional(),
  provedorCodigo: z.string().max(50).nullable().optional(),
});

export const sincronizarTaxasApiSchema = z.object({
  adquirenteEmpresaId: z.number().int().positive(),
});

export const aplicarTaxasApiSchema = z.object({
  taxas: z.array(taxaSchema).min(1),
});
