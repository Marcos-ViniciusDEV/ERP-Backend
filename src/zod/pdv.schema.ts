import { z } from "zod";

/**
 * Schema para item de venda do PDV
 */
export const itemVendaPDVSchema = z.object({
  produtoId: z.number().int().positive(),
  quantidade: z.number().int().positive(),
  precoUnitario: z.number().int().nonnegative(), // em centavos
  valorTotal: z.number().int().nonnegative(), // em centavos
  valorDesconto: z.number().int().nonnegative().default(0), // em centavos
});

/**
 * Schema para venda do PDV
 */
export const vendaPDVSchema = z.object({
  uuid: z.string().uuid(),
  numeroVenda: z.string().min(1).max(50),
  ccf: z.string().max(6).optional(),
  coo: z.string().max(6).optional(),
  pdvId: z.string().max(50).optional(),
  dataVenda: z.string().datetime(),
  valorTotal: z.number().int().nonnegative(),
  valorDesconto: z.number().int().nonnegative().default(0),
  valorLiquido: z.number().int().nonnegative(),
  formaPagamento: z.string().max(50),
  operadorId: z.number().int().positive(),
  operadorNome: z.string().optional(),
  nfceNumero: z.string().max(50).optional(),
  nfceChave: z.string().max(100).optional(),
  observacao: z.string().optional(),
  itens: z.array(itemVendaPDVSchema).min(1),
});

/**
 * Schema para movimento de caixa do PDV
 */
export const movimentoCaixaPDVSchema = z.object({
  uuid: z.string().uuid(),
  tipo: z.enum(["ABERTURA", "SANGRIA", "REFORCO", "FECHAMENTO"]),
  valor: z.number().int().nonnegative(),
  observacao: z.string().optional(),
  operadorId: z.number().int().positive(),
  dataMovimento: z.string().datetime(),
});

/**
 * Schema para sincronização do PDV
 */
export const sincronizarPDVSchema = z.object({
  vendas: z.array(vendaPDVSchema).default([]),
  movimentosCaixa: z.array(movimentoCaixaPDVSchema).default([]),
});

export type ItemVendaPDV = z.infer<typeof itemVendaPDVSchema>;
export type VendaPDV = z.infer<typeof vendaPDVSchema>;
export type MovimentoCaixaPDV = z.infer<typeof movimentoCaixaPDVSchema>;
export type SincronizarPDV = z.infer<typeof sincronizarPDVSchema>;
