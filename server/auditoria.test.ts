import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "auditor-test",
    email: "auditor@example.com",
    name: "Auditor Teste",
    loginMethod: "manus",
    role: "admin",
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

describe("auditoria router", () => {
  const { ctx } = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  describe("categoriasFalhas", () => {
    it("retorna as categorias de falhas de prontuário disponíveis", async () => {
      const result = await caller.auditoria.categoriasFalhas();
      expect(result).toBeDefined();
      // CATEGORIAS_FALHAS é um Record<string, { label, falhas }>
      expect(typeof result).toBe("object");
      const keys = Object.keys(result);
      expect(keys.length).toBeGreaterThan(0);

      // Cada categoria deve ter label e falhas
      const primeira = (result as any)[keys[0]];
      expect(primeira).toHaveProperty("label");
      expect(primeira).toHaveProperty("falhas");
      expect(Array.isArray(primeira.falhas)).toBe(true);
      expect(primeira.falhas.length).toBeGreaterThan(0);
    });

    it("contém categorias essenciais de auditoria hospitalar", async () => {
      const result = await caller.auditoria.categoriasFalhas();
      const categorias = Object.keys(result);

      expect(categorias).toContain("EVOLUCAO");
      expect(categorias).toContain("PRESCRICAO");
      expect(categorias).toContain("CHECAGEM");
      expect(categorias).toContain("AUTORIZACAO");
    });
  });

  describe("dashboardAuditoria", () => {
    it("retorna métricas consolidadas com estrutura correta", async () => {
      const result = await caller.auditoria.dashboardAuditoria({
        estabelecimentoId: 1,
        dataInicio: "2025-01-01",
        dataFim: "2026-12-31",
      });

      expect(result).toBeDefined();

      expect(result).toHaveProperty("contasAuditadas");
      expect(typeof result.contasAuditadas).toBe("number");

      expect(result).toHaveProperty("feedbacks");
      expect(result.feedbacks).toHaveProperty("total");
      expect(result.feedbacks).toHaveProperty("aceitar");
      expect(result.feedbacks).toHaveProperty("rejeitar");
      expect(result.feedbacks).toHaveProperty("ignorar");

      expect(result).toHaveProperty("falhas");
      expect(result.falhas).toHaveProperty("total");
      expect(result.falhas).toHaveProperty("porCategoria");
      expect(result.falhas).toHaveProperty("topFalhas");

      expect(result).toHaveProperty("ajustes");
      expect(result.ajustes).toHaveProperty("total");
      expect(result.ajustes).toHaveProperty("alteracoesQtd");
      expect(result.ajustes).toHaveProperty("alteracoesValor");
      expect(result.ajustes).toHaveProperty("itensAdicionados");
      expect(result.ajustes).toHaveProperty("itensRemovidos");
      expect(result.ajustes).toHaveProperty("topAjustes");

      expect(result).toHaveProperty("auditoresAtivos");
      expect(result).toHaveProperty("evolucaoDiaria");

      expect(result).toHaveProperty("aprendizado");
      expect(result.aprendizado).toHaveProperty("totalPadroes");
      expect(result.aprendizado).toHaveProperty("padroesAtivos");
    });

    it("retorna valores numéricos válidos (não negativos)", async () => {
      const result = await caller.auditoria.dashboardAuditoria({
        estabelecimentoId: 1,
        dataInicio: "2025-01-01",
        dataFim: "2026-12-31",
      });

      expect(result.contasAuditadas).toBeGreaterThanOrEqual(0);
      expect(typeof result.feedbacks.total).toBe("number");
      expect(typeof result.feedbacks.aceitar).toBe("number");
      expect(typeof result.feedbacks.rejeitar).toBe("number");
      expect(typeof result.falhas.total).toBe("number");
      expect(typeof result.ajustes.total).toBe("number");
      expect(typeof result.aprendizado.totalPadroes).toBe("number");
    });
  });

  describe("listarAprendizados", () => {
    it("retorna lista de aprendizados (pode ser vazia)", async () => {
      const result = await caller.auditoria.listarAprendizados({
        estabelecimentoId: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("aceita filtro por tipo de aprendizado", async () => {
      const result = await caller.auditoria.listarAprendizados({
        estabelecimentoId: 1,
        tipo: "FALHA_PRONTUARIO",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("sugestoesFalhas", () => {
    it("retorna sugestões de falhas baseadas no aprendizado", async () => {
      const result = await caller.auditoria.sugestoesFalhas({
        estabelecimentoId: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("sugestoesAjustes", () => {
    it("retorna sugestões de ajustes baseadas no aprendizado", async () => {
      const result = await caller.auditoria.sugestoesAjustes({
        estabelecimentoId: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("aceita filtro por código de item", async () => {
      const result = await caller.auditoria.sugestoesAjustes({
        estabelecimentoId: 1,
        codigoItem: "00000554",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
