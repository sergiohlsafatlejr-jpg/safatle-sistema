import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Insights IA - Padrões de Cobrança", () => {
  const testEstabelecimentoId = 99999; // ID que não existe

  describe("getPadroesCobranca", () => {
    it("should return empty array when no patterns exist", async () => {
      const result = await db.getPadroesCobranca(testEstabelecimentoId);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getInsightsIA", () => {
    it("should return empty array when no insights exist", async () => {
      const result = await db.getInsightsIA({
        estabelecimentoId: testEstabelecimentoId,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should accept arquivoId filter", async () => {
      const result = await db.getInsightsIA({
        arquivoId: 99999,
        estabelecimentoId: testEstabelecimentoId,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("analisarPadroesCobranca", () => {
    it("should return patterns structure even with no data", async () => {
      const result = await db.analisarPadroesCobranca(testEstabelecimentoId);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("padroes");
      expect(result).toHaveProperty("totalContas");
      expect(Array.isArray(result.padroes)).toBe(true);
      expect(typeof result.totalContas).toBe("number");
    });
  });

  describe("atualizarStatusInsightIA", () => {
    it("should handle non-existent insight gracefully", async () => {
      // This should not throw, just return true even if insight doesn't exist
      const result = await db.atualizarStatusInsightIA(99999, "aceito");
      
      expect(result).toBeDefined();
      expect(typeof result).toBe("boolean");
      expect(result).toBe(true);
    });

    it("should accept rejeitado status", async () => {
      const result = await db.atualizarStatusInsightIA(99999, "rejeitado");
      
      expect(result).toBeDefined();
      expect(typeof result).toBe("boolean");
      expect(result).toBe(true);
    });
  });
});
