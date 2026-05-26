import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { ZodError } from "zod";
import { getDb } from "../libs/db";
import { empresas } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

import { loginSchema, registerSchema } from "../zod/auth.schema";

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password, codigoEmpresa } = loginSchema.parse(req.body);
    const result = await authService.login(identifier, password, codigoEmpresa);
    res.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Dados de login invalidos" });
      return;
    }
    res.status(401).json({ error: "Credenciais invalidas" });
  }
};

export const validateCompany = async (req: Request, res: Response) => {
  try {
    const { cnpj, senhaAcesso } = req.body;
    if (!cnpj || !senhaAcesso) {
      return res.status(400).json({ error: "CNPJ e Senha de Acesso são obrigatórios" });
    }
    const empresa = await authService.validateCompany(cnpj, senhaAcesso);
    res.json({ success: true, empresa });
  } catch (error: any) {
    res.status(401).json({ error: "Empresa ou senha de acesso invalidas" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, name, password } = registerSchema.parse(req.body);
    const result = await authService.register(email, name, password);
    res.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Dados de cadastro invalidos" });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

export const me = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  
  let empresa = null;
  if (user.empresaId) {
    const db = await getDb();
    if (db) {
      const result = await db.select().from(empresas).where(eq(empresas.id, user.empresaId)).limit(1);
      empresa = result[0] || null;
    }
  }

  res.json({ ...user, empresa });
};
