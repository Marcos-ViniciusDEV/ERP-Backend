import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { ZodError } from "zod";
import { getDb } from "../libs/db";
import { empresas } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

import { loginSchema, registerSchema } from "../zod/auth.schema";
import { refreshTokenSchema } from "../zod/auth.schema";

export const login = async (req: Request, res: Response) => {
  const identifier = String(req.body?.identifier || "");
  const codigoEmpresa = req.body?.codigoEmpresa ? String(req.body.codigoEmpresa) : null;
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input.identifier, input.password, input.codigoEmpresa);
    await authService.recordLoginAttempt({
      usuarioId: result.user.id,
      identificador: input.identifier,
      codigoEmpresa: input.codigoEmpresa,
      sucesso: true,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    await authService.recordLoginAttempt({
      identificador: identifier,
      codigoEmpresa,
      sucesso: false,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      motivo: error instanceof ZodError ? "Dados de login invalidos" : error.message,
    });
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

export const checkoutCompany = async (req: Request, res: Response) => {
  try {
    const { cnpj, senhaAcesso } = req.body;
    const empresa = await authService.validateCompany(cnpj, senhaAcesso);
    const token = await authService.createCheckoutCompanyToken(empresa);
    res.json({ success: true, token, empresa });
  } catch {
    res.status(401).json({ error: "Empresa ou senha de acesso invalidas" });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    res.json({ success: true, ...(await authService.refreshSession(refreshToken)) });
  } catch {
    res.status(401).json({ error: "Refresh token invalido ou expirado" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    await authService.revokeRefreshToken(refreshToken);
  } catch {
    // Logout remains idempotent even when the refresh token is absent or invalid.
  }
  res.json({ success: true });
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
