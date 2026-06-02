import { NextFunction, Request, Response } from "express";

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Nao autenticado" });
      return;
    }

    if (user.role === "admin" || user.role === "trakto_admin") {
      next();
      return;
    }

    try {
      const permissions = user.permissions ? JSON.parse(user.permissions) : {};
      if (permissions[permission]) {
        next();
        return;
      }
    } catch {
      res.status(403).json({ error: "Permissoes do usuario invalidas" });
      return;
    }

    res.status(403).json({ error: `Permissao necessaria: ${permission}` });
  };
}
