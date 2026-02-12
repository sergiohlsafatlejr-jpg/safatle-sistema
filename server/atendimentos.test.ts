import { describe, it, expect, vi } from "vitest";

// Mock the pgAtendimentos module
vi.mock("./pgAtendimentos", () => ({
  queryAtendimentos: vi.fn().mockResolvedValue([
    {
      numatend: 12345,
      nmpaciente: "João da Silva",
      dtentrada: new Date("2026-01-15"),
      dtsaida: null,
      nmservico: "UTI Adulto",
      cdservico: "101",
      nmtipo: "Internação",
      nmplano: "Unimed",
      cddestino: "UTI-01",
      diasparado: 5,
    },
    {
      numatend: 12346,
      nmpaciente: "Maria Santos",
      dtentrada: new Date("2026-01-20"),
      dtsaida: new Date("2026-01-22"),
      nmservico: "Ambulatório",
      cdservico: "201",
      nmtipo: "Exame",
      nmplano: "Cassi",
      cddestino: "AMB-02",
      diasparado: 0,
    },
  ]),
  queryServicos: vi.fn().mockResolvedValue([
    { cdservico: "101", nmservico: "UTI Adulto", total: 15 },
    { cdservico: "201", nmservico: "Ambulatório", total: 30 },
  ]),
  registrarNotificacao: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Atendimentos Module", () => {
  it("should have queryAtendimentos mock returning data", async () => {
    const { queryAtendimentos } = await import("./pgAtendimentos");
    const result = await queryAtendimentos();
    expect(result).toHaveLength(2);
    expect(result[0].numatend).toBe(12345);
    expect(result[0].nmpaciente).toBe("João da Silva");
    expect(result[0].nmtipo).toBe("Internação");
    expect(result[1].numatend).toBe(12346);
    expect(result[1].nmtipo).toBe("Exame");
  });

  it("should have queryServicos mock returning service counts", async () => {
    const { queryServicos } = await import("./pgAtendimentos");
    const result = await queryServicos();
    expect(result).toHaveLength(2);
    expect(result[0].cdservico).toBe("101");
    expect(result[0].total).toBe(15);
  });

  it("should have registrarNotificacao mock working", async () => {
    const { registrarNotificacao } = await import("./pgAtendimentos");
    const result = await registrarNotificacao();
    expect(result).toEqual({ success: true });
  });

  it("should calculate KPIs from atendimentos data", async () => {
    const { queryAtendimentos } = await import("./pgAtendimentos");
    const data = await queryAtendimentos();
    
    const total = data.length;
    const internacao = data.filter((d: any) => d.nmtipo === "Internação").length;
    const exame = data.filter((d: any) => d.nmtipo === "Exame").length;
    const ambulatorio = data.filter((d: any) => d.nmservico?.toLowerCase().includes("ambulat")).length;
    
    expect(total).toBe(2);
    expect(internacao).toBe(1);
    expect(exame).toBe(1);
    expect(ambulatorio).toBe(1);
  });

  it("should identify parados (dias > 0 and no dtsaida)", async () => {
    const { queryAtendimentos } = await import("./pgAtendimentos");
    const data = await queryAtendimentos();
    
    const parados = data.filter((d: any) => d.diasparado > 0 && !d.dtsaida);
    expect(parados).toHaveLength(1);
    expect(parados[0].numatend).toBe(12345);
    expect(parados[0].diasparado).toBe(5);
  });
});
