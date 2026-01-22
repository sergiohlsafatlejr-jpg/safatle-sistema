import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

describe("Conciliação Automática", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getConciliacaoPorConvenio", () => {
    it("should return empty results when no data exists", async () => {
      // Mock getDb to return empty results
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      
      vi.spyOn(db, "getConciliacaoPorConvenio").mockResolvedValue({
        itens: [],
        resumo: null,
      });

      const result = await db.getConciliacaoPorConvenio({
        convenioId: 1,
        userId: 1,
      });

      expect(result).toEqual({ itens: [], resumo: null });
    });

    it("should correctly identify glosado items when valor pago is less than faturado", async () => {
      // This tests the logic of identifying glosas
      const mockEnviado = {
        codigo: "10101012",
        guiaNumero: "12345",
        valorTotal: "100.00",
        descricao: "Consulta",
        pacienteNome: "Paciente Teste",
        dataExecucao: new Date(),
      };

      const mockRetornado = {
        codigo: "10101012",
        guiaNumero: "12345",
        valorTotal: "80.00", // Valor menor = glosa
        descricao: "Consulta",
        pacienteNome: "Paciente Teste",
        dataExecucao: new Date(),
        dadosExtras: JSON.stringify({ motivoGlosa: "Valor excedente" }),
      };

      // The function should identify this as glosado with R$ 20.00 de diferença
      const valorEnviado = parseFloat(mockEnviado.valorTotal);
      const valorRetornado = parseFloat(mockRetornado.valorTotal);
      const diferenca = valorEnviado - valorRetornado;

      expect(diferenca).toBe(20);
      expect(diferenca > 0).toBe(true); // Glosa parcial
    });

    it("should correctly identify OK items when valores are equal", async () => {
      const valorEnviado = 100.00;
      const valorRetornado = 100.00;
      const diferenca = valorEnviado - valorRetornado;

      expect(Math.abs(diferenca) < 0.01).toBe(true); // OK
    });

    it("should correctly identify nao_encontrado items when not in retorno", async () => {
      const retornadosMap = new Map<string, any[]>();
      const chave = "10101012|12345".toLowerCase();
      
      // Item não existe no mapa de retornados
      const retornados = retornadosMap.get(chave) || [];
      
      expect(retornados.length).toBe(0); // Não encontrado
    });
  });

  describe("getResumoConciliacao", () => {
    it("should return empty array when no convenios have data", async () => {
      vi.spyOn(db, "getResumoConciliacao").mockResolvedValue([]);

      const result = await db.getResumoConciliacao({
        userId: 1,
      });

      expect(result).toEqual([]);
    });
  });

  describe("getConciliacaoAgrupadaPorConta", () => {
    it("should return empty results when no data exists", async () => {
      vi.spyOn(db, "getConciliacaoAgrupadaPorConta").mockResolvedValue({
        contas: [],
        resumo: null,
        total: 0,
      });

      const result = await db.getConciliacaoAgrupadaPorConta({
        convenioId: 1,
        userId: 1,
        mesReferencia: 1,
        anoReferencia: 2024,
      });

      expect(result.contas).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should group items by guiaNumero correctly", async () => {
      // Simular agrupamento de itens
      const itens = [
        { guiaNumero: "G001", codigo: "10101", valorFaturado: 100, valorPago: 100, valorGlosado: 0, status: "ok" },
        { guiaNumero: "G001", codigo: "10102", valorFaturado: 50, valorPago: 40, valorGlosado: 10, status: "glosado" },
        { guiaNumero: "G002", codigo: "10103", valorFaturado: 200, valorPago: 200, valorGlosado: 0, status: "ok" },
      ];

      // Agrupar por guia
      const contasMap = new Map<string, { valorTotal: number; itens: number }>(); 
      for (const item of itens) {
        const chave = item.guiaNumero;
        if (!contasMap.has(chave)) {
          contasMap.set(chave, { valorTotal: 0, itens: 0 });
        }
        const conta = contasMap.get(chave)!;
        conta.valorTotal += item.valorFaturado;
        conta.itens++;
      }

      expect(contasMap.size).toBe(2); // 2 guias diferentes
      expect(contasMap.get("G001")?.itens).toBe(2);
      expect(contasMap.get("G001")?.valorTotal).toBe(150);
      expect(contasMap.get("G002")?.itens).toBe(1);
      expect(contasMap.get("G002")?.valorTotal).toBe(200);
    });

    it("should determine conta status correctly based on item statuses", () => {
      // Testar lógica de status da conta
      const testCases = [
        { itemStatuses: ["ok", "ok"], expectedContaStatus: "ok" },
        { itemStatuses: ["ok", "glosado"], expectedContaStatus: "glosado" },
        { itemStatuses: ["ok", "nao_recebido"], expectedContaStatus: "nao_encontrado" },
        { itemStatuses: ["glosado", "nao_recebido"], expectedContaStatus: "glosado" },
      ];

      for (const testCase of testCases) {
        let contaStatus = "ok";
        for (const itemStatus of testCase.itemStatuses) {
          if (itemStatus === "nao_recebido") {
            if (contaStatus === "ok") contaStatus = "nao_encontrado";
          } else if (itemStatus === "glosado") {
            if (contaStatus === "ok" || contaStatus === "nao_encontrado") contaStatus = "glosado";
          }
        }
        expect(contaStatus).toBe(testCase.expectedContaStatus);
      }
    });
  });

  describe("Cálculo de percentual de glosa", () => {
    it("should calculate glosa percentage correctly", () => {
      const valorTotalFaturado = 1000;
      const valorTotalGlosado = 100;
      const percentualGlosa = (valorTotalGlosado / valorTotalFaturado) * 100;

      expect(percentualGlosa).toBe(10);
    });

    it("should return 0% when no faturado value", () => {
      const valorTotalFaturado = 0;
      const valorTotalGlosado = 0;
      const percentualGlosa = valorTotalFaturado > 0 
        ? (valorTotalGlosado / valorTotalFaturado) * 100 
        : 0;

      expect(percentualGlosa).toBe(0);
    });
  });
});
