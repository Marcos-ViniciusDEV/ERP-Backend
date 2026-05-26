import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { empresas } from "../../drizzle/schema";
import { getDb } from "../libs/db";

/**
 * Middleware de Tenant (Multi-Empresa)
 *
 * Deve ser aplicado APÓS o middleware de autenticação (authenticate).
 * Extrai o empresaId do usuário autenticado e o disponibiliza em req.empresaId.
 * Garante que nenhuma rota de negócio acesse dados de outra empresa.
 *
 * Exceção: usuários com role "trakto_admin" (empresaId = null) têm acesso irrestrito.
 */

declare global {
  namespace Express {
    interface Request {
      empresaId?: number;
    }
  }
}

/**
 * Middleware padrão para rotas de negócio.
 * Requer que o usuário tenha um empresaId válido no token.
 */
export const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  // Super admin do SaaS pode operar sem empresaId, mas se possuir um (ou default 1) associamos para ver os dados das rotinas
  if (user.role === "trakto_admin") {
    req.empresaId = user.empresaId || 1;
    next();
    return;
  }

  if (!user.empresaId) {
    res.status(403).json({
      error: "Acesso negado: usuário não está vinculado a nenhuma empresa.",
    });
    return;
  }

  req.empresaId = user.empresaId;

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [empresa] = await db
      .select({
        bloqueado: empresas.bloqueado,
        motivoBloqueio: empresas.motivoBloqueio,
      })
      .from(empresas)
      .where(eq(empresas.id, req.empresaId))
      .limit(1);

    if (empresa?.bloqueado) {
      res.status(403).json({
        error: "Empresa bloqueada por inadimplência",
        code: "EMPRESA_BLOQUEADA",
        motivo: empresa.motivoBloqueio,
      });
      return;
    }

    next();
  } catch (error) {
    console.error("[Tenant Middleware] Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Middleware exclusivo para rotas de Super Admin do SaaS.
 * Bloqueia qualquer usuário que não seja trakto_admin.
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user || user.role !== "trakto_admin") {
    res.status(403).json({ error: "Acesso restrito a administradores do sistema." });
    return;
  }

  next();
};
