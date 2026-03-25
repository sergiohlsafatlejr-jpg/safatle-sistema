import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { AuditService } from "./auditService";

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
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Registrar auditoria de login
      const user = await db.getUserByOpenId(userInfo.openId).catch(() => null);
      if (user || true) {
        AuditService.logAcao({
          userId: user?.id || 0, // 0 for missing mapping
          userNome: userInfo.name || "OAuth User",
          acao: "ACESSO",
          entidade: "auth",
          detalhes: { evento: "LOGIN_OAUTH", method: userInfo.loginMethod },
          ipAddress: req.ip || null
        });
      }

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  if (process.env.NODE_ENV === "development") {
    app.get("/api/dev-login", async (req: Request, res: Response) => {
      try {
        const mockOpenId = "dev-admin-id";
        await db.upsertUser({
          openId: mockOpenId,
          name: "Desenvolvedor Local",
          email: "dev@teste.com",
          loginMethod: "local",
          lastSignedIn: new Date(),
          role: "admin",
        });

        const sessionToken = await sdk.createSessionToken(mockOpenId, {
          name: "Desenvolvedor Local",
          expiresInMs: ONE_YEAR_MS,
        });

        // Registrar auditoria de dev login
        AuditService.logAcao({
          userId: 1, // Default dev ID
          userNome: "Desenvolvedor Local",
          acao: "ACESSO",
          entidade: "auth",
          detalhes: { evento: "LOGIN_DEV", method: "local" },
          ipAddress: req.ip || null
        });

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        res.redirect(302, "/");
      } catch (error) {
        console.error("[Dev Login] Failed", error);
        res.status(500).json({ error: "Dev login failed" });
      }
    });
  }
}
