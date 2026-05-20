import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";

import type { User } from "../../drizzle/schema";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.substring(7);
  const payload = await authService.verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
    return;
  }

  try {
    // Tokens de PDV (role=pdv_operator) são virtuais e não existem na tabela users.
    // Montamos o req.user sintético diretamente do payload JWT.
    if (payload.role === "pdv_operator") {
      req.user = {
        id: payload.userId ?? 0,
        openId: payload.openId,
        email: payload.email ?? null,
        name: payload.name ?? null,
        role: "pdv_operator",
        empresaId: payload.empresaId ?? null,
        password: null,
        supervisorPassword: null,
        loginMethod: "pdv_activation",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as any;
      next();
      return;
    }

    let user = await authService.getUserByOpenId(payload.openId);

    if (!user && payload.email) {
      user = await authService.getUserByEmail(payload.email);
    }

    if (!user) {
      res.status(401).json({ error: "Unauthorized: User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[Auth Middleware] Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
