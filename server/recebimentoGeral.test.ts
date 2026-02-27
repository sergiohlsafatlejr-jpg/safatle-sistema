import { describe, it, expect, vi } from "vitest";

// Mock do getDb para testar a lógica de transformação
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  verificarPermissaoEstabelecimento: vi.fn().mockResolvedValue(true),
}));

vi.mock("../drizzle/schema", () => ({
  recebimentoGeral: {},
  permissoesEstabelecimento: {},
}));

describe("db-recebimentoGeral", () => {
  describe("importarIntegFaturadoRecebido", () => {
    it("deve retornar erro quando db não está disponível", async () => {
      const { importarIntegFaturadoRecebido } = await import("./db-recebimentoGeral");
      const result = await importarIntegFaturadoRecebido();
      expect(result.success).toBe(false);
      expect(result.erros).toContain("Conexão com banco de dados não disponível");
    });
  });

  describe("contarRecebimentoGeral", () => {
    it("deve retornar 0 quando db não está disponível", async () => {
      const { contarRecebimentoGeral } = await import("./db-recebimentoGeral");
      const result = await contarRecebimentoGeral();
      expect(result).toBe(0);
    });
  });

  describe("listarRecebimentoGeral", () => {
    it("deve retornar lista vazia quando db não está disponível", async () => {
      const { listarRecebimentoGeral } = await import("./db-recebimentoGeral");
      const result = await listarRecebimentoGeral({
        estabelecimentoId: 1260036,
      });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });
  });

  describe("resumoRecebimentoGeral", () => {
    it("deve retornar resumo zerado quando db não está disponível", async () => {
      const { resumoRecebimentoGeral } = await import("./db-recebimentoGeral");
      const result = await resumoRecebimentoGeral(1260036);
      expect(result.totalRegistros).toBe(0);
      expect(result.totalFaturado).toBe(0);
      expect(result.totalRecebido).toBe(0);
      expect(result.totalGlosas).toBe(0);
      expect(result.convenios).toEqual([]);
      expect(result.meses).toEqual([]);
    });
  });
});

describe("dadosRecebimentoBI", () => {
  it("deve retornar resultado vazio quando db não está disponível", async () => {
    const { dadosRecebimentoBI } = await import("./db-recebimentoGeral");
    const result = await dadosRecebimentoBI({ estabelecimentoId: 1 });

    expect(result).toBeDefined();
    expect(result.resumo.totalFaturado).toBe(0);
    expect(result.resumo.totalRecebido).toBe(0);
    expect(result.resumo.totalAberto).toBe(0);
    expect(result.resumo.totalItens).toBe(0);
    expect(result.resumo.taxaRecebimento).toBe(0);
    expect(result.resumo.totalGlosas).toBe(0);
    expect(result.resumo.totalRecurso).toBe(0);
    expect(result.resumo.totalRecuperado).toBe(0);
    expect(result.resumo.totalRecebAMaior).toBe(0);
    expect(result.porConvenio).toEqual([]);
    expect(result.porMes).toEqual([]);
    expect(result.porSetor).toEqual([]);
    expect(result.porTipo).toEqual([]);
    expect(result.topAberto).toEqual([]);
  });

  it("deve aceitar parâmetros de filtro sem erro", async () => {
    const { dadosRecebimentoBI } = await import("./db-recebimentoGeral");
    const result = await dadosRecebimentoBI({
      estabelecimentoId: 1,
      mesProducao: "01/2025",
      convenio: "UNIMED",
      setor: "Centro Cirúrgico",
    });

    expect(result).toBeDefined();
    expect(result.resumo).toBeDefined();
    expect(result.porConvenio).toBeDefined();
    expect(result.porMes).toBeDefined();
    expect(result.porSetor).toBeDefined();
    expect(result.porTipo).toBeDefined();
    expect(result.topAberto).toBeDefined();
  });
});
