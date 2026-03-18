import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do getDb
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import {
  listarFaturamentoExterno,
  importarFaturamentoExterno,
  buscarTotaisFaturamentoExterno,
  buscarTotaisPorConvenioExterno,
  excluirFaturamentoExterno,
} from "./faturamentoExterno";

const mockExecute = vi.fn();
const mockDb = { execute: mockExecute };

describe("faturamentoExterno", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as any).mockResolvedValue(mockDb);
  });

  describe("listarFaturamentoExterno", () => {
    it("deve retornar lista de registros do ano especificado", async () => {
      mockExecute.mockResolvedValue([
        [
          {
            id: 1,
            estabelecimento_id: 1260036,
            convenio: "FMS-FUNDO MUNICIPAL DE SAUDE",
            mes_ano: "2025/01",
            valor_faturado: "461833.28",
            valor_recebido: "461833.28",
            arquivo_origem: "UrologicoSUS2025.xlsx",
            importado_por_nome: "Sistema",
            criado_em: new Date("2025-03-18"),
          },
        ],
      ]);

      const result = await listarFaturamentoExterno(1260036, 2025);

      expect(result).toHaveLength(1);
      expect(result[0].convenio).toBe("FMS-FUNDO MUNICIPAL DE SAUDE");
      expect(result[0].valorFaturado).toBe(461833.28);
      expect(result[0].valorRecebido).toBe(461833.28);
      expect(result[0].mesAno).toBe("2025/01");
    });

    it("deve usar ano atual quando não especificado", async () => {
      mockExecute.mockResolvedValue([[]]);

      await listarFaturamentoExterno(1260036);

      // Verifica que execute foi chamado (a query usa o ano atual internamente)
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("deve retornar array vazio quando não há dados", async () => {
      mockExecute.mockResolvedValue([[]]);

      const result = await listarFaturamentoExterno(1260036, 2024);
      expect(result).toHaveLength(0);
    });
  });

  describe("importarFaturamentoExterno", () => {
    it("deve inserir novos registros quando não existem", async () => {
      // Primeiro execute: verificar existência (retorna vazio)
      // Segundo execute: inserir
      mockExecute
        .mockResolvedValueOnce([[]])  // SELECT - não existe
        .mockResolvedValueOnce([{}]); // INSERT

      const dados = [
        {
          convenio: "FMS-FUNDO MUNICIPAL DE SAUDE",
          mesAno: "2025/01",
          valorFaturado: 461833.28,
          valorRecebido: 461833.28,
        },
      ];

      const result = await importarFaturamentoExterno(
        1260036,
        dados,
        "UrologicoSUS2025.xlsx",
        1,
        "Admin"
      );

      expect(result.totalLinhas).toBe(1);
      expect(result.inseridos).toBe(1);
      expect(result.atualizados).toBe(0);
      expect(result.erros).toHaveLength(0);
    });

    it("deve atualizar registros existentes", async () => {
      mockExecute
        .mockResolvedValueOnce([[{ id: 5 }]])  // SELECT - existe
        .mockResolvedValueOnce([{}]);            // UPDATE

      const dados = [
        {
          convenio: "FMS-FUNDO MUNICIPAL DE SAUDE",
          mesAno: "2025/01",
          valorFaturado: 500000.00,
          valorRecebido: 500000.00,
        },
      ];

      const result = await importarFaturamentoExterno(
        1260036,
        dados,
        "UrologicoSUS2025_v2.xlsx",
        1,
        "Admin"
      );

      expect(result.totalLinhas).toBe(1);
      expect(result.inseridos).toBe(0);
      expect(result.atualizados).toBe(1);
      expect(result.erros).toHaveLength(0);
    });

    it("deve capturar erros por linha sem interromper importação", async () => {
      mockExecute
        .mockRejectedValueOnce(new Error("DB error"))  // Falha no SELECT
        .mockResolvedValueOnce([[]])                     // SELECT - não existe
        .mockResolvedValueOnce([{}]);                    // INSERT

      const dados = [
        { convenio: "CONV1", mesAno: "2025/01", valorFaturado: 100, valorRecebido: 100 },
        { convenio: "CONV2", mesAno: "2025/02", valorFaturado: 200, valorRecebido: 200 },
      ];

      const result = await importarFaturamentoExterno(1260036, dados, "test.xlsx", 1, "Admin");

      expect(result.totalLinhas).toBe(2);
      expect(result.erros).toHaveLength(1);
      expect(result.inseridos).toBe(1);
    });
  });

  describe("buscarTotaisFaturamentoExterno", () => {
    it("deve retornar totais agrupados por mês", async () => {
      mockExecute.mockResolvedValue([
        [
          { mes_ano: "2025/01", mes_num: "01", total_faturado: "520688.96", total_recebido: "520688.96", convenios: 2 },
          { mes_ano: "2025/02", mes_num: "02", total_faturado: "349076.84", total_recebido: "349076.84", convenios: 2 },
        ],
      ]);

      const result = await buscarTotaisFaturamentoExterno(1260036, 2025);

      expect(result).toHaveLength(2);
      expect(result[0].mesNum).toBe("01");
      expect(result[0].totalFaturado).toBe(520688.96);
      expect(result[1].mesNum).toBe("02");
      expect(result[1].totalFaturado).toBe(349076.84);
    });
  });

  describe("buscarTotaisPorConvenioExterno", () => {
    it("deve retornar totais agrupados por convênio", async () => {
      mockExecute.mockResolvedValue([
        [
          { convenio: "FMS-FUNDO MUNICIPAL DE SAUDE", total_faturado: "5205810.56", total_recebido: "5205810.56" },
          { convenio: "FMS-FUNDO MUNICIPAL DE SAUDE/SUBSIDIO", total_faturado: "378373.92", total_recebido: "378373.92" },
        ],
      ]);

      const result = await buscarTotaisPorConvenioExterno(1260036, 2025);

      expect(result).toHaveLength(2);
      expect(result[0].convenio).toBe("FMS-FUNDO MUNICIPAL DE SAUDE");
      expect(result[0].totalFaturado).toBe(5205810.56);
      expect(result[1].convenio).toBe("FMS-FUNDO MUNICIPAL DE SAUDE/SUBSIDIO");
    });
  });

  describe("excluirFaturamentoExterno", () => {
    it("deve excluir registro pelo id e estabelecimento", async () => {
      mockExecute.mockResolvedValue([{}]);

      const result = await excluirFaturamentoExterno(5, 1260036);

      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe("tratamento de erros", () => {
    it("deve lançar erro quando database não está disponível", async () => {
      (getDb as any).mockResolvedValue(null);

      await expect(listarFaturamentoExterno(1260036)).rejects.toThrow("Database não disponível");
      await expect(buscarTotaisFaturamentoExterno(1260036, 2025)).rejects.toThrow("Database não disponível");
      await expect(buscarTotaisPorConvenioExterno(1260036, 2025)).rejects.toThrow("Database não disponível");
    });
  });
});
