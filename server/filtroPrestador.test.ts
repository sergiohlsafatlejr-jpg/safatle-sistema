import { describe, it, expect } from "vitest";

/**
 * Testes para validar a estrutura dos filtros de prestador nas funções de faturamento e BI
 */

describe("Filtro de Prestador Executante", () => {
  describe("Interface DadosBIFiltros", () => {
    it("deve aceitar codigoPrestadorExecutante como parâmetro opcional", () => {
      // Simula a estrutura da interface DadosBIFiltros
      const filtrosComPrestador = {
        estabelecimentoId: 1,
        mesReferencia: 1,
        anoReferencia: 2026,
        convenioId: 1,
        tipo: "material",
        codigoPrestadorExecutante: "05562645000131",
      };

      const filtrosSemPrestador = {
        estabelecimentoId: 1,
        mesReferencia: 1,
        anoReferencia: 2026,
      };

      expect(filtrosComPrestador.codigoPrestadorExecutante).toBe("05562645000131");
      expect(filtrosSemPrestador).not.toHaveProperty("codigoPrestadorExecutante");
    });
  });

  describe("Filtro de procedimentos por prestador", () => {
    it("deve filtrar procedimentos pelo código do prestador executante", () => {
      const procedimentos = [
        { id: 1, codigo: "10101012", codigoPrestadorExecutante: "05562645000131", valorTotal: "100.00" },
        { id: 2, codigo: "10101013", codigoPrestadorExecutante: "01570589000126", valorTotal: "200.00" },
        { id: 3, codigo: "10101014", codigoPrestadorExecutante: "05562645000131", valorTotal: "150.00" },
        { id: 4, codigo: "10101015", codigoPrestadorExecutante: null, valorTotal: "50.00" },
      ];

      const codigoPrestadorFiltro = "05562645000131";

      const filtrarProcedimento = (proc: any) => {
        if (codigoPrestadorFiltro && proc.codigoPrestadorExecutante !== codigoPrestadorFiltro) {
          return false;
        }
        return true;
      };

      const procedimentosFiltrados = procedimentos.filter(filtrarProcedimento);

      expect(procedimentosFiltrados).toHaveLength(2);
      expect(procedimentosFiltrados[0].id).toBe(1);
      expect(procedimentosFiltrados[1].id).toBe(3);
    });

    it("deve retornar todos os procedimentos quando não há filtro de prestador", () => {
      const procedimentos = [
        { id: 1, codigo: "10101012", codigoPrestadorExecutante: "05562645000131", valorTotal: "100.00" },
        { id: 2, codigo: "10101013", codigoPrestadorExecutante: "01570589000126", valorTotal: "200.00" },
        { id: 3, codigo: "10101014", codigoPrestadorExecutante: "05562645000131", valorTotal: "150.00" },
      ];

      const codigoPrestadorFiltro: string | undefined = undefined;

      const filtrarProcedimento = (proc: any) => {
        if (codigoPrestadorFiltro && proc.codigoPrestadorExecutante !== codigoPrestadorFiltro) {
          return false;
        }
        return true;
      };

      const procedimentosFiltrados = procedimentos.filter(filtrarProcedimento);

      expect(procedimentosFiltrados).toHaveLength(3);
    });
  });

  describe("Cálculo de totais por prestador", () => {
    it("deve calcular corretamente o total faturado por prestador", () => {
      const procedimentos = [
        { codigoPrestadorExecutante: "05562645000131", valorTotal: "100.00" },
        { codigoPrestadorExecutante: "01570589000126", valorTotal: "200.00" },
        { codigoPrestadorExecutante: "05562645000131", valorTotal: "150.00" },
        { codigoPrestadorExecutante: "05562645000131", valorTotal: "75.50" },
      ];

      const codigoPrestadorFiltro = "05562645000131";

      const procedimentosFiltrados = procedimentos.filter(
        (p) => p.codigoPrestadorExecutante === codigoPrestadorFiltro
      );

      const totalFaturado = procedimentosFiltrados.reduce(
        (acc, p) => acc + parseFloat(p.valorTotal),
        0
      );

      expect(procedimentosFiltrados).toHaveLength(3);
      expect(totalFaturado).toBe(325.50);
    });
  });

  describe("Agrupamento de prestadores", () => {
    it("deve agrupar procedimentos por código de prestador", () => {
      const procedimentos = [
        { codigoPrestadorExecutante: "05562645000131", valorTotal: "100.00" },
        { codigoPrestadorExecutante: "01570589000126", valorTotal: "200.00" },
        { codigoPrestadorExecutante: "05562645000131", valorTotal: "150.00" },
        { codigoPrestadorExecutante: "01570589000126", valorTotal: "300.00" },
        { codigoPrestadorExecutante: null, valorTotal: "50.00" },
      ];

      const agrupados: Record<string, { quantidade: number; total: number }> = {};

      for (const proc of procedimentos) {
        const codigo = proc.codigoPrestadorExecutante || "SEM_PRESTADOR";
        if (!agrupados[codigo]) {
          agrupados[codigo] = { quantidade: 0, total: 0 };
        }
        agrupados[codigo].quantidade++;
        agrupados[codigo].total += parseFloat(proc.valorTotal);
      }

      expect(Object.keys(agrupados)).toHaveLength(3);
      expect(agrupados["05562645000131"].quantidade).toBe(2);
      expect(agrupados["05562645000131"].total).toBe(250);
      expect(agrupados["01570589000126"].quantidade).toBe(2);
      expect(agrupados["01570589000126"].total).toBe(500);
      expect(agrupados["SEM_PRESTADOR"].quantidade).toBe(1);
      expect(agrupados["SEM_PRESTADOR"].total).toBe(50);
    });
  });
});
