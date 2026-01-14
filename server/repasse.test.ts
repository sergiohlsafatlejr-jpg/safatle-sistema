import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do db
vi.mock("./db", () => ({
  getRepasseData: vi.fn(),
}));

import * as db from "./db";

describe("Repasse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRepasseData", () => {
    it("should return empty array when no data", async () => {
      vi.mocked(db.getRepasseData).mockResolvedValue({ items: [], total: 0 });
      
      const result = await db.getRepasseData({
        userId: 1,
        page: 1,
        pageSize: 50,
      });
      
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should return repasse items with correct structure", async () => {
      const mockItems = [
        {
          id: 1,
          guiaNumero: "12345",
          dataExecucao: new Date("2024-01-15"),
          codigo: "10101012",
          descricao: "Consulta médica",
          pacienteNome: "João Silva",
          nomeMedico: "Dr. Carlos",
          crmMedico: "12345-SP",
          convenioNome: "Unimed",
          valorFaturado: "150.00",
          valorPago: "140.00",
          valorGlosado: "10.00",
        },
      ];
      
      vi.mocked(db.getRepasseData).mockResolvedValue({ 
        items: mockItems, 
        total: 1 
      });
      
      const result = await db.getRepasseData({
        userId: 1,
        page: 1,
        pageSize: 50,
      });
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty("guiaNumero");
      expect(result.items[0]).toHaveProperty("nomeMedico");
      expect(result.items[0]).toHaveProperty("valorFaturado");
      expect(result.items[0]).toHaveProperty("valorPago");
      expect(result.items[0]).toHaveProperty("valorGlosado");
    });

    it("should filter by convenioId", async () => {
      vi.mocked(db.getRepasseData).mockResolvedValue({ items: [], total: 0 });
      
      await db.getRepasseData({
        userId: 1,
        convenioId: 5,
        page: 1,
        pageSize: 50,
      });
      
      expect(db.getRepasseData).toHaveBeenCalledWith(
        expect.objectContaining({ convenioId: 5 })
      );
    });

    it("should filter by date range", async () => {
      vi.mocked(db.getRepasseData).mockResolvedValue({ items: [], total: 0 });
      
      const dataInicio = new Date("2024-01-01");
      const dataFim = new Date("2024-01-31");
      
      await db.getRepasseData({
        userId: 1,
        dataInicio,
        dataFim,
        page: 1,
        pageSize: 50,
      });
      
      expect(db.getRepasseData).toHaveBeenCalledWith(
        expect.objectContaining({ dataInicio, dataFim })
      );
    });

    it("should paginate results", async () => {
      vi.mocked(db.getRepasseData).mockResolvedValue({ items: [], total: 100 });
      
      await db.getRepasseData({
        userId: 1,
        page: 2,
        pageSize: 50,
      });
      
      expect(db.getRepasseData).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 50 })
      );
    });
  });
});
