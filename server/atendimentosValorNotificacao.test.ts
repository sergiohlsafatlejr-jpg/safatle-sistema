import { describe, it, expect } from "vitest";

/**
 * Testes para as novas funcionalidades de Atendimentos:
 * 1. KPI "Valor Total" - soma do valorConta
 * 2. Coluna "Valor Conta" - formatação de moeda
 * 3. Badge "Notificado" - detecção de atendimentos notificados
 */

// Simular dados de atendimentos como retornados pela procedure
const mockAtendimentos = [
  {
    numatend: "1001",
    nomepac: "João Silva",
    nomeplaco: "Unimed",
    datatend: "2025-01-15T00:00:00.000Z",
    datasai: null,
    diasParado: 30,
    tipoatendimentodescricao: "Internação",
    codserv: "101",
    codcc_destino: "UTI-01",
    motivo: "medico",
    origemSistema: "tasy",
    tipoatend: "Internado",
    valorConta: "15000.50",
    nomeProtocolo: null,
    etapaConta: "Auditoria",
  },
  {
    numatend: "1002",
    nomepac: "Maria Santos",
    nomeplaco: "Cassi",
    datatend: "2025-02-01T00:00:00.000Z",
    datasai: "2025-02-05T00:00:00.000Z",
    diasParado: 10,
    tipoatendimentodescricao: "Pronto Socorro",
    codserv: "201",
    codcc_destino: "PS-01",
    motivo: null,
    origemSistema: "tasy",
    tipoatend: "Pronto Socorro",
    valorConta: "8500.00",
    nomeProtocolo: null,
    etapaConta: "Faturamento",
  },
  {
    numatend: "1003",
    nomepac: "Pedro Oliveira",
    nomeplaco: "Bradesco",
    datatend: "2025-03-01T00:00:00.000Z",
    datasai: null,
    diasParado: 5,
    tipoatendimentodescricao: "Ambulatorial",
    codserv: "301",
    codcc_destino: "AMB-01",
    motivo: "enfermagem",
    origemSistema: "tasy",
    tipoatend: "Ambulatorial",
    valorConta: "",
    nomeProtocolo: null,
    etapaConta: "Auditoria",
  },
  {
    numatend: "1004",
    nomepac: "Ana Costa",
    nomeplaco: "Unimed",
    datatend: "2025-03-10T00:00:00.000Z",
    datasai: null,
    diasParado: 2,
    tipoatendimentodescricao: "Internação",
    codserv: "101",
    codcc_destino: "UTI-02",
    motivo: null,
    origemSistema: "tasy",
    tipoatend: "Internado",
    valorConta: "25000.75",
    nomeProtocolo: "PROT-001",
    etapaConta: "Entrega",
  },
];

