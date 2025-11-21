import { z } from "zod";

export const listKardexByProdutoSchema = z.object({
  produtoId: z.number(),
});

export const createKardexSchema = z.object({
  produtoId: z.number(),
  tipo: z.enum(["ENTRADA_NFE", "VENDA_PDV", "BAIXA_PERDA", "BAIXA_LANCHE", "BAIXA_USO", "AJUSTE_AUDITORIA", "TRANSFERENCIA_ENTRADA", "TRANSFERENCIA_SAIDA"]),
  quantidade: z.number(),
  saldoAnterior: z.number(),
  saldoAtual: z.number(),
  custoUnitario: z.number().optional(),
  documentoReferencia: z.string().optional(),
  observacao: z.string().optional(),
});

export type CreateKardexInput = z.infer<typeof createKardexSchema>;
