import { z } from "zod";

export const fiscalConfigSchema = z.object({
  habilitarNfce: z.boolean().default(false),
  ambiente: z.enum(["HOMOLOGACAO", "PRODUCAO"]).default("HOMOLOGACAO"),
  regimeTributario: z.enum(["SIMPLES_NACIONAL", "LUCRO_PRESUMIDO", "LUCRO_REAL"]).default("SIMPLES_NACIONAL"),
  certificadoDigitalCaminho: z.string().max(500).optional().nullable(),
  certificadoDigitalSenha: z.string().optional().nullable(),
  certificadoValidade: z.string().optional().nullable(),
  proximoNumeroNfce: z.number().int().min(1).default(1),
  proximoNumeroNfe: z.number().int().min(1).default(1),
  serieNfce: z.number().int().min(1).default(1),
  serieNfe: z.number().int().min(1).default(1),
  idTokenIsc: z.string().max(10).optional().nullable(),
  csc: z.string().max(255).optional().nullable(),
});

export const fiscalPreflightSchema = z.object({
  vendaId: z.number().int().positive(),
  modelo: z.enum(["NFE", "NFCE", "SAT", "MFE"]).default("NFCE"),
});

export const fiscalPrepareSchema = fiscalPreflightSchema.extend({
  emitirEmContingencia: z.boolean().default(false),
});

export const fiscalCancelSchema = z.object({
  justificativa: z.string().min(15, "Justificativa deve ter pelo menos 15 caracteres"),
});

export const certificadoDigitalSchema = z.object({
  nomeArquivo: z.string().min(1).max(255),
  caminhoSeguro: z.string().max(500).optional().nullable(),
  arquivoBase64: z.string().optional().nullable(),
  senha: z.string().optional().nullable(),
  validade: z.string().optional().nullable(),
  cnpj: z.string().max(20).optional().nullable(),
  razaoSocial: z.string().max(255).optional().nullable(),
  ativo: z.boolean().default(true),
});

export const satMfeEquipamentoSchema = z.object({
  pdvId: z.string().min(1).max(50),
  tipo: z.enum(["SAT", "MFE"]),
  fabricante: z.string().max(120).optional().nullable(),
  modelo: z.string().max(120).optional().nullable(),
  numeroSerie: z.string().max(120).optional().nullable(),
  codigoAtivacao: z.string().optional().nullable(),
  assinaturaAplicativoComercial: z.string().optional().nullable(),
  cnpjSoftwareHouse: z.string().max(20).optional().nullable(),
  status: z.enum(["ATIVO", "INATIVO", "ERRO", "NAO_TESTADO"]).default("NAO_TESTADO"),
});

export const satMfeCupomSchema = z.object({
  vendaId: z.number().int().positive(),
  equipamentoId: z.number().int().positive(),
  modelo: z.enum(["SAT", "MFE"]),
});

export const empresaFiscalSchema = z.object({
  razaoSocial: z.string().min(1).max(255),
  nomeFantasia: z.string().max(255).optional().nullable(),
  cnpj: z.string().min(11).max(18),
  inscricaoEstadual: z.string().max(20).optional().nullable(),
  inscricaoMunicipal: z.string().max(20).optional().nullable(),
  crt: z.enum(["1", "2", "3"]).default("1"),
  cnae: z.string().max(10).optional().nullable(),
  telefone: z.string().max(20).optional().nullable(),
  emailFiscal: z.string().email().optional().nullable().or(z.literal("")),
  logradouro: z.string().max(255).optional().nullable(),
  numero: z.string().max(20).optional().nullable(),
  complemento: z.string().max(120).optional().nullable(),
  bairro: z.string().max(120).optional().nullable(),
  municipio: z.string().max(120).optional().nullable(),
  codigoMunicipio: z.string().max(10).optional().nullable(),
  uf: z.string().length(2).optional().nullable(),
  cep: z.string().max(10).optional().nullable(),
});

export const fiscalProviderCredentialSchema = z.object({
  provedor: z.enum(["FOCUS_NFE", "NFE_IO", "PLUGNOTAS"]).default("FOCUS_NFE"),
  ambiente: z.enum(["HOMOLOGACAO", "PRODUCAO"]).default("HOMOLOGACAO"),
  token: z.string().min(1),
  baseUrl: z.string().url().optional().nullable().or(z.literal("")),
  companyId: z.string().max(120).optional().nullable(),
  ativo: z.boolean().default(true),
});

export type FiscalConfigInput = z.infer<typeof fiscalConfigSchema>;
export type FiscalPreflightInput = z.infer<typeof fiscalPreflightSchema>;
export type FiscalPrepareInput = z.infer<typeof fiscalPrepareSchema>;
export type CertificadoDigitalInput = z.infer<typeof certificadoDigitalSchema>;
export type SatMfeEquipamentoInput = z.infer<typeof satMfeEquipamentoSchema>;
export type SatMfeCupomInput = z.infer<typeof satMfeCupomSchema>;
export type EmpresaFiscalInput = z.infer<typeof empresaFiscalSchema>;
export type FiscalProviderCredentialInput = z.infer<typeof fiscalProviderCredentialSchema>;
