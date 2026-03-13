import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
const mockExecute = vi.fn();
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: (...args: any[]) => mockExecute(...args),
  }),
}));

import { buscarRelatorioFaturamento } from "./relatorioFaturamento";

describe("relatorioFaturamento - buscarRelatorioFaturamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue([[]]);
  });

  it("deve retornar estrutura completa mesmo sem dados", async () => {
    // Mock: acumulado atual
    mockExecute.mockResolvedValueOnce([[{ total_faturado: 0, qtd_contas: 0 }]]);
    // Mock: acumulado anterior
    mockExecute.mockResolvedValueOnce([[{ total_faturado: 0, qtd_contas: 0 }]]);
    // Mock: por setor
    mockExecute.mockResolvedValueOnce([[]]);
    // Mock: por mês
    mockExecute.mockResolvedValueOnce([[]]);
    // Mock: por tipo atendimento
    mockExecute.mockResolvedValueOnce([[]]);
    // Mock: por convênio
    mockExecute.mockResolvedValueOnce([[]]);
    // Mock: mês atual tabela comparativa
    mockExecute.mockResolvedValueOnce([[]]);
    // Mock: mês anterior tabela comparativa
    mockExecute.mockResolvedValueOnce([[]]);

    const result = await buscarRelatorioFaturamento({
      estabelecimentoId: 1,
      anoAtual: 2025,
      anoAnterior: 2024,
    });

    expect(result).toHaveProperty("acumulado");
    expect(result).toHaveProperty("porSetor");
    expect(result).toHaveProperty("porMes");
    expect(result).toHaveProperty("porTipoAtendimento");
    expect(result).toHaveProperty("porConvenio");
    expect(result).toHaveProperty("tabelaComparativa");
    expect(result.tabelaComparativa).toHaveLength(12);
    expect(result.acumulado.anoAtual).toBe(2025);
    expect(result.acumulado.anoAnterior).toBe(2024);
  });

  it("deve calcular variação percentual corretamente", async () => {
    // Mock: acumulado atual = 200000
    mockExecute.mockResolvedValueOnce([[{ total_faturado: "200000.00", qtd_contas: 50 }]]);
    // Mock: acumulado anterior = 150000
    mockExecute.mockResolvedValueOnce([[{ total_faturado: "150000.00", qtd_contas: 40 }]]);
    // Mock: demais queries
    mockExecute.mockResolvedValueOnce([[]]); // setor
    mockExecute.mockResolvedValueOnce([[]]); // mes
    mockExecute.mockResolvedValueOnce([[]]); // tipo
    mockExecute.mockResolvedValueOnce([[]]); // convenio
    mockExecute.mockResolvedValueOnce([[]]); // mes atual comparativa
    mockExecute.mockResolvedValueOnce([[]]); // mes anterior comparativa

    const result = await buscarRelatorioFaturamento({
      estabelecimentoId: 1,
      anoAtual: 2025,
      anoAnterior: 2024,
    });

    expect(result.acumulado.totalFaturadoAtual).toBe(200000);
    expect(result.acumulado.totalFaturadoAnterior).toBe(150000);
    // (200000 - 150000) / 150000 * 100 = 33.33%
    expect(result.acumulado.variacaoPercentual).toBeCloseTo(33.33, 1);
    expect(result.acumulado.qtdContasAtual).toBe(50);
    expect(result.acumulado.qtdContasAnterior).toBe(40);
  });

  it("deve processar dados por setor com percentuais", async () => {
    // Mock: acumulado atual = 100000
    mockExecute.mockResolvedValueOnce([[{ total_faturado: "100000.00", qtd_contas: 30 }]]);
    // Mock: acumulado anterior
    mockExecute.mockResolvedValueOnce([[{ total_faturado: "80000.00", qtd_contas: 25 }]]);
    // Mock: por setor
    mockExecute.mockResolvedValueOnce([[
      { setor: "UTI ADULTO", total_faturado: "60000.00", qtd_contas: 15 },
      { setor: "CENTRO CIRURGICO", total_faturado: "40000.00", qtd_contas: 15 },
    ]]);
    // Mock: demais queries
    mockExecute.mockResolvedValueOnce([[]]); // mes
    mockExecute.mockResolvedValueOnce([[]]); // tipo
    mockExecute.mockResolvedValueOnce([[]]); // convenio
    mockExecute.mockResolvedValueOnce([[]]); // mes atual
    mockExecute.mockResolvedValueOnce([[]]); // mes anterior

    const result = await buscarRelatorioFaturamento({
      estabelecimentoId: 1,
      anoAtual: 2025,
      anoAnterior: 2024,
    });

    expect(result.porSetor).toHaveLength(2);
    expect(result.porSetor[0].setor).toBe("UTI ADULTO");
    expect(result.porSetor[0].totalFaturado).toBe(60000);
    expect(result.porSetor[0].percentual).toBe(60);
    expect(result.porSetor[1].percentual).toBe(40);
  });

  it("deve gerar tabela comparativa com 12 meses", async () => {
    // Mock: acumulados
    mockExecute.mockResolvedValueOnce([[{ total_faturado: "500000.00", qtd_contas: 100 }]]);
    mockExecute.mockResolvedValueOnce([[{ total_faturado: "400000.00", qtd_contas: 80 }]]);
    // Mock: setor, mes, tipo, convenio
    mockExecute.mockResolvedValueOnce([[]]);
    mockExecute.mockResolvedValueOnce([[]]);
    mockExecute.mockResolvedValueOnce([[]]);
    mockExecute.mockResolvedValueOnce([[]]);
    // Mock: mês atual tabela comparativa
    mockExecute.mockResolvedValueOnce([[
      { mes_num: "01", total_faturado: "50000.00", qtd_contas: 10 },
      { mes_num: "02", total_faturado: "45000.00", qtd_contas: 9 },
    ]]);
    // Mock: mês anterior tabela comparativa
    mockExecute.mockResolvedValueOnce([[
      { mes_num: "01", total_faturado: "40000.00", qtd_contas: 8 },
      { mes_num: "02", total_faturado: "35000.00", qtd_contas: 7 },
    ]]);

    const result = await buscarRelatorioFaturamento({
      estabelecimentoId: 1,
      anoAtual: 2025,
      anoAnterior: 2024,
    });

    expect(result.tabelaComparativa).toHaveLength(12);
    
    // Janeiro
    expect(result.tabelaComparativa[0].mesNome).toBe("Janeiro");
    expect(result.tabelaComparativa[0].faturadoAtual).toBe(50000);
    expect(result.tabelaComparativa[0].faturadoAnterior).toBe(40000);
    // (50000 - 40000) / 40000 * 100 = 25%
    expect(result.tabelaComparativa[0].variacao).toBe(25);
    
    // Fevereiro
    expect(result.tabelaComparativa[1].mesNome).toBe("Fevereiro");
    expect(result.tabelaComparativa[1].faturadoAtual).toBe(45000);
    expect(result.tabelaComparativa[1].faturadoAnterior).toBe(35000);
    
    // Meses sem dados
    expect(result.tabelaComparativa[2].faturadoAtual).toBe(0);
    expect(result.tabelaComparativa[2].faturadoAnterior).toBe(0);
  });

  it("deve usar ano corrente como padrão quando não informado", async () => {
    const anoCorrente = new Date().getFullYear();
    
    // Mock: 8 queries
    for (let i = 0; i < 8; i++) {
      if (i < 2) {
        mockExecute.mockResolvedValueOnce([[{ total_faturado: "0", qtd_contas: 0 }]]);
      } else {
        mockExecute.mockResolvedValueOnce([[]]);
      }
    }

    const result = await buscarRelatorioFaturamento({
      estabelecimentoId: 1,
    });

    expect(result.acumulado.anoAtual).toBe(anoCorrente);
    expect(result.acumulado.anoAnterior).toBe(anoCorrente - 1);
    
    // Verify queries used correct year prefix
    const firstCall = JSON.stringify(mockExecute.mock.calls[0][0]);
    expect(firstCall).toContain(`${anoCorrente}/`);
  });

  it("deve processar tipos de atendimento com descrições", async () => {
    // Mock: acumulados
    mockExecute.mockResolvedValueOnce([[{ total_faturado: "100000.00", qtd_contas: 30 }]]);
    mockExecute.mockResolvedValueOnce([[{ total_faturado: "80000.00", qtd_contas: 25 }]]);
    // Mock: setor
    mockExecute.mockResolvedValueOnce([[]]);
    // Mock: mes
    mockExecute.mockResolvedValueOnce([[]]);
    // Mock: tipo atendimento
    mockExecute.mockResolvedValueOnce([[
      { tipo: "I", total_faturado: "70000.00", qtd_contas: 20 },
      { tipo: "A", total_faturado: "30000.00", qtd_contas: 10 },
    ]]);
    // Mock: convenio
    mockExecute.mockResolvedValueOnce([[]]);
    // Mock: comparativa
    mockExecute.mockResolvedValueOnce([[]]);
    mockExecute.mockResolvedValueOnce([[]]);

    const result = await buscarRelatorioFaturamento({
      estabelecimentoId: 1,
      anoAtual: 2025,
      anoAnterior: 2024,
    });

    expect(result.porTipoAtendimento).toHaveLength(2);
    expect(result.porTipoAtendimento[0].tipo).toBe("I");
    expect(result.porTipoAtendimento[0].tipoDescricao).toBe("Internação");
    expect(result.porTipoAtendimento[1].tipo).toBe("A");
    expect(result.porTipoAtendimento[1].tipoDescricao).toBe("Ambulatorial");
    expect(result.porTipoAtendimento[0].percentual).toBe(70);
  });

  it("deve lançar erro quando database não disponível", async () => {
    const { getDb } = await import("./db");
    (getDb as any).mockResolvedValueOnce(null);

    await expect(
      buscarRelatorioFaturamento({ estabelecimentoId: 1 })
    ).rejects.toThrow("Database não disponível");
  });
});
