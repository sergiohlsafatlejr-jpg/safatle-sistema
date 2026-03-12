import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock the map module
vi.mock("./_core/map", () => ({
  makeRequest: vi.fn(),
}));

// Mock the env module
vi.mock("./_core/env", () => ({
  ENV: {
    warleineDbHost: "localhost",
    warleineDbPort: "5432",
    warleineDbName: "test",
    warleineDbUser: "test",
    warleineDbPassword: "test",
    forgeApiUrl: "https://forge.test.dev",
    forgeApiKey: "test-key",
  },
}));

describe("buscarDadosMapaCalor", () => {
  it("should throw error when database is not available", async () => {
    const { getDb } = await import("./db");
    (getDb as any).mockResolvedValue(null);

    const { buscarDadosMapaCalor } = await import("./relatorioAtendimentos");

    await expect(
      buscarDadosMapaCalor({ dataInicio: "2025-01-01", dataFim: "2025-12-31" })
    ).rejects.toThrow("Banco de dados não disponível");
  });

  it("should return empty pontos when no CEP data exists", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    const { getDb } = await import("./db");
    (getDb as any).mockResolvedValue(mockDb);

    const { buscarDadosMapaCalor } = await import("./relatorioAtendimentos");

    const result = await buscarDadosMapaCalor({
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
    });

    expect(result).toBeDefined();
    expect(result.pontos).toEqual([]);
    expect(result.totalCeps).toBe(0);
    expect(result.totalAtendimentos).toBe(0);
    expect(result.centroMapa).toBeDefined();
    expect(result.centroMapa.lat).toBe(-15.7801);
    expect(result.centroMapa.lng).toBe(-47.9292);
    expect(result.zoomInicial).toBe(4);
  });

  it("should return HeatmapData structure with correct fields", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    const { getDb } = await import("./db");
    (getDb as any).mockResolvedValue(mockDb);

    const { buscarDadosMapaCalor } = await import("./relatorioAtendimentos");

    const result = await buscarDadosMapaCalor({
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
    });

    // Verify the structure
    expect(result).toHaveProperty("pontos");
    expect(result).toHaveProperty("totalCeps");
    expect(result).toHaveProperty("totalAtendimentos");
    expect(result).toHaveProperty("centroMapa");
    expect(result).toHaveProperty("zoomInicial");
    expect(result.centroMapa).toHaveProperty("lat");
    expect(result.centroMapa).toHaveProperty("lng");
    expect(Array.isArray(result.pontos)).toBe(true);
    expect(typeof result.totalCeps).toBe("number");
    expect(typeof result.totalAtendimentos).toBe("number");
  });
});

describe("geocodificarCep", () => {
  it("should return null for invalid CEPs", async () => {
    // We test the geocodificarCep function indirectly through buscarDadosMapaCalor
    // The function should handle invalid CEPs gracefully
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { cep: "123", total: 5 }, // Invalid CEP - too short
      ]),
    };

    const { getDb } = await import("./db");
    (getDb as any).mockResolvedValue(mockDb);

    const { buscarDadosMapaCalor } = await import("./relatorioAtendimentos");

    const result = await buscarDadosMapaCalor({
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
    });

    // Invalid CEP should be filtered out
    expect(result.pontos.length).toBe(0);
    expect(result.totalCeps).toBe(0);
  });
});
