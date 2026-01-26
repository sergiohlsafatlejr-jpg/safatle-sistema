import { describe, it, expect } from "vitest";

// Simular a função tipoLancamentoParaTipoDespesa para teste
// (a função real está no parsers.ts mas não é exportada)
type TipoDespesa = 'gas' | 'medicamento' | 'material' | 'diaria' | 'taxa' | 'procedimento' | 'outros' | undefined;

function tipoLancamentoParaTipoDespesa(tipoLancamento?: string): TipoDespesa {
  if (!tipoLancamento) return undefined;
  
  const tipo = tipoLancamento.toLowerCase().trim();
  
  if (tipo.includes('medicamento') || tipo.includes('medic') || tipo === 'med') {
    return 'medicamento';
  }
  if (tipo.includes('material') || tipo.includes('mat') || tipo === 'mat/med') {
    return 'material';
  }
  if (tipo.includes('diária') || tipo.includes('diaria') || tipo === 'diárias') {
    return 'diaria';
  }
  if (tipo.includes('taxa') || tipo.includes('tx')) {
    return 'taxa';
  }
  if (tipo.includes('gás') || tipo.includes('gas') || tipo.includes('oxigênio') || tipo.includes('oxigenio')) {
    return 'gas';
  }
  if (tipo.includes('procedimento') || tipo.includes('proc') || tipo.includes('honorário') || tipo.includes('honorario')) {
    return 'procedimento';
  }
  if (tipo.includes('exame') || tipo.includes('sadt')) {
    return 'procedimento';
  }
  if (tipo.includes('serviço') || tipo.includes('servico')) {
    return 'procedimento';
  }
  
  return 'outros';
}

describe("tipoLancamentoParaTipoDespesa", () => {
  describe("deve retornar undefined para valores vazios", () => {
    it("retorna undefined para undefined", () => {
      expect(tipoLancamentoParaTipoDespesa(undefined)).toBeUndefined();
    });

    it("retorna undefined para string vazia", () => {
      expect(tipoLancamentoParaTipoDespesa("")).toBeUndefined();
    });
  });

  describe("deve classificar medicamentos corretamente", () => {
    it("classifica 'Medicamento' como medicamento", () => {
      expect(tipoLancamentoParaTipoDespesa("Medicamento")).toBe("medicamento");
    });

    it("classifica 'MEDICAMENTO' como medicamento", () => {
      expect(tipoLancamentoParaTipoDespesa("MEDICAMENTO")).toBe("medicamento");
    });

    it("classifica 'Medic' como medicamento", () => {
      expect(tipoLancamentoParaTipoDespesa("Medic")).toBe("medicamento");
    });

    it("classifica 'med' como medicamento", () => {
      expect(tipoLancamentoParaTipoDespesa("med")).toBe("medicamento");
    });
  });

  describe("deve classificar materiais corretamente", () => {
    it("classifica 'Material' como material", () => {
      expect(tipoLancamentoParaTipoDespesa("Material")).toBe("material");
    });

    it("classifica 'MATERIAL' como material", () => {
      expect(tipoLancamentoParaTipoDespesa("MATERIAL")).toBe("material");
    });

    it("classifica 'Mat' como material", () => {
      expect(tipoLancamentoParaTipoDespesa("Mat")).toBe("material");
    });

    it("classifica 'mat/med' como material", () => {
      expect(tipoLancamentoParaTipoDespesa("mat/med")).toBe("material");
    });
  });

  describe("deve classificar diárias corretamente", () => {
    it("classifica 'Diária' como diaria", () => {
      expect(tipoLancamentoParaTipoDespesa("Diária")).toBe("diaria");
    });

    it("classifica 'Diaria' como diaria", () => {
      expect(tipoLancamentoParaTipoDespesa("Diaria")).toBe("diaria");
    });

    it("classifica 'Diárias' como diaria", () => {
      expect(tipoLancamentoParaTipoDespesa("Diárias")).toBe("diaria");
    });
  });

  describe("deve classificar taxas corretamente", () => {
    it("classifica 'Taxa' como taxa", () => {
      expect(tipoLancamentoParaTipoDespesa("Taxa")).toBe("taxa");
    });

    it("classifica 'TX' como taxa", () => {
      expect(tipoLancamentoParaTipoDespesa("TX")).toBe("taxa");
    });
  });

  describe("deve classificar gases corretamente", () => {
    it("classifica 'Gás' como gas", () => {
      expect(tipoLancamentoParaTipoDespesa("Gás")).toBe("gas");
    });

    it("classifica 'Gas' como gas", () => {
      expect(tipoLancamentoParaTipoDespesa("Gas")).toBe("gas");
    });

    it("classifica 'Oxigênio' como gas", () => {
      expect(tipoLancamentoParaTipoDespesa("Oxigênio")).toBe("gas");
    });

    it("classifica 'Oxigenio' como gas", () => {
      expect(tipoLancamentoParaTipoDespesa("Oxigenio")).toBe("gas");
    });
  });

  describe("deve classificar procedimentos corretamente", () => {
    it("classifica 'Procedimento' como procedimento", () => {
      expect(tipoLancamentoParaTipoDespesa("Procedimento")).toBe("procedimento");
    });

    it("classifica 'Proc' como procedimento", () => {
      expect(tipoLancamentoParaTipoDespesa("Proc")).toBe("procedimento");
    });

    it("classifica 'Honorário' como procedimento", () => {
      expect(tipoLancamentoParaTipoDespesa("Honorário")).toBe("procedimento");
    });

    it("classifica 'Honorario' como procedimento", () => {
      expect(tipoLancamentoParaTipoDespesa("Honorario")).toBe("procedimento");
    });

    it("classifica 'Exame' como procedimento", () => {
      expect(tipoLancamentoParaTipoDespesa("Exame")).toBe("procedimento");
    });

    it("classifica 'SADT' como procedimento", () => {
      expect(tipoLancamentoParaTipoDespesa("SADT")).toBe("procedimento");
    });

    it("classifica 'Serviço' como procedimento", () => {
      expect(tipoLancamentoParaTipoDespesa("Serviço")).toBe("procedimento");
    });
  });

  describe("deve classificar tipos desconhecidos como outros", () => {
    it("classifica 'Desconhecido' como outros", () => {
      expect(tipoLancamentoParaTipoDespesa("Desconhecido")).toBe("outros");
    });

    it("classifica 'XYZ' como outros", () => {
      expect(tipoLancamentoParaTipoDespesa("XYZ")).toBe("outros");
    });
  });

  describe("deve lidar com espaços em branco", () => {
    it("classifica '  Medicamento  ' como medicamento", () => {
      expect(tipoLancamentoParaTipoDespesa("  Medicamento  ")).toBe("medicamento");
    });

    it("classifica '  Material  ' como material", () => {
      expect(tipoLancamentoParaTipoDespesa("  Material  ")).toBe("material");
    });
  });
});
