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

describe("Relatório de Atendimentos - Cache Local + Fallback PostgreSQL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease });
  });

  describe("buscarAtendimentos - Fallback PostgreSQL", () => {
    it("deve retornar atendimentos com paginação via PostgreSQL quando cache está vazio", async () => {
      const { buscarAtendimentos } = await import("./relatorioAtendimentos");

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: "150" }] })
        .mockResolvedValueOnce({
          rows: [
            {
              numatend: "12345",
              tipo_atendimento: "Internação",
              codserv: "01",
              servico: "INTERNACAO CIRURGICA",
              codplaco: "001",
              plano_convenio: "UNIMED",
              codproven: null,
              proveniente: null,
              data_atendimento: "2025-03-01",
              data_saida: "2025-03-05",
              censo: null,
              codcc: "CC01",
              centro_custo: "CENTRO CIRURGICO",
              codprest: "P01",
              prestador: "DR. SILVA",
              procprin: "31102360",
              procedimento_principal: "PROSTATAVESICULECTOMIA RADICAL",
              cidprin: "C61",
              diagnostico_cid: "NEOPLASIA MALIGNA DA PROSTATA",
              carater_atendimento: "Eletivo",
              codpac: "PAC01",
              paciente: "JOAO DA SILVA",
            },
          ],
        });

      const resultado = await buscarAtendimentos({
        dataInicio: "2025-01-01",
        dataFim: "2025-12-31",
        limit: 50,
        offset: 0,
      });

      expect(resultado.total).toBe(150);
      expect(resultado.pagina).toBe(1);
      expect(resultado.totalPaginas).toBe(3);
      expect(resultado.dados).toHaveLength(1);
      expect(resultado.dados[0].numatend).toBe("12345");
      expect(resultado.dados[0].servico).toBe("INTERNACAO CIRURGICA");
      expect(resultado.dados[0].plano_convenio).toBe("UNIMED");
      expect(resultado.dados[0].prestador).toBe("DR. SILVA");
      expect(resultado.dados[0].paciente).toBe("JOAO DA SILVA");
      expect(resultado.fonte).toBe("postgresql_direto");
      expect(mockRelease).toHaveBeenCalled();
    });

    it("deve aplicar filtros opcionais na query PostgreSQL", async () => {
      const { buscarAtendimentos } = await import("./relatorioAtendimentos");

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: "10" }] })
        .mockResolvedValueOnce({ rows: [] });

      await buscarAtendimentos({
        dataInicio: "2025-01-01",
        dataFim: "2025-12-31",
        tipoAtendimento: "I",
        codServ: "01",
        codPlaco: "001",
        codPrest: "P01",
        codCc: "CC01",
        carater: "EL",
      });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toHaveLength(8);
      expect(countCall[1]).toContain("I");
      expect(countCall[1]).toContain("01");
      expect(countCall[1]).toContain("001");
      expect(countCall[1]).toContain("P01");
      expect(countCall[1]).toContain("CC01");
      expect(countCall[1]).toContain("EL");

      const mainCall = mockQuery.mock.calls[1];
      expect(mainCall[1]).toHaveLength(10);
    });

    it("deve usar valores padrão para limit e offset", async () => {
      const { buscarAtendimentos } = await import("./relatorioAtendimentos");

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: "5" }] })
        .mockResolvedValueOnce({ rows: [] });

      const resultado = await buscarAtendimentos({
        dataInicio: "2025-01-01",
        dataFim: "2025-12-31",
      });

      const mainCall = mockQuery.mock.calls[1];
      const params = mainCall[1];
      expect(params[params.length - 2]).toBe(100);
      expect(params[params.length - 1]).toBe(0);
      expect(resultado.pagina).toBe(1);
      expect(resultado.fonte).toBe("postgresql_direto");
    });

    it("deve calcular totalPaginas corretamente", async () => {
      const { buscarAtendimentos } = await import("./relatorioAtendimentos");

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: "251" }] })
        .mockResolvedValueOnce({ rows: [] });

      const resultado = await buscarAtendimentos({
        dataInicio: "2025-01-01",
        dataFim: "2025-12-31",
        limit: 50,
        offset: 100,
      });

      expect(resultado.total).toBe(251);
      expect(resultado.totalPaginas).toBe(6);
      expect(resultado.pagina).toBe(3);
    });

    it("deve liberar a conexão mesmo em caso de erro", async () => {
      const { buscarAtendimentos } = await import("./relatorioAtendimentos");

      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      await expect(
        buscarAtendimentos({
          dataInicio: "2025-01-01",
          dataFim: "2025-12-31",
        })
      ).rejects.toThrow("Database error");

      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe("buscarOpcoesFiltro - Fallback PostgreSQL", () => {
    it("deve retornar todas as opções de filtro via PostgreSQL", async () => {
      const { buscarOpcoesFiltro } = await import("./relatorioAtendimentos");

      mockQuery
        .mockResolvedValueOnce({ rows: [{ codserv: "01", nomeserv: "INTERNACAO" }] })
        .mockResolvedValueOnce({ rows: [{ codplaco: "001", nomeplaco: "UNIMED" }] })
        .mockResolvedValueOnce({ rows: [{ codcc: "CC01", nomecc: "CENTRO CIRURGICO" }] })
        .mockResolvedValueOnce({ rows: [{ codprest: "P01", nomeprest: "DR. SILVA" }] });

      const opcoes = await buscarOpcoesFiltro();

      expect(opcoes.servicos).toHaveLength(1);
      expect(opcoes.servicos[0].nomeserv).toBe("INTERNACAO");
      expect(opcoes.planos).toHaveLength(1);
      expect(opcoes.planos[0].nomeplaco).toBe("UNIMED");
      expect(opcoes.centrosCusto).toHaveLength(1);
      expect(opcoes.centrosCusto[0].nomecc).toBe("CENTRO CIRURGICO");
      expect(opcoes.prestadores).toHaveLength(1);
      expect(opcoes.prestadores[0].nomeprest).toBe("DR. SILVA");
      expect(opcoes.fonte).toBe("postgresql_direto");
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe("Resultado inclui campo fonte", () => {
    it("buscarAtendimentos deve retornar fonte postgresql_direto quando cache vazio", async () => {
      const { buscarAtendimentos } = await import("./relatorioAtendimentos");

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: "0" }] })
        .mockResolvedValueOnce({ rows: [] });

      const resultado = await buscarAtendimentos({
        dataInicio: "2025-01-01",
        dataFim: "2025-12-31",
      });

      expect(resultado.fonte).toBe("postgresql_direto");
    });
  });

  describe("obterStatusSincronizacao", () => {
    it("deve retornar null quando banco local não disponível", async () => {
      const { obterStatusSincronizacao } = await import("./relatorioAtendimentos");

      const status = await obterStatusSincronizacao(1);
      expect(status).toBeNull();
    });
  });

  describe("sincronizarRelatorioAtendimentos", () => {
    it("deve retornar erro quando banco local não disponível", async () => {
      const { sincronizarRelatorioAtendimentos } = await import("./relatorioAtendimentos");

      const result = await sincronizarRelatorioAtendimentos(1, "2025-01-01", "2025-12-31");
      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain("não disponível");
      expect(result.totalRegistros).toBe(0);
    });
  });

  describe("buscarMetricasDashboard - Fallback PostgreSQL", () => {
    it("deve retornar métricas agregadas via PostgreSQL quando cache vazio", async () => {
      const { buscarMetricasDashboard } = await import("./relatorioAtendimentos");

      // Mock all 8 parallel queries for metrics
      mockQuery
        // Total
        .mockResolvedValueOnce({ rows: [{ total: "500" }] })
        // Por médico
        .mockResolvedValueOnce({
          rows: [
            { nome: "DR. SILVA", codigo: "P01", total: "120" },
            { nome: "DRA. SANTOS", codigo: "P02", total: "80" },
          ],
        })
        // Por tipo
        .mockResolvedValueOnce({
          rows: [
            { nome: "Internação", total: "200" },
            { nome: "Ambulatorial", total: "250" },
            { nome: "Emergência", total: "50" },
          ],
        })
        // Por plano
        .mockResolvedValueOnce({
          rows: [
            { nome: "UNIMED", codigo: "001", total: "300" },
            { nome: "BRADESCO SAUDE", codigo: "002", total: "200" },
          ],
        })
        // Por serviço
        .mockResolvedValueOnce({
          rows: [
            { nome: "INTERNACAO CIRURGICA", codigo: "01", total: "250" },
            { nome: "AMBULATORIO", codigo: "02", total: "250" },
          ],
        })
        // Por mês/ano
        .mockResolvedValueOnce({
          rows: [
            { mes_ano: "2025-01", total: "80" },
            { mes_ano: "2025-02", total: "90" },
            { mes_ano: "2025-03", total: "110" },
          ],
        })
        // Por CID
        .mockResolvedValueOnce({
          rows: [
            { nome: "NEOPLASIA MALIGNA DA PROSTATA", codigo: "C61", total: "45" },
            { nome: "HIPERPLASIA BENIGNA DA PROSTATA", codigo: "N40", total: "30" },
          ],
        })
        // Por procedimento
        .mockResolvedValueOnce({
          rows: [
            { nome: "PROSTATAVESICULECTOMIA RADICAL", codigo: "31102360", total: "40" },
            { nome: "CONSULTA MEDICA", codigo: "10101012", total: "100" },
          ],
        });

      const metricas = await buscarMetricasDashboard({
        dataInicio: "2025-01-01",
        dataFim: "2025-12-31",
      });

      // Verificar totais
      expect(metricas.totalAtendimentos).toBe(500);
      expect(metricas.totalMedicos).toBe(2);
      expect(metricas.totalConvenios).toBe(2);
      expect(metricas.totalProcedimentos).toBe(2);
      expect(metricas.fonte).toBe("postgresql_direto");

      // Verificar por médico
      expect(metricas.porMedico).toHaveLength(2);
      expect(metricas.porMedico[0].nome).toBe("DR. SILVA");
      expect(metricas.porMedico[0].total).toBe(120);

      // Verificar por tipo
      expect(metricas.porTipo).toHaveLength(3);
      expect(metricas.porTipo[0].nome).toBe("Internação");
      expect(metricas.porTipo[0].total).toBe(200);

      // Verificar por plano
      expect(metricas.porPlano).toHaveLength(2);
      expect(metricas.porPlano[0].nome).toBe("UNIMED");
      expect(metricas.porPlano[0].total).toBe(300);

      // Verificar por serviço
      expect(metricas.porServico).toHaveLength(2);
      expect(metricas.porServico[0].nome).toBe("INTERNACAO CIRURGICA");

      // Verificar por mês/ano
      expect(metricas.porMesAno).toHaveLength(3);
      expect(metricas.porMesAno[0].mesAno).toBe("2025-01");
      expect(metricas.porMesAno[0].total).toBe(80);

      // Verificar por CID
      expect(metricas.porCid).toHaveLength(2);
      expect(metricas.porCid[0].codigo).toBe("C61");
      expect(metricas.porCid[0].total).toBe(45);

      // Verificar por procedimento
      expect(metricas.porProcedimento).toHaveLength(2);
      expect(metricas.porProcedimento[0].codigo).toBe("31102360");
      expect(metricas.porProcedimento[0].total).toBe(40);

      expect(mockRelease).toHaveBeenCalled();
    });

    it("deve liberar conexão mesmo em caso de erro nas métricas", async () => {
      const { buscarMetricasDashboard } = await import("./relatorioAtendimentos");

      mockQuery.mockRejectedValueOnce(new Error("Metrics query error"));

      await expect(
        buscarMetricasDashboard({
          dataInicio: "2025-01-01",
          dataFim: "2025-12-31",
        })
      ).rejects.toThrow("Metrics query error");

      expect(mockRelease).toHaveBeenCalled();
    });

    it("deve retornar valores zerados quando não há dados", async () => {
      const { buscarMetricasDashboard } = await import("./relatorioAtendimentos");

      // Mock all 8 queries returning empty results
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: "0" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const metricas = await buscarMetricasDashboard({
        dataInicio: "2025-01-01",
        dataFim: "2025-12-31",
      });

      expect(metricas.totalAtendimentos).toBe(0);
      expect(metricas.totalMedicos).toBe(0);
      expect(metricas.totalConvenios).toBe(0);
      expect(metricas.totalProcedimentos).toBe(0);
      expect(metricas.porMedico).toHaveLength(0);
      expect(metricas.porTipo).toHaveLength(0);
      expect(metricas.porPlano).toHaveLength(0);
      expect(metricas.porServico).toHaveLength(0);
      expect(metricas.porMesAno).toHaveLength(0);
      expect(metricas.porCid).toHaveLength(0);
      expect(metricas.porProcedimento).toHaveLength(0);
      expect(metricas.fonte).toBe("postgresql_direto");
    });
  });
});