describe("Atendimentos - Valor Total e Notificação", () => {
  describe("KPI Valor Total", () => {
    it("deve calcular a soma correta de valorConta dos atendimentos", () => {
      const valorTotal = mockAtendimentos.reduce((acc, d) => {
        const val = d.valorConta ? parseFloat(String(d.valorConta)) : 0;
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

      // 15000.50 + 8500.00 + 0 (vazio) + 25000.75 = 48501.25
      expect(valorTotal).toBeCloseTo(48501.25, 2);
    });

    it("deve retornar 0 quando todos os valorConta são vazios", () => {
      const semValor = mockAtendimentos.map(d => ({ ...d, valorConta: "" }));
      const valorTotal = semValor.reduce((acc, d) => {
        const val = d.valorConta ? parseFloat(String(d.valorConta)) : 0;
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

      expect(valorTotal).toBe(0);
    });

    it("deve ignorar valores inválidos (NaN) no cálculo", () => {
      const comInvalido = [
        ...mockAtendimentos,
        { ...mockAtendimentos[0], numatend: "1005", valorConta: "abc" },
      ];
      const valorTotal = comInvalido.reduce((acc, d) => {
        const val = d.valorConta ? parseFloat(String(d.valorConta)) : 0;
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

      expect(valorTotal).toBeCloseTo(48501.25, 2);
    });

    it("deve filtrar por protocolo NULL ao calcular valor total", () => {
      const semProtocolo = mockAtendimentos.filter(
        d => !d.nomeProtocolo || d.nomeProtocolo.trim() === ""
      );
      const valorTotal = semProtocolo.reduce((acc, d) => {
        const val = d.valorConta ? parseFloat(String(d.valorConta)) : 0;
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

      // 15000.50 + 8500.00 + 0 = 23500.50 (exclui 1004 que tem protocolo)
      expect(valorTotal).toBeCloseTo(23500.50, 2);
    });
  });

  describe("Coluna Valor Conta - Formatação", () => {
    it("deve formatar valor numérico em moeda brasileira", () => {
      const val = parseFloat("15000.50");
      const formatted = val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      expect(formatted).toContain("15.000,50");
      expect(formatted).toContain("R$");
    });

    it("deve retornar 0 para valor vazio", () => {
      const val = "" ? parseFloat("") : 0;
      expect(val).toBe(0);
    });

    it("deve retornar 0 para valor null/undefined", () => {
      const valNull = null as any;
      const parsed = valNull ? parseFloat(String(valNull)) : 0;
      expect(parsed).toBe(0);
    });

    it("deve tratar valor como string numérica corretamente", () => {
      const valorStr = "25000.75";
      const val = parseFloat(String(valorStr));
      expect(val).toBeCloseTo(25000.75, 2);
      expect(isNaN(val)).toBe(false);
    });
  });

  describe("Badge Notificado - Detecção", () => {
    it("deve identificar atendimentos notificados (motivo não-nulo)", () => {
      const notificadosSet = new Set(
        mockAtendimentos.filter(d => d.motivo).map(d => d.numatend)
      );

      expect(notificadosSet.size).toBe(2);
      expect(notificadosSet.has("1001")).toBe(true); // motivo: "medico"
      expect(notificadosSet.has("1003")).toBe(true); // motivo: "enfermagem"
      expect(notificadosSet.has("1002")).toBe(false); // motivo: null
      expect(notificadosSet.has("1004")).toBe(false); // motivo: null
    });

    it("deve retornar set vazio quando nenhum atendimento tem motivo", () => {
      const semMotivo = mockAtendimentos.map(d => ({ ...d, motivo: null }));
      const notificadosSet = new Set(
        semMotivo.filter(d => d.motivo).map(d => d.numatend)
      );

      expect(notificadosSet.size).toBe(0);
    });

    it("deve retornar todos quando todos têm motivo", () => {
      const todosNotificados = mockAtendimentos.map(d => ({
        ...d,
        motivo: "medico",
      }));
      const notificadosSet = new Set(
        todosNotificados.filter(d => d.motivo).map(d => d.numatend)
      );

      expect(notificadosSet.size).toBe(4);
    });
  });

  describe("Procedure retorna valorConta", () => {
    it("deve mapear valorConta como string do campo do banco", () => {
      // Simular o mapeamento da procedure
      const dbRow = {
        valorConta: 15000.50,
      };
      const mapped = dbRow.valorConta ? String(dbRow.valorConta) : "";
      expect(mapped).toBe("15000.5");
    });

    it("deve retornar string vazia quando valorConta é null", () => {
      const dbRow = {
        valorConta: null as any,
      };
      const mapped = dbRow.valorConta ? String(dbRow.valorConta) : "";
      expect(mapped).toBe("");
    });
  });

  describe("Filtro valorConta > 0.1 (remover contas zeradas)", () => {
    const mockComZerados = [
      ...mockAtendimentos,
      {
        numatend: "1005",
        nomepac: "Carlos Lima",
        nomeplaco: "SulAmérica",
        datatend: "2025-04-01T00:00:00.000Z",
        datasai: null,
        diasParado: 1,
        tipoatendimentodescricao: "Exame",
        codserv: "401",
        codcc_destino: "EXM-01",
        motivo: null,
        origemSistema: "tasy",
        tipoatend: "Exame",
        valorConta: "0.00",
        nomeProtocolo: null,
        etapaConta: "Auditoria",
      },
      {
        numatend: "1006",
        nomepac: "Lucia Ferreira",
        nomeplaco: "Unimed",
        datatend: "2025-04-05T00:00:00.000Z",
        datasai: null,
        diasParado: 3,
        tipoatendimentodescricao: "Internação",
        codserv: "101",
        codcc_destino: "UTI-03",
        motivo: null,
        origemSistema: "tasy",
        tipoatend: "Internado",
        valorConta: "0.05",
        nomeProtocolo: null,
        etapaConta: "Faturamento",
      },
    ];

    it("deve remover atendimentos com valorConta = 0.00", () => {
      const filtrados = mockComZerados.filter(
        d => (parseFloat(String(d.valorConta)) || 0) > 0.1
      );
      expect(filtrados.find(d => d.numatend === "1005")).toBeUndefined();
    });

    it("deve remover atendimentos com valorConta = 0.05 (abaixo de 0.1)", () => {
      const filtrados = mockComZerados.filter(
        d => (parseFloat(String(d.valorConta)) || 0) > 0.1
      );
      expect(filtrados.find(d => d.numatend === "1006")).toBeUndefined();
    });

    it("deve manter atendimentos com valorConta acima de 0.1", () => {
      const filtrados = mockComZerados.filter(
        d => (parseFloat(String(d.valorConta)) || 0) > 0.1
      );
      // 1001 (15000.50), 1002 (8500.00), 1004 (25000.75) devem permanecer
      expect(filtrados.find(d => d.numatend === "1001")).toBeDefined();
      expect(filtrados.find(d => d.numatend === "1002")).toBeDefined();
      expect(filtrados.find(d => d.numatend === "1004")).toBeDefined();
    });

    it("deve remover atendimentos com valorConta vazio", () => {
      const filtrados = mockComZerados.filter(
        d => (parseFloat(String(d.valorConta)) || 0) > 0.1
      );
      // 1003 tem valorConta = "" -> parseFloat("") = NaN -> 0 -> não passa
      expect(filtrados.find(d => d.numatend === "1003")).toBeUndefined();
    });

    it("deve retornar a quantidade correta após filtro", () => {
      const filtrados = mockComZerados.filter(
        d => (parseFloat(String(d.valorConta)) || 0) > 0.1
      );
      // Dos 6 atendimentos, apenas 3 têm valorConta > 0.1: 1001, 1002, 1004
      expect(filtrados).toHaveLength(3);
    });

    it("deve calcular valor total corretamente após filtro", () => {
      const filtrados = mockComZerados.filter(
        d => (parseFloat(String(d.valorConta)) || 0) > 0.1
      );
      const valorTotal = filtrados.reduce((acc, d) => {
        const val = d.valorConta ? parseFloat(String(d.valorConta)) : 0;
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      // 15000.50 + 8500.00 + 25000.75 = 48501.25
      expect(valorTotal).toBeCloseTo(48501.25, 2);
    });
  });

  describe("Exportação Excel com Valor Conta e Notificado", () => {
    it("deve incluir Valor Conta e Notificado na exportação TASY", () => {
      const notificadosSet = new Set(
        mockAtendimentos.filter(d => d.motivo).map(d => d.numatend)
      );

      const exportData = mockAtendimentos.map(d => ({
        "Nº Atend.": d.numatend,
        "Paciente": d.nomepac,
        "Plano": d.nomeplaco,
        "Valor Conta": d.valorConta
          ? parseFloat(String(d.valorConta)).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          : "-",
        "Notificado": notificadosSet.has(d.numatend) ? "Sim" : "Não",
      }));

      expect(exportData).toHaveLength(4);

      // Primeiro atendimento: tem valor e é notificado
      expect(exportData[0]["Valor Conta"]).toContain("15.000,50");
      expect(exportData[0]["Notificado"]).toBe("Sim");

      // Segundo: tem valor, não notificado
      expect(exportData[1]["Valor Conta"]).toContain("8.500,00");
      expect(exportData[1]["Notificado"]).toBe("Não");

      // Terceiro: sem valor, notificado
      expect(exportData[2]["Valor Conta"]).toBe("-");
      expect(exportData[2]["Notificado"]).toBe("Sim");

      // Quarto: tem valor, não notificado
      expect(exportData[3]["Valor Conta"]).toContain("25.000,75");
      expect(exportData[3]["Notificado"]).toBe("Não");
    });
  });
});
