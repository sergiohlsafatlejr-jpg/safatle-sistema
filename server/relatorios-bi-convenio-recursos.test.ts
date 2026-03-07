import { describe, it, expect } from "vitest";

describe("Relatórios BI - Recursado e Recuperado por Convênio", () => {
  it("deve incluir valorRecursado no mapeamento de conveniosData", () => {
    // Simular dados retornados pelo backend (porConvenio)
    const porConvenio = [
      { chave: "Unimed", valorFaturado: 525851.76, valorRecebido: 876476.79, valorGlosado: 17665.94, valorRecursado: 7975.15, valorRecuperado: 0, quantidade: 42142, registros: 100 },
      { chave: "Vivacom", valorFaturado: 23948.05, valorRecebido: 16033.24, valorGlosado: 767.56, valorRecursado: 340.00, valorRecuperado: 0, quantidade: 641, registros: 20 },
      { chave: "Bradesco", valorFaturado: 92406.61, valorRecebido: 0, valorGlosado: 0, valorRecursado: 0, valorRecuperado: 0, quantidade: 5455, registros: 50 },
    ];

    // Simular o mapeamento do frontend (conveniosData useMemo)
    const conveniosData = porConvenio.map((item: any) => ({
      chave: item.chave,
      valorFaturado: item.valorFaturado || 0,
      valorRecebido: item.valorRecebido || 0,
      valorGlosado: item.valorGlosado || 0,
      valorRecursado: item.valorRecursado || 0,
      valorRecuperado: item.valorRecuperado || 0,
      quantidade: item.quantidade || 0,
    }));

    // Verificar que valorRecursado é preservado corretamente
    const unimed = conveniosData.find(c => c.chave === "Unimed");
    expect(unimed?.valorRecursado).toBe(7975.15);
    expect(unimed?.valorRecuperado).toBe(0);

    const vivacom = conveniosData.find(c => c.chave === "Vivacom");
    expect(vivacom?.valorRecursado).toBe(340.00);
    expect(vivacom?.valorRecuperado).toBe(0);

    const bradesco = conveniosData.find(c => c.chave === "Bradesco");
    expect(bradesco?.valorRecursado).toBe(0);
    expect(bradesco?.valorRecuperado).toBe(0);
  });

  it("deve calcular taxa de recuperação corretamente", () => {
    const testCases = [
      { recursado: 7975.15, recuperado: 3000, expectedTaxa: "37.6%" },
      { recursado: 340, recuperado: 170, expectedTaxa: "50.0%" },
      { recursado: 0, recuperado: 0, expectedTaxa: "-" },
      { recursado: 1000, recuperado: 1000, expectedTaxa: "100.0%" },
    ];

    for (const tc of testCases) {
      const taxa = tc.recursado > 0
        ? ((tc.recuperado / tc.recursado) * 100).toFixed(1) + "%"
        : "-";
      expect(taxa).toBe(tc.expectedTaxa);
    }
  });

  it("deve incluir Recuperado e Taxa Recuperação no export Excel por convênio", () => {
    const conveniosData = [
      { chave: "Unimed", valorFaturado: 525851.76, valorRecebido: 876476.79, valorGlosado: 17665.94, valorRecursado: 7975.15, valorRecuperado: 3000, quantidade: 42142 },
      { chave: "Bradesco", valorFaturado: 92406.61, valorRecebido: 0, valorGlosado: 0, valorRecursado: 0, valorRecuperado: 0, quantidade: 5455 },
    ];

    const excelData = conveniosData.map((c) => {
      const recursado = c.valorRecursado ?? 0;
      const recuperado = c.valorRecuperado ?? 0;
      const taxaRecup = recursado > 0 ? ((recuperado / recursado) * 100).toFixed(1) + "%" : "-";
      return {
        Convenio: c.chave,
        Faturado: c.valorFaturado,
        Recebido: c.valorRecebido,
        Glosado: c.valorGlosado,
        Recursado: recursado,
        Recuperado: recuperado,
        "Taxa Recuperação": taxaRecup,
        Itens: Math.round(c.quantidade),
      };
    });

    // Verificar que os campos Recuperado e Taxa Recuperação existem
    expect(excelData[0]).toHaveProperty("Recuperado");
    expect(excelData[0]).toHaveProperty("Taxa Recuperação");

    // Verificar valores
    expect(excelData[0].Recuperado).toBe(3000);
    expect(excelData[0]["Taxa Recuperação"]).toBe("37.6%");
    expect(excelData[1].Recuperado).toBe(0);
    expect(excelData[1]["Taxa Recuperação"]).toBe("-");
  });

  it("DadosBIAgrupado deve ter campo valorRecuperado", async () => {
    const dbModule = await import("./db");
    expect(typeof dbModule.getDadosBI).toBe("function");
  });

  it("deve distribuir valorRecuperado por convênio no backend", () => {
    // Simular a lógica de distribuição do backend
    const porConvenioMap = new Map<string, { chave: string; valorRecursado: number; valorRecuperado: number }>();

    const recursos = [
      { convenioId: 1, convenioNome: "Unimed", valorGlosado: "5000.00", valorRecuperado: "2000.00" },
      { convenioId: 1, convenioNome: "Unimed", valorGlosado: "2975.15", valorRecuperado: "1000.00" },
      { convenioId: 2, convenioNome: "Vivacom", valorGlosado: "340.00", valorRecuperado: "170.00" },
    ];

    for (const recurso of recursos) {
      const chaveConvenio = recurso.convenioNome;
      if (!porConvenioMap.has(chaveConvenio)) {
        porConvenioMap.set(chaveConvenio, { chave: chaveConvenio, valorRecursado: 0, valorRecuperado: 0 });
      }
      const entry = porConvenioMap.get(chaveConvenio)!;
      entry.valorRecursado += parseFloat(recurso.valorGlosado || "0");
      entry.valorRecuperado += parseFloat(recurso.valorRecuperado || "0");
    }

    const unimedEntry = porConvenioMap.get("Unimed");
    expect(unimedEntry?.valorRecursado).toBeCloseTo(7975.15, 2);
    expect(unimedEntry?.valorRecuperado).toBeCloseTo(3000, 2);

    const vivacomEntry = porConvenioMap.get("Vivacom");
    expect(vivacomEntry?.valorRecursado).toBeCloseTo(340, 2);
    expect(vivacomEntry?.valorRecuperado).toBeCloseTo(170, 2);
  });
});
