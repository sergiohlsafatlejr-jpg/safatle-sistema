import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pg module before importing the service
const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn().mockResolvedValue({ query: mockQuery, release: mockRelease });

vi.mock("pg", () => ({
  default: {
    Pool: vi.fn().mockImplementation(() => ({
      connect: mockConnect,
    })),
  },
}));

// Mock ENV
vi.mock("./_core/env", () => ({
  ENV: {
    warleineDbHost: "localhost",
    warleineDbPort: "5432",
    warleineDbName: "testdb",
    warleineDbUser: "user",
    warleineDbPassword: "pass",
  },
}));

// Mock getDb to return null (force PostgreSQL fallback)
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

/**
 * Helper: create mock results for the 17 parallel queries in buscarMetricasAvancadasDoPostgresql.
 * Order:
 *  0  permanência (rows with datatend/datasai)
 *  1  turnos (single row with manha/tarde/noite/madrugada)
 *  2  emergências total
 *  3  convertidos total
 *  4  emergências mensal
 *  5  convertidos mensal
 *  6  caráter
 *  7  internações atual
 *  8  ambulatoriais atual
 *  9  emergências atual
 * 10  urgências atual
 * 11  procedimentos atual
 * 12  internações anterior
 * 13  ambulatoriais anterior
 * 14  emergências anterior
 * 15  urgências anterior
 * 16  procedimentos anterior
 */
function mockAllMetricasAvancadasQueries(overrides: Partial<Record<number, { rows: any[] }>> = {}) {
  const defaults: Array<{ rows: any[] }> = [
    // 0 permanência
    { rows: [
      { datatend: "2025-03-01T08:00:00", datasai: "2025-03-05T10:00:00" },
      { datatend: "2025-04-10T10:00:00", datasai: "2025-04-13T14:00:00" },
    ] },
    // 1 turnos
    { rows: [{ manha: "120", tarde: "200", noite: "80", madrugada: "30" }] },
    // 2 emergências total
    { rows: [{ total: "150" }] },
    // 3 convertidos total
    { rows: [{ total: "18" }] },
    // 4 emergências mensal
    { rows: [
      { mes_ano: "2025-01", total: "50" },
      { mes_ano: "2025-02", total: "60" },
      { mes_ano: "2025-03", total: "40" },
    ] },
    // 5 convertidos mensal
    { rows: [
      { mes_ano: "2025-01", total: "5" },
      { mes_ano: "2025-02", total: "8" },
      { mes_ano: "2025-03", total: "5" },
    ] },
    // 6 caráter
    { rows: [
      { nome: "Eletivo", total: "300" },
      { nome: "Urgência", total: "130" },
    ] },
    // 7-11 comparativo atual
    { rows: [{ total: "100" }] },  // internações
    { rows: [{ total: "200" }] },  // ambulatoriais
    { rows: [{ total: "150" }] },  // emergências
    { rows: [{ total: "80" }] },   // urgências
    { rows: [{ total: "45" }] },   // procedimentos
    // 12-16 comparativo anterior
    { rows: [{ total: "90" }] },
    { rows: [{ total: "180" }] },
    { rows: [{ total: "120" }] },
    { rows: [{ total: "70" }] },
    { rows: [{ total: "40" }] },
  ];

  for (let i = 0; i < defaults.length; i++) {
    mockQuery.mockResolvedValueOnce(overrides[i] || defaults[i]);
  }
}

