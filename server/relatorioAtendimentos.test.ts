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

describe("Relatório de Atendimentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease });
  });

  describe("buscarAtendimentos", () => {
    it("deve retornar atendimentos com paginação", async () => {
      // Import after mocks are set up
      const { buscarAtendimentos } = await import("./relatorioAtendimentos");

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: "150" }] }) // count query
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
      expect(mockRelease).toHaveBeenCalled();
    });

    it("deve aplicar filtros opcionais na query", async () => {
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

      // Verify count query was called with all filter params
      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toHaveLength(8); // 2 dates + 6 filters
      expect(countCall[1]).toContain("I");
      expect(countCall[1]).toContain("01");
      expect(countCall[1]).toContain("001");
      expect(countCall[1]).toContain("P01");
      expect(countCall[1]).toContain("CC01");
      expect(countCall[1]).toContain("EL");

      // Verify main query includes limit and offset
      const mainCall = mockQuery.mock.calls[1];
      expect(mainCall[1]).toHaveLength(10); // 8 params + limit + offset
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

      // Default limit=100, offset=0
      const mainCall = mockQuery.mock.calls[1];
      const params = mainCall[1];
      expect(params[params.length - 2]).toBe(100); // default limit
      expect(params[params.length - 1]).toBe(0); // default offset
      expect(resultado.pagina).toBe(1);
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
      expect(resultado.totalPaginas).toBe(6); // ceil(251/50) = 6
      expect(resultado.pagina).toBe(3); // floor(100/50) + 1 = 3
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

  describe("buscarOpcoesFiltro", () => {
    it("deve retornar todas as opções de filtro", async () => {
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
      expect(mockRelease).toHaveBeenCalled();
    });
  });
});
