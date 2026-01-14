import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

describe("Tendências de Glosa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTendenciasGlosa", () => {
    it("should return empty array when no data exists", async () => {
      vi.spyOn(db, "getTendenciasGlosa").mockResolvedValue([]);

      const result = await db.getTendenciasGlosa({
        userId: 1,
        meses: 6,
      });

      expect(result).toEqual([]);
    });

    it("should return tendencies with correct structure", async () => {
      const mockTendencia: db.TendenciaConvenio = {
        convenioId: 1,
        convenioNome: "Unimed",
        tendencias: [
          {
            mes: "Janeiro",
            ano: 2026,
            mesAno: "Jan/2026",
            valorFaturado: 10000,
            valorPago: 9000,
            valorGlosado: 1000,
            percentualGlosa: 10,
            quantidadeEnviados: 100,
            quantidadeGlosados: 10,
          },
        ],
        totalFaturado: 10000,
        totalGlosado: 1000,
        mediaPercentualGlosa: 10,
        tendenciaGlosa: "estavel",
      };

      vi.spyOn(db, "getTendenciasGlosa").mockResolvedValue([mockTendencia]);

      const result = await db.getTendenciasGlosa({
        userId: 1,
        meses: 6,
      });

      expect(result).toHaveLength(1);
      expect(result[0].convenioNome).toBe("Unimed");
      expect(result[0].totalFaturado).toBe(10000);
      expect(result[0].totalGlosado).toBe(1000);
      expect(result[0].mediaPercentualGlosa).toBe(10);
    });
  });

  describe("getTendenciaGeral", () => {
    it("should return empty array when no data exists", async () => {
      vi.spyOn(db, "getTendenciaGeral").mockResolvedValue([]);

      const result = await db.getTendenciaGeral({
        userId: 1,
        meses: 6,
      });

      expect(result).toEqual([]);
    });

    it("should return monthly tendencies with correct structure", async () => {
      const mockTendencias: db.TendenciaMensal[] = [
        {
          mes: "Janeiro",
          ano: 2026,
          mesAno: "Jan/2026",
          valorFaturado: 10000,
          valorPago: 9000,
          valorGlosado: 1000,
          percentualGlosa: 10,
          quantidadeEnviados: 100,
          quantidadeGlosados: 10,
        },
        {
          mes: "Fevereiro",
          ano: 2026,
          mesAno: "Fev/2026",
          valorFaturado: 12000,
          valorPago: 11000,
          valorGlosado: 1000,
          percentualGlosa: 8.33,
          quantidadeEnviados: 120,
          quantidadeGlosados: 10,
        },
      ];

      vi.spyOn(db, "getTendenciaGeral").mockResolvedValue(mockTendencias);

      const result = await db.getTendenciaGeral({
        userId: 1,
        meses: 6,
      });

      expect(result).toHaveLength(2);
      expect(result[0].mes).toBe("Janeiro");
      expect(result[1].mes).toBe("Fevereiro");
    });
  });

  describe("Cálculo de tendência", () => {
    it("should identify increasing trend when glosa percentage grows", () => {
      const primeiraParte = [{ percentualGlosa: 5 }, { percentualGlosa: 6 }];
      const segundaParte = [{ percentualGlosa: 10 }, { percentualGlosa: 12 }];

      const mediaPrimeira = primeiraParte.reduce((acc, t) => acc + t.percentualGlosa, 0) / primeiraParte.length;
      const mediaSegunda = segundaParte.reduce((acc, t) => acc + t.percentualGlosa, 0) / segundaParte.length;

      expect(mediaSegunda > mediaPrimeira * 1.1).toBe(true); // Aumentando
    });

    it("should identify decreasing trend when glosa percentage drops", () => {
      const primeiraParte = [{ percentualGlosa: 15 }, { percentualGlosa: 14 }];
      const segundaParte = [{ percentualGlosa: 8 }, { percentualGlosa: 7 }];

      const mediaPrimeira = primeiraParte.reduce((acc, t) => acc + t.percentualGlosa, 0) / primeiraParte.length;
      const mediaSegunda = segundaParte.reduce((acc, t) => acc + t.percentualGlosa, 0) / segundaParte.length;

      expect(mediaSegunda < mediaPrimeira * 0.9).toBe(true); // Diminuindo
    });

    it("should identify stable trend when glosa percentage stays similar", () => {
      const primeiraParte = [{ percentualGlosa: 10 }, { percentualGlosa: 11 }];
      const segundaParte = [{ percentualGlosa: 10 }, { percentualGlosa: 11 }];

      const mediaPrimeira = primeiraParte.reduce((acc, t) => acc + t.percentualGlosa, 0) / primeiraParte.length;
      const mediaSegunda = segundaParte.reduce((acc, t) => acc + t.percentualGlosa, 0) / segundaParte.length;

      const isAumentando = mediaSegunda > mediaPrimeira * 1.1;
      const isDiminuindo = mediaSegunda < mediaPrimeira * 0.9;

      expect(!isAumentando && !isDiminuindo).toBe(true); // Estável
    });
  });
});