describe("buscarMetricasAvancadas - Fallback PostgreSQL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease });
  });

  it("deve retornar métricas avançadas completas via PostgreSQL", async () => {
    const { buscarMetricasAvancadas } = await import("./relatorioAtendimentos");

    mockAllMetricasAvancadasQueries();

    const result = await buscarMetricasAvancadas({
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
    });

    // Média de permanência
    expect(result.totalInternacoes).toBe(2);
    expect(result.mediaPermanenciaDias).toBeGreaterThan(0);
    // 4 dias + 3 dias ≈ 3.5 (com horas extras)
    expect(result.mediaPermanenciaDias).toBeGreaterThanOrEqual(3);
    expect(result.mediaPermanenciaDias).toBeLessThanOrEqual(5);

    // Turnos
    expect(result.porTurno.manha).toBe(120);
    expect(result.porTurno.tarde).toBe(200);
    expect(result.porTurno.noite).toBe(80);
    expect(result.porTurno.madrugada).toBe(30);
    expect(result.porTurno.total).toBe(430);

    // Taxa de conversão
    expect(result.taxaConversao.totalEmergencias).toBe(150);
    expect(result.taxaConversao.totalConvertidos).toBe(18);
    expect(result.taxaConversao.taxa).toBe(12.0);

    // Evolução mensal
    expect(result.taxaConversao.evolucaoMensal).toHaveLength(3);
    expect(result.taxaConversao.evolucaoMensal[0].mesAno).toBe("2025-01");
    expect(result.taxaConversao.evolucaoMensal[0].emergencias).toBe(50);
    expect(result.taxaConversao.evolucaoMensal[0].convertidos).toBe(5);
    expect(result.taxaConversao.evolucaoMensal[0].taxa).toBe(10.0);

    // Caráter
    expect(result.porCarater).toHaveLength(2);
    expect(result.porCarater[0].nome).toBe("Eletivo");
    expect(result.porCarater[0].total).toBe(300);
    expect(result.porCarater[1].nome).toBe("Urgência");
    expect(result.porCarater[1].total).toBe(130);

    // Comparativo detalhado
    expect(result.comparativoDetalhado.periodoAtual.internacoes).toBe(100);
    expect(result.comparativoDetalhado.periodoAtual.ambulatoriais).toBe(200);
    expect(result.comparativoDetalhado.periodoAtual.emergencias).toBe(150);
    expect(result.comparativoDetalhado.periodoAtual.urgencias).toBe(80);
    expect(result.comparativoDetalhado.periodoAtual.procedimentos).toBe(45);

    expect(result.comparativoDetalhado.periodoAnterior.internacoes).toBe(90);
    expect(result.comparativoDetalhado.periodoAnterior.ambulatoriais).toBe(180);
    expect(result.comparativoDetalhado.periodoAnterior.emergencias).toBe(120);
    expect(result.comparativoDetalhado.periodoAnterior.urgencias).toBe(70);
    expect(result.comparativoDetalhado.periodoAnterior.procedimentos).toBe(40);

    expect(result.fonte).toBe("postgresql_direto");
    expect(mockRelease).toHaveBeenCalled();
  });

  it("deve retornar permanência zero quando não há internações", async () => {
    const { buscarMetricasAvancadas } = await import("./relatorioAtendimentos");

    mockAllMetricasAvancadasQueries({
      0: { rows: [] }, // sem internações
    });

    const result = await buscarMetricasAvancadas({
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
    });

    expect(result.mediaPermanenciaDias).toBe(0);
    expect(result.totalInternacoes).toBe(0);
  });

  it("deve retornar taxa de conversão zero quando não há emergências", async () => {
    const { buscarMetricasAvancadas } = await import("./relatorioAtendimentos");

    mockAllMetricasAvancadasQueries({
      2: { rows: [{ total: "0" }] },
      3: { rows: [{ total: "0" }] },
      4: { rows: [] },
      5: { rows: [] },
    });

    const result = await buscarMetricasAvancadas({
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
    });

    expect(result.taxaConversao.totalEmergencias).toBe(0);
    expect(result.taxaConversao.totalConvertidos).toBe(0);
    expect(result.taxaConversao.taxa).toBe(0);
    expect(result.taxaConversao.evolucaoMensal).toHaveLength(0);
  });

  it("deve retornar valores zerados para turnos quando não há dados", async () => {
    const { buscarMetricasAvancadas } = await import("./relatorioAtendimentos");

    mockAllMetricasAvancadasQueries({
      1: { rows: [{ manha: "0", tarde: "0", noite: "0", madrugada: "0" }] },
    });

    const result = await buscarMetricasAvancadas({
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
    });

    expect(result.porTurno.manha).toBe(0);
    expect(result.porTurno.tarde).toBe(0);
    expect(result.porTurno.noite).toBe(0);
    expect(result.porTurno.madrugada).toBe(0);
    expect(result.porTurno.total).toBe(0);
  });

  it("deve liberar a conexão mesmo em caso de erro", async () => {
    const { buscarMetricasAvancadas } = await import("./relatorioAtendimentos");

    mockQuery.mockRejectedValueOnce(new Error("Database error"));

    await expect(
      buscarMetricasAvancadas({
        dataInicio: "2025-01-01",
        dataFim: "2025-12-31",
      })
    ).rejects.toThrow("Database error");

    expect(mockRelease).toHaveBeenCalled();
  });

  it("deve retornar caráter vazio quando não há dados de caráter", async () => {
    const { buscarMetricasAvancadas } = await import("./relatorioAtendimentos");

    mockAllMetricasAvancadasQueries({
      6: { rows: [] },
    });

    const result = await buscarMetricasAvancadas({
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
    });

    expect(result.porCarater).toHaveLength(0);
  });

  it("deve aplicar filtros opcionais na query PostgreSQL", async () => {
    const { buscarMetricasAvancadas } = await import("./relatorioAtendimentos");

    mockAllMetricasAvancadasQueries();

    await buscarMetricasAvancadas({
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
      tipoAtendimento: "I",
      codPlaco: "001",
      codPrest: "P01",
      codServ: "01",
    });

    // Verificar que os filtros foram passados como parâmetros
    // A primeira query (permanência) deve ter dataInicio, dataFim + 4 filtros = 6 params
    const firstCall = mockQuery.mock.calls[0];
    expect(firstCall[1]).toContain("I");
    expect(firstCall[1]).toContain("001");
    expect(firstCall[1]).toContain("P01");
    expect(firstCall[1]).toContain("01");
    expect(firstCall[1]).toHaveLength(6);

    expect(mockRelease).toHaveBeenCalled();
  });

  it("deve calcular evolução mensal corretamente com meses diferentes entre emergências e convertidos", async () => {
    const { buscarMetricasAvancadas } = await import("./relatorioAtendimentos");

    mockAllMetricasAvancadasQueries({
      4: { rows: [
        { mes_ano: "2025-01", total: "40" },
        { mes_ano: "2025-03", total: "60" },
      ] },
      5: { rows: [
        { mes_ano: "2025-02", total: "3" },
        { mes_ano: "2025-03", total: "10" },
      ] },
    });

    const result = await buscarMetricasAvancadas({
      dataInicio: "2025-01-01",
      dataFim: "2025-12-31",
    });

    // Deve ter 3 meses: 2025-01, 2025-02, 2025-03
    expect(result.taxaConversao.evolucaoMensal).toHaveLength(3);
    
    // 2025-01: 40 emergências, 0 convertidos
    const jan = result.taxaConversao.evolucaoMensal.find(e => e.mesAno === "2025-01");
    expect(jan?.emergencias).toBe(40);
    expect(jan?.convertidos).toBe(0);
    expect(jan?.taxa).toBe(0);

    // 2025-02: 0 emergências, 3 convertidos
    const fev = result.taxaConversao.evolucaoMensal.find(e => e.mesAno === "2025-02");
    expect(fev?.emergencias).toBe(0);
    expect(fev?.convertidos).toBe(3);
    expect(fev?.taxa).toBe(0); // 0 emergências = 0 taxa

    // 2025-03: 60 emergências, 10 convertidos = 16.7%
    const mar = result.taxaConversao.evolucaoMensal.find(e => e.mesAno === "2025-03");
    expect(mar?.emergencias).toBe(60);
    expect(mar?.convertidos).toBe(10);
    expect(mar?.taxa).toBe(16.7);
  });
});
