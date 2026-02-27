import { describe, it, expect, vi } from "vitest";

// Mock do getDb para testar a lógica de transformação
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  verificarPermissaoEstabelecimento: vi.fn().mockResolvedValue(true),
}));

vi.mock("../drizzle/schema", () => ({
  recebimentoGeral: {},
  permissoesEstabelecimento: {},
}));

describe("db-recebimentoGeral", () => {
  describe("importarIntegFaturadoRecebido", () => {
    it("deve retornar erro quando db não está disponível", async () => {
      const { importarIntegFaturadoRecebido } = await import("./db-recebimentoGeral");
      const result = await importarIntegFaturadoRecebido();
      expect(result.success).toBe(false);
      expect(result.erros).toContain("Conexão com banco de dados não disponível");
    });
  });

  describe("contarRecebimentoGeral", () => {
    it("deve retornar 0 quando db não está disponível", async () => {
      const { contarRecebimentoGeral } = await import("./db-recebimentoGeral");
      const result = await contarRecebimentoGeral();
      expect(result).toBe(0);
    });
  });

  describe("listarRecebimentoGeral", () => {
    it("deve retornar lista vazia quando db não está disponível", async () => {
      const { listarRecebimentoGeral } = await import("./db-recebimentoGeral");
      const result = await listarRecebimentoGeral({
        estabelecimentoId: 1260036,
      });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });
  });

  describe("resumoRecebimentoGeral", () => {
    it("deve retornar resumo zerado quando db não está disponível", async () => {
      const { resumoRecebimentoGeral } = await import("./db-recebimentoGeral");
      const result = await resumoRecebimentoGeral(1260036);
      expect(result.totalRegistros).toBe(0);
      expect(result.totalFaturado).toBe(0);
      expect(result.totalRecebido).toBe(0);
      expect(result.totalGlosas).toBe(0);
      expect(result.convenios).toEqual([]);
      expect(result.meses).toEqual([]);
    });
  });
});
