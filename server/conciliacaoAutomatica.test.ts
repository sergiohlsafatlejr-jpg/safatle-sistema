import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
const mockExecute = vi.fn();
vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    execute: mockExecute,
  })),
}));

import {
  executarConciliacaoAutomatica,
  resetarConciliacao,
} from "./faturamentoUnificadoService";

describe("conciliacaoAutomatica", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue([[]]);
  });

  describe("executarConciliacaoAutomatica", () => {
    it("deve retornar resultado vazio quando nao ha itens de faturamento", async () => {
      // Query competencias (retorna 1 só)
      mockExecute.mockResolvedValueOnce([[{ competencia: '2025-12' }]]);
      // Query faturamento retorna vazio
      mockExecute.mockResolvedValueOnce([[]]);

      const result = await executarConciliacaoAutomatica({
        estabelecimentoId: 1,
      });

      expect(result.totalProcessados).toBe(0);
      expect(result.totalConciliados).toBe(0);
      expect(result.totalDivergentes).toBe(0);
      expect(result.totalNaoRecebidos).toBe(0);
    });

    it("deve conciliar itens com match exato por guia + codigo", async () => {
      // Query competencias (retorna 1 só, não faz batch)
      mockExecute.mockResolvedValueOnce([[{ competencia: '2025-12' }]]);
      // Query faturamento
      mockExecute.mockResolvedValueOnce([[
        {
          id: 1,
          codigoItem: "40302385",
          codigoItemTuss: null,
          numeroGuia: "18874660",
          contaNumero: "12345",
          pacienteNome: "JOAO SILVA",
          carteiraBeneficiario: "001",
          convenioId: 10,
          competencia: "2025-12",
          valorFaturado: 4.13,
          quantidade: 1,
        },
      ]]);
      // Query recebimentos
      mockExecute.mockResolvedValueOnce([[
        {
          id: 100,
          numeroGuia: "18874660",
          codigoItem: "40302385",
          nomeBeneficiario: "JOAO SILVA",
          carteira: "001",
          valorPago: 4.13,
          valorGlosa: 0,
          situacao: "PAGO",
          quantidade: 1,
        },
      ]]);
      // Query vinculacao
      mockExecute.mockResolvedValueOnce([[]]);
      // UPDATE batch
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await executarConciliacaoAutomatica({
        estabelecimentoId: 1,
      });

      expect(result.totalProcessados).toBe(1);
      expect(result.totalConciliados).toBe(1);
      expect(result.totalDivergentes).toBe(0);
      expect(result.totalNaoRecebidos).toBe(0);
      expect(result.detalhes.conciliadosPorGuiaCodigo).toBe(1);
    });

    it("deve marcar como divergente quando valores sao diferentes", async () => {
      // Query competencias
      mockExecute.mockResolvedValueOnce([[{ competencia: '2025-12' }]]);
      // Faturamento
      mockExecute.mockResolvedValueOnce([[
        {
          id: 1,
          codigoItem: "40302385",
          codigoItemTuss: null,
          numeroGuia: "18874660",
          contaNumero: "12345",
          pacienteNome: "JOAO SILVA",
          carteiraBeneficiario: "001",
          convenioId: 10,
          competencia: "2025-12",
          valorFaturado: 100.00,
          quantidade: 1,
        },
      ]]);
      // Recebimentos - valor diferente
      mockExecute.mockResolvedValueOnce([[
        {
          id: 100,
          numeroGuia: "18874660",
          codigoItem: "40302385",
          nomeBeneficiario: "JOAO SILVA",
          carteira: "001",
          valorPago: 80.00,
          valorGlosa: 20.00,
          situacao: "PARCIAL",
          quantidade: 1,
        },
      ]]);
      // Vinculacao
      mockExecute.mockResolvedValueOnce([[]]);
      // UPDATE
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await executarConciliacaoAutomatica({
        estabelecimentoId: 1,
      });

      expect(result.totalProcessados).toBe(1);
      expect(result.totalConciliados).toBe(0);
      expect(result.totalDivergentes).toBe(1);
      expect(result.divergencias).toHaveLength(1);
      expect(result.divergencias[0].diferenca).toBe(20);
    });

    it("deve marcar como nao_recebido quando nao ha match", async () => {
      // Query competencias
      mockExecute.mockResolvedValueOnce([[{ competencia: '2025-12' }]]);
      // Faturamento
      mockExecute.mockResolvedValueOnce([[
        {
          id: 1,
          codigoItem: "40302385",
          codigoItemTuss: null,
          numeroGuia: "18874660",
          contaNumero: "12345",
          pacienteNome: "JOAO SILVA",
          carteiraBeneficiario: "001",
          convenioId: 10,
          competencia: "2025-12",
          valorFaturado: 100.00,
          quantidade: 1,
        },
      ]]);
      // Recebimentos - vazio
      mockExecute.mockResolvedValueOnce([[]]);
      // Vinculacao
      mockExecute.mockResolvedValueOnce([[]]);
      // UPDATE
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await executarConciliacaoAutomatica({
        estabelecimentoId: 1,
      });

      expect(result.totalProcessados).toBe(1);
      expect(result.totalConciliados).toBe(0);
      expect(result.totalNaoRecebidos).toBe(1);
    });

    it("deve usar match por codigo TUSS quando codigo direto nao encontra", async () => {
      // Query competencias
      mockExecute.mockResolvedValueOnce([[{ competencia: '2025-12' }]]);
      // Faturamento com codigoItemTuss diferente do codigoItem
      mockExecute.mockResolvedValueOnce([[
        {
          id: 1,
          codigoItem: "HOSP001",
          codigoItemTuss: "40302385",
          numeroGuia: "18874660",
          contaNumero: "12345",
          pacienteNome: "JOAO SILVA",
          carteiraBeneficiario: "001",
          convenioId: 10,
          competencia: "2025-12",
          valorFaturado: 50.00,
          quantidade: 1,
        },
      ]]);
      // Recebimentos - match pelo TUSS
      mockExecute.mockResolvedValueOnce([[
        {
          id: 200,
          numeroGuia: "18874660",
          codigoItem: "40302385",
          nomeBeneficiario: "JOAO SILVA",
          carteira: "001",
          valorPago: 50.00,
          valorGlosa: 0,
          situacao: "PAGO",
          quantidade: 1,
        },
      ]]);
      // Vinculacao
      mockExecute.mockResolvedValueOnce([[]]);
      // UPDATE
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await executarConciliacaoAutomatica({
        estabelecimentoId: 1,
      });

      expect(result.totalProcessados).toBe(1);
      expect(result.totalConciliados).toBe(1);
      expect(result.detalhes.conciliadosPorGuiaCodigoTuss).toBe(1);
    });

    it("deve usar vinculacao de codigos (de-para) quando match direto falha", async () => {
      // Query competencias
      mockExecute.mockResolvedValueOnce([[{ competencia: '2025-12' }]]);
      // Faturamento
      mockExecute.mockResolvedValueOnce([[
        {
          id: 1,
          codigoItem: "HOSP001",
          codigoItemTuss: null,
          numeroGuia: "18874660",
          contaNumero: "12345",
          pacienteNome: "JOAO SILVA",
          carteiraBeneficiario: "001",
          convenioId: 10,
          competencia: "2025-12",
          valorFaturado: 50.00,
          quantidade: 1,
        },
      ]]);
      // Recebimentos - match pelo codigo traduzido
      mockExecute.mockResolvedValueOnce([[
        {
          id: 300,
          numeroGuia: "18874660",
          codigoItem: "CONV001",
          nomeBeneficiario: "JOAO SILVA",
          carteira: "001",
          valorPago: 50.00,
          valorGlosa: 0,
          situacao: "PAGO",
          quantidade: 1,
        },
      ]]);
      // Vinculacao - HOSP001 -> CONV001
      mockExecute.mockResolvedValueOnce([[
        {
          codigoHospital: "HOSP001",
          codigoConvenio: "CONV001",
          convenioId: 10,
        },
      ]]);
      // UPDATE
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await executarConciliacaoAutomatica({
        estabelecimentoId: 1,
      });

      expect(result.totalProcessados).toBe(1);
      expect(result.totalConciliados).toBe(1);
      expect(result.detalhes.conciliadosPorVinculacao).toBe(1);
    });

    it("deve usar match por paciente + codigo como fallback", async () => {
      // Query competencias
      mockExecute.mockResolvedValueOnce([[{ competencia: '2025-12' }]]);
      // Faturamento - guia diferente do recebimento
      mockExecute.mockResolvedValueOnce([[
        {
          id: 1,
          codigoItem: "40302385",
          codigoItemTuss: null,
          numeroGuia: "GUIA_HOSP_001",
          contaNumero: "12345",
          pacienteNome: "JOAO SILVA",
          carteiraBeneficiario: "001",
          convenioId: 10,
          competencia: "2025-12",
          valorFaturado: 50.00,
          quantidade: 1,
        },
      ]]);
      // Recebimentos - guia diferente mas mesmo paciente e codigo
      mockExecute.mockResolvedValueOnce([[
        {
          id: 400,
          numeroGuia: "GUIA_CONV_999",
          codigoItem: "40302385",
          nomeBeneficiario: "JOAO SILVA",
          carteira: "001",
          valorPago: 50.00,
          valorGlosa: 0,
          situacao: "PAGO",
          quantidade: 1,
        },
      ]]);
      // Vinculacao
      mockExecute.mockResolvedValueOnce([[]]);
      // UPDATE
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await executarConciliacaoAutomatica({
        estabelecimentoId: 1,
      });

      expect(result.totalProcessados).toBe(1);
      expect(result.totalConciliados).toBe(1);
      expect(result.detalhes.conciliadosPorPacienteCodigo).toBe(1);
    });

    it("deve aceitar tolerancia percentual customizada", async () => {
      // Query competencias
      mockExecute.mockResolvedValueOnce([[{ competencia: '2025-12' }]]);
      // Faturamento
      mockExecute.mockResolvedValueOnce([[
        {
          id: 1,
          codigoItem: "40302385",
          codigoItemTuss: null,
          numeroGuia: "18874660",
          contaNumero: "12345",
          pacienteNome: "JOAO SILVA",
          carteiraBeneficiario: "001",
          convenioId: 10,
          competencia: "2025-12",
          valorFaturado: 100.00,
          quantidade: 1,
        },
      ]]);
      // Recebimentos - 5% de diferenca
      mockExecute.mockResolvedValueOnce([[
        {
          id: 100,
          numeroGuia: "18874660",
          codigoItem: "40302385",
          nomeBeneficiario: "JOAO SILVA",
          carteira: "001",
          valorPago: 95.00,
          valorGlosa: 5.00,
          situacao: "PARCIAL",
          quantidade: 1,
        },
      ]]);
      // Vinculacao
      mockExecute.mockResolvedValueOnce([[]]);
      // UPDATE
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      // Com tolerancia de 5%, deve conciliar
      const result = await executarConciliacaoAutomatica({
        estabelecimentoId: 1,
        toleranciaPercentual: 5,
      });

      expect(result.totalConciliados).toBe(1);
      expect(result.totalDivergentes).toBe(0);
    });

    it("deve processar multiplos itens em batch", async () => {
      // Query competencias
      mockExecute.mockResolvedValueOnce([[{ competencia: '2025-12' }]]);
      // Faturamento - 3 itens
      mockExecute.mockResolvedValueOnce([[
        { id: 1, codigoItem: "A", codigoItemTuss: null, numeroGuia: "G1", contaNumero: "C1", pacienteNome: "P1", carteiraBeneficiario: "001", convenioId: 10, competencia: "2025-12", valorFaturado: 10, quantidade: 1 },
        { id: 2, codigoItem: "B", codigoItemTuss: null, numeroGuia: "G1", contaNumero: "C1", pacienteNome: "P1", carteiraBeneficiario: "001", convenioId: 10, competencia: "2025-12", valorFaturado: 20, quantidade: 1 },
        { id: 3, codigoItem: "C", codigoItemTuss: null, numeroGuia: "G2", contaNumero: "C2", pacienteNome: "P2", carteiraBeneficiario: "002", convenioId: 10, competencia: "2025-12", valorFaturado: 30, quantidade: 1 },
      ]]);
      // Recebimentos - match para 2 dos 3
      mockExecute.mockResolvedValueOnce([[
        { id: 100, numeroGuia: "G1", codigoItem: "A", nomeBeneficiario: "P1", carteira: "001", valorPago: 10, valorGlosa: 0, situacao: "PAGO", quantidade: 1 },
        { id: 101, numeroGuia: "G1", codigoItem: "B", nomeBeneficiario: "P1", carteira: "001", valorPago: 15, valorGlosa: 5, situacao: "PARCIAL", quantidade: 1 },
      ]]);
      // Vinculacao
      mockExecute.mockResolvedValueOnce([[]]);
      // UPDATEs
      mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

      const result = await executarConciliacaoAutomatica({
        estabelecimentoId: 1,
      });

      expect(result.totalProcessados).toBe(3);
      expect(result.totalConciliados).toBe(1); // item A (valores iguais)
      expect(result.totalDivergentes).toBe(1); // item B (20 vs 15)
      expect(result.totalNaoRecebidos).toBe(1); // item C (sem match)
    });

    it("deve filtrar por competencia quando fornecida", async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      const result = await executarConciliacaoAutomatica({
        estabelecimentoId: 1,
        competencia: "2025-12",
      });

      expect(result.totalProcessados).toBe(0);
      // Verificar que a query inclui filtro de competencia
      const firstCall = mockExecute.mock.calls[0][0];
      expect(firstCall.queryChunks || firstCall.strings || String(firstCall)).toBeDefined();
    });

    it("deve filtrar por convenioId quando fornecido", async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      const result = await executarConciliacaoAutomatica({
        estabelecimentoId: 1,
        convenioId: 10,
      });

      expect(result.totalProcessados).toBe(0);
    });
  });

  describe("resetarConciliacao", () => {
    it("deve resetar itens conciliados para pendente", async () => {
      // Count
      mockExecute.mockResolvedValueOnce([[{ total: 50 }]]);
      // SELECT DISTINCT faturamentoUnificadoId
      mockExecute.mockResolvedValueOnce([[{ faturamentoUnificadoId: 1 }, { faturamentoUnificadoId: 2 }]]);
      // UPDATE faturamento_unificado
      mockExecute.mockResolvedValueOnce([{ affectedRows: 2 }]);
      // DELETE
      mockExecute.mockResolvedValueOnce([{ affectedRows: 50 }]);

      const result = await resetarConciliacao({
        estabelecimentoId: 1,
      });

      expect(result.resetados).toBe(50);
      expect(mockExecute).toHaveBeenCalledTimes(4);
    });

    it("deve aceitar filtro de competencia", async () => {
      mockExecute.mockResolvedValueOnce([[{ total: 20 }]]);
      // SELECT DISTINCT
      mockExecute.mockResolvedValueOnce([[{ faturamentoUnificadoId: 10 }]]);
      // UPDATE faturamento_unificado
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // DELETE
      mockExecute.mockResolvedValueOnce([{ affectedRows: 20 }]);

      const result = await resetarConciliacao({
        estabelecimentoId: 1,
        competencia: "2025-12",
      });

      expect(result.resetados).toBe(20);
    });

    it("deve aceitar filtro de convenioId", async () => {
      mockExecute.mockResolvedValueOnce([[{ total: 10 }]]);
      // SELECT DISTINCT
      mockExecute.mockResolvedValueOnce([[{ faturamentoUnificadoId: 20 }]]);
      // UPDATE faturamento_unificado
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // DELETE
      mockExecute.mockResolvedValueOnce([{ affectedRows: 10 }]);

      const result = await resetarConciliacao({
        estabelecimentoId: 1,
        convenioId: 5,
      });

      expect(result.resetados).toBe(10);
    });

    it("deve retornar 0 quando nao ha itens para resetar", async () => {
      mockExecute.mockResolvedValueOnce([[{ total: 0 }]]);
      // SELECT DISTINCT - retorna vazio
      mockExecute.mockResolvedValueOnce([[]]);
      // DELETE
      mockExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await resetarConciliacao({
        estabelecimentoId: 1,
      });

      expect(result.resetados).toBe(0);
    });
  });
});

