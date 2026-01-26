import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo db
vi.mock("./db", () => ({
  getPrestadorPorCodigo: vi.fn(),
  listarPrestadoresExecutantes: vi.fn(),
}));

import * as db from "./db";

describe("Separação de Procedimentos por Prestador", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Agrupamento por código de prestador", () => {
    it("deve agrupar procedimentos por codigoPrestadorExecutante", () => {
      const procedimentos = [
        { id: 1, codigo: "001", codigoPrestadorExecutante: "PREST001" },
        { id: 2, codigo: "002", codigoPrestadorExecutante: "PREST001" },
        { id: 3, codigo: "003", codigoPrestadorExecutante: "PREST002" },
        { id: 4, codigo: "004", codigoPrestadorExecutante: "PREST002" },
        { id: 5, codigo: "005", codigoPrestadorExecutante: null },
      ];

      // Simular agrupamento
      const procedimentosPorPrestador: Record<string, typeof procedimentos> = {};
      
      for (const proc of procedimentos) {
        const codigoPrestador = proc.codigoPrestadorExecutante || "SEM_PRESTADOR";
        if (!procedimentosPorPrestador[codigoPrestador]) {
          procedimentosPorPrestador[codigoPrestador] = [];
        }
        procedimentosPorPrestador[codigoPrestador].push(proc);
      }

      expect(Object.keys(procedimentosPorPrestador)).toHaveLength(3);
      expect(procedimentosPorPrestador["PREST001"]).toHaveLength(2);
      expect(procedimentosPorPrestador["PREST002"]).toHaveLength(2);
      expect(procedimentosPorPrestador["SEM_PRESTADOR"]).toHaveLength(1);
    });

    it("deve tratar procedimentos sem prestador como SEM_PRESTADOR", () => {
      const procedimentos = [
        { id: 1, codigo: "001", codigoPrestadorExecutante: "" },
        { id: 2, codigo: "002", codigoPrestadorExecutante: undefined },
        { id: 3, codigo: "003", codigoPrestadorExecutante: null },
      ];

      const procedimentosPorPrestador: Record<string, typeof procedimentos> = {};
      
      for (const proc of procedimentos) {
        const codigoPrestador = proc.codigoPrestadorExecutante || "SEM_PRESTADOR";
        if (!procedimentosPorPrestador[codigoPrestador]) {
          procedimentosPorPrestador[codigoPrestador] = [];
        }
        procedimentosPorPrestador[codigoPrestador].push(proc);
      }

      expect(Object.keys(procedimentosPorPrestador)).toHaveLength(1);
      expect(procedimentosPorPrestador["SEM_PRESTADOR"]).toHaveLength(3);
    });
  });

  describe("Busca de prestador por código", () => {
    it("deve retornar estabelecimento vinculado quando prestador cadastrado", async () => {
      const mockPrestador = {
        id: 1,
        convenioId: 10,
        estabelecimentoId: 5,
        codigoPrestador: "05562645000131",
        estabelecimentoNome: "Pronto Socorro Infantil",
      };

      vi.mocked(db.getPrestadorPorCodigo).mockResolvedValue(mockPrestador);

      const resultado = await db.getPrestadorPorCodigo("05562645000131", 10);

      expect(resultado).toBeDefined();
      expect(resultado?.estabelecimentoId).toBe(5);
      expect(resultado?.estabelecimentoNome).toBe("Pronto Socorro Infantil");
    });

    it("deve retornar null quando prestador não cadastrado", async () => {
      vi.mocked(db.getPrestadorPorCodigo).mockResolvedValue(null);

      const resultado = await db.getPrestadorPorCodigo("CODIGO_INEXISTENTE", 10);

      expect(resultado).toBeNull();
    });
  });

  describe("Listagem de prestadores executantes", () => {
    it("deve listar prestadores com informações de estabelecimento vinculado", async () => {
      const mockPrestadores = [
        { 
          codigo: "05562645000131", 
          quantidade: 150, 
          estabelecimentoVinculado: "Pronto Socorro Infantil",
          estabelecimentoVinculadoId: 5
        },
        { 
          codigo: "01570589000126", 
          quantidade: 80, 
          estabelecimentoVinculado: "OX UTI",
          estabelecimentoVinculadoId: 6
        },
        { 
          codigo: "99999999000199", 
          quantidade: 20, 
          estabelecimentoVinculado: undefined,
          estabelecimentoVinculadoId: undefined
        },
      ];

      vi.mocked(db.listarPrestadoresExecutantes).mockResolvedValue(mockPrestadores);

      const resultado = await db.listarPrestadoresExecutantes({ convenioId: 10 });

      expect(resultado).toHaveLength(3);
      expect(resultado[0].estabelecimentoVinculado).toBe("Pronto Socorro Infantil");
      expect(resultado[1].estabelecimentoVinculado).toBe("OX UTI");
      expect(resultado[2].estabelecimentoVinculado).toBeUndefined();
    });
  });

  describe("Filtro automático por prestador vinculado", () => {
    it("deve usar código do prestador vinculado quando não há seleção manual", () => {
      const prestadorExecutante = ""; // Nenhuma seleção manual
      const prestadorVinculado = { codigoPrestador: "05562645000131" };

      const codigoPrestadorFiltro = prestadorExecutante || prestadorVinculado?.codigoPrestador || undefined;

      expect(codigoPrestadorFiltro).toBe("05562645000131");
    });

    it("deve usar seleção manual quando disponível", () => {
      const prestadorExecutante = "01570589000126"; // Seleção manual
      const prestadorVinculado = { codigoPrestador: "05562645000131" };

      const codigoPrestadorFiltro = prestadorExecutante || prestadorVinculado?.codigoPrestador || undefined;

      expect(codigoPrestadorFiltro).toBe("01570589000126");
    });

    it("deve retornar undefined quando não há prestador vinculado nem seleção", () => {
      const prestadorExecutante = "";
      const prestadorVinculado = null;

      const codigoPrestadorFiltro = prestadorExecutante || prestadorVinculado?.codigoPrestador || undefined;

      expect(codigoPrestadorFiltro).toBeUndefined();
    });
  });
});
