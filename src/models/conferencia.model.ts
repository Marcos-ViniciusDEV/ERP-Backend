/**
 * @module ConferenciaModel
 * @description Model de Conferência de Mercadoria com interfaces e tipos
 */

import { z } from "zod";

/**
 * Schema de validação para criar conferência
 */
export const createConferenciaSchema = z.object({
  movimentacaoEstoqueId: z.number().int().positive("ID da movimentação é obrigatório"),
  produtoId: z.number().int().positive("ID do produto é obrigatório"),
  quantidadeEsperada: z.number().int().min(0, "Quantidade esperada deve ser positiva"),
  quantidadeConferida: z.number().int().min(0, "Quantidade conferida deve ser positiva").optional(),
  dataValidade: z.string().datetime().optional().or(z.date().optional()),
  dataChegada: z.string().datetime().optional().or(z.date().optional()),
  codigoBarrasLido: z.string().max(50).optional(),
  observacao: z.string().optional(),
});

/**
 * Schema de validação para atualizar conferência
 */
export const updateConferenciaSchema = z.object({
  id: z.number().int().positive(),
  quantidadeConferida: z.number().int().min(0, "Quantidade conferida deve ser positiva"),
  dataValidade: z.string().datetime().optional().or(z.date().optional()),
  dataChegada: z.string().datetime().optional().or(z.date().optional()),
  codigoBarrasLido: z.string().max(50).optional(),
  observacao: z.string().optional(),
});

/**
 * Schema para iniciar conferência de uma movimentação
 */
export const iniciarConferenciaSchema = z.object({
  movimentacaoEstoqueId: z.number().int().positive("ID da movimentação é obrigatório"),
});

/**
 * Schema para finalizar conferência
 */
export const finalizarConferenciaSchema = z.object({
  movimentacaoEstoqueId: z.number().int().positive("ID da movimentação é obrigatório"),
});

/**
 * Tipo para criar conferência (sem id)
 */
export type CreateConferenciaInput = z.infer<typeof createConferenciaSchema>;

/**
 * Tipo para atualizar conferência
 */
export type UpdateConferenciaInput = z.infer<typeof updateConferenciaSchema>;

/**
 * Tipo para iniciar conferência
 */
export type IniciarConferenciaInput = z.infer<typeof iniciarConferenciaSchema>;

/**
 * Tipo para finalizar conferência
 */
export type FinalizarConferenciaInput = z.infer<typeof finalizarConferenciaSchema>;
