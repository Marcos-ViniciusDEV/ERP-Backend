import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { ZodError } from "zod";

import { loginSchema, registerSchema } from "../zod/auth.schema";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, codigoEmpresa } = loginSchema.parse(req.body);
    const result = await authService.login(email, password, codigoEmpresa);
    res.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: (error as any).errors });
      return;
    }
    res.status(401).json({ error: error.message });
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
    res.status(401).json({ error: error.message });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, name, password } = registerSchema.parse(req.body);
    const result = await authService.register(email, name, password);
    res.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: (error as any).errors });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

export const me = async (req: Request, res: Response) => {
  res.json(req.user);
};
