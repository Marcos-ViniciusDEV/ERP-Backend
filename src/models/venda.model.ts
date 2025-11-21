/**
 * @module VendaModel
 * @description Model de Venda com interfaces e tipos
 */

import { z } from "zod";

/**
 * Schema para item de venda
 */
export const itemVendaSchema = z.object({
  produtoId: z.number(),
  quantidade: z.number().min(1),
  precoUnitario: z.number().min(0),
  desconto: z.number().default(0),
});

/**
 * Schema de validação para criar venda
 */
export const createVendaSchema = z.object({
  clienteId: z.number().optional(),
  formaPagamento: z.enum(["dinheiro", "cartao", "pix", "boleto", "credito"]),
  itens: z.array(itemVendaSchema).min(1, "Venda deve ter pelo menos 1 item"),
  desconto: z.number().default(0),
  observacoes: z.string().optional(),
});

/**
 * Tipo para criar venda
 */
export type CreateVendaInput = z.infer<typeof createVendaSchema>;

/**
 * Tipo para item de venda
 */
export type ItemVendaInput = z.infer<typeof itemVendaSchema>;
