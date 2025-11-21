import type { Express, Request, Response } from "express";
import * as db from "../legacy_db";
import { authService } from "../services/auth.service";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || undefined,
        email: userInfo.email || "",
        loginMethod: userInfo.loginMethod || userInfo.platform || undefined,
        lastSignedIn: new Date(),
      });

      // Buscar usuário completo do banco
      const user = await db.getUserByOpenId(userInfo.openId);

      if (!user) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }

      // Criar JWT token
      const token = await authService.createToken(user);

      // Redirecionar com token como query param para o frontend armazenar
      res.redirect(302, `/?token=${token}`);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
