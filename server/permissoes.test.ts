import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createRegularUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Permissões Router", () => {
  describe("verificarGestor", () => {
    it("should return true for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.permissoes.verificarGestor();
      expect(result).toBe(true);
    });

    it("should return false for regular users without permissions", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.permissoes.verificarGestor();
      expect(result).toBe(false);
    });
  });

  describe("estabelecimentosPermitidos", () => {
    it("should return all establishments for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.permissoes.estabelecimentosPermitidos();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return establishments for regular users", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.permissoes.estabelecimentosPermitidos();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("minhasPermissoes", () => {
    it("should return permissions array for admin user", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.permissoes.minhasPermissoes();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return permissions array for regular user", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.permissoes.minhasPermissoes();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("verificarPermissao", () => {
    it("should return true for admin users on any establishment", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.permissoes.verificarPermissao({
        estabelecimentoId: 1,
        tipoPermissao: "visualizar",
      });
      expect(result).toBe(true);
    });

    it("should check edit permission for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.permissoes.verificarPermissao({
        estabelecimentoId: 1,
        tipoPermissao: "editar",
      });
      expect(result).toBe(true);
    });

    it("should check gerenciar permission for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.permissoes.verificarPermissao({
        estabelecimentoId: 1,
        tipoPermissao: "gerenciar",
      });
      expect(result).toBe(true);
    });
  });
});

describe("Dashboard Consolidado Router", () => {
  describe("dados", () => {
    it("should return consolidated data for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboardConsolidado.dados();
      expect(result).toBeDefined();
      expect(result.estabelecimentos).toBeDefined();
      expect(result.totais).toBeDefined();
      expect(Array.isArray(result.estabelecimentos)).toBe(true);
    });

    it("should include totals in the response", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboardConsolidado.dados();
      expect(result.totais).toHaveProperty("totalArquivos");
      expect(result.totais).toHaveProperty("totalProcedimentos");
      expect(result.totais).toHaveProperty("valorTotalFaturado");
      expect(result.totais).toHaveProperty("valorTotalGlosado");
      expect(result.totais).toHaveProperty("percentualGlosa");
    });

    it("should throw FORBIDDEN for regular users", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.dashboardConsolidado.dados()).rejects.toThrow();
    });
  });

  describe("comparativoGlosas", () => {
    it("should return comparative data for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboardConsolidado.comparativoGlosas();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should accept date filters", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dashboardConsolidado.comparativoGlosas({
        dataInicio: "2024-01-01",
        dataFim: "2024-12-31",
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should throw FORBIDDEN for regular users", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.dashboardConsolidado.comparativoGlosas()).rejects.toThrow();
    });
  });
});
