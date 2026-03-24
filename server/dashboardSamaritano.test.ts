import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
const mockExecute = vi.fn();
vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    execute: mockExecute,
  })),
}));

import { buscarDashboardSamaritano } from "./dashboardSamaritano";

describe("dashboardSamaritano", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar estrutura completa do dashboard", async () => {
    // Mock KPIs
    mockExecute.mockResolvedValueOnce([[{
      total_registros: "118703",
      total_convenios: "19",
      total_setores: "9",
      total_contas: "8049",
      total_itens_unicos: "1200",
      total_faturado: "2735950.21",
      total_custo: "1227504.25",
      total_vlcusto: "0",
      margem: "1508445.96",
    }], []]);

    // Mock evolução mensal
    mockExecute.mockResolvedValueOnce([[
      { competencia: "2025/12", total_registros: "11729", total_contas: "851", faturado: "407867.43", custo: "152885.81", vlcusto: "0", margem: "254981.62" },
      { competencia: "2026/01", total_registros: "43790", total_contas: "2797", faturado: "1169578.89", custo: "537248.26", vlcusto: "0", margem: "632330.63" },
    ], []]);

    // Mock top convênios
    mockExecute.mockResolvedValueOnce([[
      { convenio: "IPASGO NOVO", codplaco: "IPN", total_contas: "5000", faturado: "1678130.67", custo: "884572.21", vlcusto: "0" },
      { convenio: "UNIMED GOIANIA", codplaco: "UNI", total_contas: "1500", faturado: "404845.83", custo: "164716.07", vlcusto: "0" },
    ], []]);

    // Mock evolução por convênio
    mockExecute.mockResolvedValueOnce([[
      { competencia: "2025/12", convenio: "IPASGO NOVO", codplaco: "IPN", faturado: "260483.24", custo: "115544.94" },
      { competencia: "2026/01", convenio: "IPASGO NOVO", codplaco: "IPN", faturado: "783379.41", custo: "419564.69" },
    ], []]);

    // Mock top setores
    mockExecute.mockResolvedValueOnce([[
      { setor: "Internação Cirúrgica", total_contas: "2000", total_itens: "500", faturado: "1200000.00", custo: "600000.00", vlcusto: "0" },
      { setor: "Internação Clínica", total_contas: "1500", total_itens: "400", faturado: "800000.00", custo: "400000.00", vlcusto: "0" },
    ], []]);

    // Mock evolução por setor
    mockExecute.mockResolvedValueOnce([[
      { competencia: "2025/12", setor: "Internação Cirúrgica", faturado: "300000.00", custo: "150000.00" },
    ], []]);

    // Mock distribuição tipo item
    mockExecute.mockResolvedValueOnce([[
      { tipo: "IC", faturado: "800000.00", custo: "400000.00", total_registros: "40000" },
      { tipo: "IG", faturado: "600000.00", custo: "300000.00", total_registros: "30000" },
    ], []]);

    // Mock competências disponíveis
    mockExecute.mockResolvedValueOnce([[
      { competencia: "2026/03" },
      { competencia: "2026/02" },
      { competencia: "2026/01" },
      { competencia: "2025/12" },
    ], []]);

    // Mock convênios disponíveis
    mockExecute.mockResolvedValueOnce([[
      { convenio: "IPASGO NOVO", codplaco: "IPN" },
      { convenio: "UNIMED GOIANIA", codplaco: "UNI" },
    ], []]);

    const result = await buscarDashboardSamaritano(2280016, {});

    expect(result).toHaveProperty("kpis");
    expect(result).toHaveProperty("evolucaoMensal");
    expect(result).toHaveProperty("topConvenios");
    expect(result).toHaveProperty("topSetores");
    expect(result).toHaveProperty("evolucaoPorConvenio");
    expect(result).toHaveProperty("evolucaoPorSetor");
    expect(result).toHaveProperty("distribuicaoTipoItem");
    expect(result).toHaveProperty("competenciasDisponiveis");
    expect(result).toHaveProperty("conveniosDisponiveis");
    expect(result.fonte).toBe("samaritano_custo_staging");

    // Verificar KPIs
    expect(result.kpis.totalRegistros).toBe(118703);
    expect(result.kpis.totalConvenios).toBe(19);
    expect(result.kpis.totalSetores).toBe(9);
    expect(result.kpis.totalFaturado).toBeGreaterThan(0);
    expect(result.kpis.totalCusto).toBeGreaterThan(0);
    expect(result.kpis.margem).toBeGreaterThan(0);
    expect(result.kpis.margemPercent).toBeGreaterThan(0);
    expect(result.kpis.ticketMedio).toBeGreaterThan(0);

    // Verificar evolução mensal
    expect(result.evolucaoMensal).toHaveLength(2);
    expect(result.evolucaoMensal[0].competencia).toBe("2025/12");

    // Verificar top convênios
    expect(result.topConvenios).toHaveLength(2);
    expect(result.topConvenios[0].convenio).toBe("IPASGO NOVO");

    // Verificar top setores
    expect(result.topSetores).toHaveLength(2);
    expect(result.topSetores[0].setor).toBe("Internação Cirúrgica");

    // Verificar competências e convênios disponíveis
    expect(result.competenciasDisponiveis).toHaveLength(4);
    expect(result.conveniosDisponiveis).toHaveLength(2);
  });

  it("deve aplicar filtro de competência nas queries", async () => {
    // Todos os mocks retornam arrays vazios
    for (let i = 0; i < 9; i++) {
      mockExecute.mockResolvedValueOnce([[], []]);
    }

    await buscarDashboardSamaritano(2280016, { competencia: "2026/01" });

    // Verificar que o execute foi chamado (9 queries no dashboard)
    expect(mockExecute).toHaveBeenCalled();
    // Verificar que a primeira query contém o filtro de competência
    const firstCallArg = mockExecute.mock.calls[0][0];
    const sqlStr = JSON.stringify(firstCallArg);
    expect(sqlStr).toContain("2026/01");
  });

  it("deve aplicar filtro de convênio nas queries", async () => {
    for (let i = 0; i < 9; i++) {
      mockExecute.mockResolvedValueOnce([[], []]);
    }

    await buscarDashboardSamaritano(2280016, { convenio: "IPN" });

    expect(mockExecute).toHaveBeenCalled();
    const firstCallArg = mockExecute.mock.calls[0][0];
    const sqlStr = JSON.stringify(firstCallArg);
    expect(sqlStr).toContain("IPN");
  });

  it("deve calcular margem percentual corretamente", async () => {
    mockExecute.mockResolvedValueOnce([[{
      total_registros: "100",
      total_convenios: "2",
      total_setores: "1",
      total_contas: "10",
      total_itens_unicos: "50",
      total_faturado: "1000.00",
      total_custo: "800.00",
      total_vlcusto: "0",
      margem: "200.00",
    }], []]);

    // Restantes mocks vazios
    for (let i = 0; i < 8; i++) {
      mockExecute.mockResolvedValueOnce([[], []]);
    }

    const result = await buscarDashboardSamaritano(2280016, {});

    expect(result.kpis.totalFaturado).toBe(1000);
    expect(result.kpis.totalCusto).toBe(800);
    expect(result.kpis.margem).toBe(200);
    // Margem % = (200 / 800) * 100 = 25%
    expect(result.kpis.margemPercent).toBe(25);
    // Ticket médio = 1000 / 10 = 100
    expect(result.kpis.ticketMedio).toBe(100);
  });

  it("deve lançar erro quando banco indisponível", async () => {
    const { getDb } = await import("./db");
    (getDb as any).mockResolvedValueOnce(null);

    await expect(buscarDashboardSamaritano(2280016, {})).rejects.toThrow("Banco de dados indisponível");
  });
});
