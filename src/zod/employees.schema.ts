import { z } from "zod";

export const createEmployeeSchema = z.object({
  nome: z.string(),
  cargo: z.string(),
  salario: z.number().int().nonnegative(),
  dataAdmissao: z.string().optional(),
  dataDesligamento: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")).or(z.literal(null)),
  ativo: z.boolean().optional(),
});

export const updateEmployeeSchema = z.object({
  nome: z.string().optional(),
  cargo: z.string().optional(),
  salario: z.number().int().nonnegative().optional(),
  dataAdmissao: z.string().optional(),
  dataDesligamento: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")).or(z.literal(null)),
  ativo: z.boolean().optional(),
});
