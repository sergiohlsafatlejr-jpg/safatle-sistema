import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("conciliacao-glosa", () => {
  describe("glosarItens", () => {
    it("should accept valid input with ids and estabelecimentoId", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Test with empty ids array - should return 0 atualizados
      const result = await caller.faturamentoUnificado.glosarItens({
        ids: [],
        estabelecimentoId: 1,
        motivoGlosa: "Item não recebido no demonstrativo",
        codigoGlosa: "NR001",
      });

      expect(result).toEqual({ atualizados: 0 });
    });

    it("should accept input without optional fields", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.faturamentoUnificado.glosarItens({
        ids: [],
        estabelecimentoId: 1,
      });

      expect(result).toEqual({ atualizados: 0 });
    });
  });

  describe("reverterGlosa", () => {
    it("should accept valid input with ids and estabelecimentoId", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Test with empty ids array - should return 0 atualizados
      const result = await caller.faturamentoUnificado.reverterGlosa({
        ids: [],
        estabelecimentoId: 1,
      });

      expect(result).toEqual({ atualizados: 0 });
    });
  });

  describe("glosarTodosNaoRecebidosPorGuia - input validation", () => {
    it("should have the procedure registered in the router", () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Verify the procedure exists
      expect(caller.faturamentoUnificado.glosarTodosNaoRecebidosPorGuia).toBeDefined();
      expect(typeof caller.faturamentoUnificado.glosarTodosNaoRecebidosPorGuia).toBe("function");
    });
  });

  describe("itensConciliadosPorGuia - input validation", () => {
    it("should have the procedure registered in the router", () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      expect(caller.faturamentoUnificado.itensConciliadosPorGuia).toBeDefined();
      expect(typeof caller.faturamentoUnificado.itensConciliadosPorGuia).toBe("function");
    });
  });

  describe("resumoConciliadosPorGuia - input validation", () => {
    it("should have the procedure registered in the router", () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      expect(caller.faturamentoUnificado.resumoConciliadosPorGuia).toBeDefined();
      expect(typeof caller.faturamentoUnificado.resumoConciliadosPorGuia).toBe("function");
    });
  });
});
