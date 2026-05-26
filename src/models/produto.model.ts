/**
 * @module ProdutoModel
 * @description Model de Produto com interfaces e tipos
 */

import { z } from "zod";

/**
 * Schema de validação para criar produto
 */
export const createProdutoSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  precoCusto: z.number().min(0, "Preço de custo deve ser positivo"),
  precoVenda: z.number().min(0, "Preço de venda deve ser positivo"),
  estoque: z.number().default(0),
  estoqueMinimo: z.number().default(0),
  unidade: z.string().default("UN"),
  departamentoId: z.number().optional(),
  margemLucro: z.number().optional(),
  ncm: z.string().length(8).optional().or(z.literal("")),
  cest: z.string().length(7).optional().or(z.literal("")),
  origem: z.number().min(0).max(8).optional(),
  cstIcms: z.string().max(4).optional(),
  csosnIcms: z.string().max(4).optional(),
  cfopPadraoVenda: z.string().length(4).optional().or(z.literal("")),
  aliquotaIcms: z.number().min(0).optional(),
  aliquotaPis: z.number().min(0).optional(),
  aliquotaCofins: z.number().min(0).optional(),
  pisCst: z.string().max(2).optional(),
  cofinsCst: z.string().max(2).optional(),
});

/**
 * Schema de validação para atualizar produto
 */
export const updateProdutoSchema = z.object({
  id: z.number(),
  codigo: z.string().optional(),
  descricao: z.string().optional(),
  precoCusto: z.number().optional(),
  precoVenda: z.number().optional(),
  estoque: z.number().optional(),
  estoqueMinimo: z.number().optional(),
  unidade: z.string().optional(),
  departamentoId: z.number().optional(),
  margemLucro: z.number().optional(),
  ncm: z.string().length(8).optional().or(z.literal("")),
  cest: z.string().length(7).optional().or(z.literal("")),
  origem: z.number().min(0).max(8).optional(),
  cstIcms: z.string().max(4).optional(),
  csosnIcms: z.string().max(4).optional(),
  cfopPadraoVenda: z.string().length(4).optional().or(z.literal("")),
  aliquotaIcms: z.number().min(0).optional(),
  aliquotaPis: z.number().min(0).optional(),
  aliquotaCofins: z.number().min(0).optional(),
  pisCst: z.string().max(2).optional(),
  cofinsCst: z.string().max(2).optional(),
});

/**
 * Tipo para criar produto (sem id)
 */
export type CreateProdutoInput = z.infer<typeof createProdutoSchema>;

/**
 * Tipo para atualizar produto
 */
export type UpdateProdutoInput = z.infer<typeof updateProdutoSchema>;
