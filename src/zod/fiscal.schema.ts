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
  modelo: z.enum(["NFE", "NFCE"]).default("NFCE"),
});

export const fiscalPrepareSchema = fiscalPreflightSchema.extend({
  emitirEmContingencia: z.boolean().default(false),
});

export const fiscalCancelSchema = z.object({
  justificativa: z.string().min(15, "Justificativa deve ter pelo menos 15 caracteres"),
});

export type FiscalConfigInput = z.infer<typeof fiscalConfigSchema>;
export type FiscalPreflightInput = z.infer<typeof fiscalPreflightSchema>;
export type FiscalPrepareInput = z.infer<typeof fiscalPrepareSchema>;
