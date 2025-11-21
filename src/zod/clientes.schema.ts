// src/zod/clientes.schema.ts
import { z } from "zod";

export const createClienteSchema = z.object({
  nome: z.string(),
  cpfCnpj: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  foto: z.string().optional(),
});

export const updateClienteSchema = z.object({
  nome: z.string().optional(),
  cpfCnpj: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  foto: z.string().optional(),
});
