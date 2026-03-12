import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pg
const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn().mockResolvedValue({
  query: mockQuery,
  release: mockRelease,
});
vi.mock("pg", () => ({
  default: { Pool: vi.fn(() => ({ connect: mockConnect })) },
}));

// Mock db
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: mockSelect,
    $count: vi.fn(),
  }),
}));

// Mock env
vi.mock("./_core/env", () => ({
  ENV: {
    warleineDbHost: "localhost",
    warleineDbPort: "5432",
    warleineDbName: "test",
    warleineDbUser: "test",
    warleineDbPassword: "test",
    builtInForgeApiUrl: "http://localhost",
    builtInForgeApiKey: "test",
  },
}));

// Mock map
vi.mock("./_core/map", () => ({
  makeRequest: vi.fn(),
}));

describe("buscarPacientesInternados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return correct structure from PostgreSQL fallback", async () => {
    // Mock getDb to return null (force PostgreSQL fallback)
    const { getDb } = await import("./db");
    (getDb as any).mockResolvedValueOnce(null);

    const agora = new Date();
    const umaSemanaAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          numatend: "12345",
          paciente: "João Silva",
          convenio: "Unimed",
          centro_custo: "UTI",
          prestador: "Dr. Carlos",
          data_entrada: umaSemanaAtras.toISOString(),
          procedimento: "Cirurgia",
          cid: "J18.9 - Pneumonia",
        },
        {
          numatend: "12346",
          paciente: "Maria Santos",
          convenio: "Unimed",
          centro_custo: "Enfermaria",
          prestador: "Dra. Ana",
          data_entrada: agora.toISOString(),
          procedimento: "Observação",
          cid: "R10 - Dor abdominal",
        },
      ],
    });

    const { buscarPacientesInternados } = await import("./relatorioAtendimentos");
    const result = await buscarPacientesInternados();

    expect(result).toBeDefined();
    expect(result.totalInternados).toBe(2);
    expect(result.pacientes).toHaveLength(2);
    expect(result.fonte).toBe("postgresql_direto");

    // Check structure
    expect(result.pacientes[0]).toHaveProperty("numatend");
    expect(result.pacientes[0]).toHaveProperty("paciente");
    expect(result.pacientes[0]).toHaveProperty("convenio");
    expect(result.pacientes[0]).toHaveProperty("centroCusto");
    expect(result.pacientes[0]).toHaveProperty("prestador");
    expect(result.pacientes[0]).toHaveProperty("dataEntrada");
    expect(result.pacientes[0]).toHaveProperty("diasInternado");
    expect(result.pacientes[0]).toHaveProperty("procedimento");
    expect(result.pacientes[0]).toHaveProperty("cid");

    // Check grouping
    expect(result.porCentroCusto).toHaveLength(2);
    expect(result.porConvenio).toHaveLength(1); // Both are Unimed
    expect(result.porConvenio[0].nome).toBe("Unimed");
    expect(result.porConvenio[0].total).toBe(2);

    // Check media permanência
    expect(result.mediaPermancencia).toBeGreaterThan(0);
  });

  it("should handle empty results", async () => {
    const { getDb } = await import("./db");
    (getDb as any).mockResolvedValueOnce(null);

    mockQuery.mockResolvedValueOnce({ rows: [] });

    const { buscarPacientesInternados } = await import("./relatorioAtendimentos");
    const result = await buscarPacientesInternados();

    expect(result.totalInternados).toBe(0);
    expect(result.pacientes).toHaveLength(0);
    expect(result.porCentroCusto).toHaveLength(0);
    expect(result.porConvenio).toHaveLength(0);
    expect(result.mediaPermancencia).toBe(0);
  });

  it("should calculate dias internado correctly", async () => {
    const { getDb } = await import("./db");
    (getDb as any).mockResolvedValueOnce(null);

    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          numatend: "99999",
          paciente: "Teste Longa Internação",
          convenio: "SUS",
          centro_custo: "UTI",
          prestador: "Dr. Teste",
          data_entrada: trintaDiasAtras.toISOString(),
          procedimento: "Tratamento",
          cid: "A00 - Cólera",
        },
      ],
    });

    const { buscarPacientesInternados } = await import("./relatorioAtendimentos");
    const result = await buscarPacientesInternados();

    expect(result.pacientes[0].diasInternado).toBeGreaterThanOrEqual(29);
    expect(result.pacientes[0].diasInternado).toBeLessThanOrEqual(31);
  });

  it("should sort porCentroCusto by total descending", async () => {
    const { getDb } = await import("./db");
    (getDb as any).mockResolvedValueOnce(null);

    const agora = new Date();
    mockQuery.mockResolvedValueOnce({
      rows: [
        { numatend: "1", paciente: "P1", convenio: "C1", centro_custo: "UTI", prestador: "D1", data_entrada: agora.toISOString(), procedimento: "", cid: "" },
        { numatend: "2", paciente: "P2", convenio: "C2", centro_custo: "UTI", prestador: "D2", data_entrada: agora.toISOString(), procedimento: "", cid: "" },
        { numatend: "3", paciente: "P3", convenio: "C3", centro_custo: "UTI", prestador: "D3", data_entrada: agora.toISOString(), procedimento: "", cid: "" },
        { numatend: "4", paciente: "P4", convenio: "C4", centro_custo: "Enfermaria", prestador: "D4", data_entrada: agora.toISOString(), procedimento: "", cid: "" },
      ],
    });

    const { buscarPacientesInternados } = await import("./relatorioAtendimentos");
    const result = await buscarPacientesInternados();

    expect(result.porCentroCusto[0].nome).toBe("UTI");
    expect(result.porCentroCusto[0].total).toBe(3);
    expect(result.porCentroCusto[1].nome).toBe("Enfermaria");
    expect(result.porCentroCusto[1].total).toBe(1);
  });
});