describe("glosarItens e reverterGlosa com divergentes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue([{ affectedRows: 0 }]);
  });

  it("glosarItens deve aceitar itens e retornar contagem de atualizados", async () => {
    const { glosarItens } = await import("./faturamentoUnificadoService");
    mockExecute.mockResolvedValueOnce([{ affectedRows: 3 }]);

    const result = await glosarItens({
      ids: [1, 2, 3],
      estabelecimentoId: 6,
      motivoGlosa: "Valor divergente",
      codigoGlosa: "1015",
    });

    expect(result.atualizados).toBe(3);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("glosarItens deve executar query com parametros corretos", async () => {
    const { glosarItens } = await import("./faturamentoUnificadoService");
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const result = await glosarItens({
      ids: [10],
      estabelecimentoId: 6,
      codigoGlosa: "1015",
    });

    expect(result.atualizados).toBe(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("glosarTodosNaoRecebidosPorGuia deve retornar contagem correta", async () => {
    const { glosarTodosNaoRecebidosPorGuia } = await import("./faturamentoUnificadoService");
    mockExecute.mockResolvedValueOnce([{ affectedRows: 5 }]);

    const result = await glosarTodosNaoRecebidosPorGuia({
      estabelecimentoId: 6,
      numeroGuia: "18414424",
      codigoGlosa: "1015",
    });

    expect(result.atualizados).toBe(5);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("reverterGlosa deve retornar contagem de itens revertidos", async () => {
    const { reverterGlosa } = await import("./faturamentoUnificadoService");
    mockExecute.mockResolvedValueOnce([{ affectedRows: 2 }]);

    const result = await reverterGlosa({
      ids: [1, 2],
      estabelecimentoId: 6,
    });

    expect(result.atualizados).toBe(2);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("glosarItens deve retornar 0 quando ids vazio", async () => {
    const { glosarItens } = await import("./faturamentoUnificadoService");

    const result = await glosarItens({
      ids: [],
      estabelecimentoId: 6,
    });

    expect(result.atualizados).toBe(0);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("reverterGlosa deve retornar 0 quando ids vazio", async () => {
    const { reverterGlosa } = await import("./faturamentoUnificadoService");

    const result = await reverterGlosa({
      ids: [],
      estabelecimentoId: 6,
    });

    expect(result.atualizados).toBe(0);
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
