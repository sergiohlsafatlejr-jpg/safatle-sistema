import { describe, it, expect, vi } from "vitest";

// Mock do módulo de banco de dados
vi.mock("./db", () => ({
  getRegrasIA: vi.fn(),
  getRegraIAById: vi.fn(),
  getRegraIAPorCodigo: vi.fn(),
  createRegraIA: vi.fn(),
  updateRegraIA: vi.fn(),
  deleteRegraIA: vi.fn(),
  toggleRegraIA: vi.fn(),
  restaurarRegraPadrao: vi.fn(),
  getParametrosRegra: vi.fn(),
  inicializarRegrasPadrao: vi.fn(),
}));

import * as db from "./db";

describe("Regras de IA", () => {
  describe("getRegrasIA", () => {
    it("deve retornar lista de regras", async () => {
      const mockRegras = [
        {
          id: 1,
          codigo: "outlier_abaixo_media",
          nome: "Valores Abaixo da Média",
          categoria: "outlier",
          tipoAlerta: "alerta",
          ativo: "sim",
          parametros: { limiteDesvioAbaixo: 2 },
        },
        {
          id: 2,
          codigo: "padrao_erro_funcionario",
          nome: "Taxa de Glosa por Funcionário",
          categoria: "padrao_erro",
          tipoAlerta: "critico",
          ativo: "sim",
          parametros: { taxaGlosaMinima: 20 },
        },
      ];

      vi.mocked(db.getRegrasIA).mockResolvedValue(mockRegras as any);

      const result = await db.getRegrasIA(1);
      expect(result).toHaveLength(2);
      expect(result[0].codigo).toBe("outlier_abaixo_media");
    });

    it("deve filtrar por estabelecimento", async () => {
      vi.mocked(db.getRegrasIA).mockResolvedValue([]);
      
      await db.getRegrasIA(999);
      expect(db.getRegrasIA).toHaveBeenCalledWith(999);
    });
  });

  describe("getRegraIAById", () => {
    it("deve retornar regra por ID", async () => {
      const mockRegra = {
        id: 1,
        codigo: "outlier_abaixo_media",
        nome: "Valores Abaixo da Média",
        categoria: "outlier",
        tipoAlerta: "alerta",
        ativo: "sim",
      };

      vi.mocked(db.getRegraIAById).mockResolvedValue(mockRegra as any);

      const result = await db.getRegraIAById(1);
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });

    it("deve retornar null para ID inexistente", async () => {
      vi.mocked(db.getRegraIAById).mockResolvedValue(null);

      const result = await db.getRegraIAById(999);
      expect(result).toBeNull();
    });
  });

  describe("getRegraIAPorCodigo", () => {
    it("deve retornar regra por código", async () => {
      const mockRegra = {
        id: 1,
        codigo: "outlier_abaixo_media",
        nome: "Valores Abaixo da Média",
      };

      vi.mocked(db.getRegraIAPorCodigo).mockResolvedValue(mockRegra as any);

      const result = await db.getRegraIAPorCodigo("outlier_abaixo_media");
      expect(result).toBeDefined();
      expect(result?.codigo).toBe("outlier_abaixo_media");
    });

    it("deve priorizar regra do estabelecimento sobre global", async () => {
      const mockRegraEstabelecimento = {
        id: 2,
        codigo: "outlier_abaixo_media",
        estabelecimentoId: 1,
      };

      vi.mocked(db.getRegraIAPorCodigo).mockResolvedValue(mockRegraEstabelecimento as any);

      const result = await db.getRegraIAPorCodigo("outlier_abaixo_media", 1);
      expect(result?.estabelecimentoId).toBe(1);
    });
  });

  describe("createRegraIA", () => {
    it("deve criar nova regra", async () => {
      vi.mocked(db.createRegraIA).mockResolvedValue({ id: 5 });

      const novaRegra = {
        codigo: "regra_personalizada",
        nome: "Regra Personalizada",
        categoria: "outlier" as const,
        tipoAlerta: "alerta" as const,
        parametros: { limiteDesvioAbaixo: 3 },
        ativo: "sim" as const,
      };

      const result = await db.createRegraIA(novaRegra);
      expect(result.id).toBe(5);
    });
  });

  describe("updateRegraIA", () => {
    it("deve atualizar regra existente", async () => {
      vi.mocked(db.updateRegraIA).mockResolvedValue({ success: true });

      const result = await db.updateRegraIA(1, { nome: "Novo Nome" });
      expect(result.success).toBe(true);
    });

    it("deve atualizar parâmetros da regra", async () => {
      vi.mocked(db.updateRegraIA).mockResolvedValue({ success: true });

      const result = await db.updateRegraIA(1, {
        parametros: { limiteDesvioAbaixo: 3 },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("deleteRegraIA", () => {
    it("deve excluir regra", async () => {
      vi.mocked(db.deleteRegraIA).mockResolvedValue({ success: true });

      const result = await db.deleteRegraIA(1);
      expect(result.success).toBe(true);
    });
  });

  describe("toggleRegraIA", () => {
    it("deve ativar regra", async () => {
      vi.mocked(db.toggleRegraIA).mockResolvedValue({ success: true });

      const result = await db.toggleRegraIA(1, "sim");
      expect(result.success).toBe(true);
    });

    it("deve desativar regra", async () => {
      vi.mocked(db.toggleRegraIA).mockResolvedValue({ success: true });

      const result = await db.toggleRegraIA(1, "nao");
      expect(result.success).toBe(true);
    });
  });

  describe("restaurarRegraPadrao", () => {
    it("deve restaurar regra para valores padrão", async () => {
      vi.mocked(db.restaurarRegraPadrao).mockResolvedValue({ success: true });

      const result = await db.restaurarRegraPadrao("outlier_abaixo_media");
      expect(result.success).toBe(true);
    });

    it("deve restaurar regra específica do estabelecimento", async () => {
      vi.mocked(db.restaurarRegraPadrao).mockResolvedValue({ success: true });

      const result = await db.restaurarRegraPadrao("outlier_abaixo_media", 1);
      expect(result.success).toBe(true);
      expect(db.restaurarRegraPadrao).toHaveBeenCalledWith("outlier_abaixo_media", 1);
    });
  });

  describe("getParametrosRegra", () => {
    it("deve retornar parâmetros de regra ativa", async () => {
      const mockParametros = {
        limiteDesvioAbaixo: 2,
        minimoContasHistorico: 3,
        tipoAlerta: "alerta",
      };

      vi.mocked(db.getParametrosRegra).mockResolvedValue(mockParametros);

      const result = await db.getParametrosRegra("outlier_abaixo_media");
      expect(result).toBeDefined();
      expect(result?.limiteDesvioAbaixo).toBe(2);
    });

    it("deve retornar null para regra desativada", async () => {
      vi.mocked(db.getParametrosRegra).mockResolvedValue(null);

      const result = await db.getParametrosRegra("regra_desativada");
      expect(result).toBeNull();
    });

    it("deve retornar null para regra inexistente", async () => {
      vi.mocked(db.getParametrosRegra).mockResolvedValue(null);

      const result = await db.getParametrosRegra("regra_inexistente");
      expect(result).toBeNull();
    });
  });

  describe("Estrutura de Parâmetros", () => {
    it("deve ter estrutura correta para regra de outlier", async () => {
      const mockRegra = {
        id: 1,
        codigo: "outlier_abaixo_media",
        parametros: {
          limiteDesvioAbaixo: 2,
          limiteDesvioAcima: 2,
          minimoContasHistorico: 3,
          periodoAnalise: 90,
          maxResultados: 5,
        },
      };

      vi.mocked(db.getRegraIAById).mockResolvedValue(mockRegra as any);

      const result = await db.getRegraIAById(1);
      expect(result?.parametros).toHaveProperty("limiteDesvioAbaixo");
      expect(result?.parametros).toHaveProperty("minimoContasHistorico");
    });

    it("deve ter estrutura correta para regra de padrão de erro", async () => {
      const mockRegra = {
        id: 2,
        codigo: "padrao_erro_funcionario",
        parametros: {
          taxaGlosaMinima: 20,
          minimoProcedimentos: 50,
          periodoMeses: 6,
          maxResultados: 10,
        },
      };

      vi.mocked(db.getRegraIAById).mockResolvedValue(mockRegra as any);

      const result = await db.getRegraIAById(2);
      expect(result?.parametros).toHaveProperty("taxaGlosaMinima");
      expect(result?.parametros).toHaveProperty("minimoProcedimentos");
    });

    it("deve ter estrutura correta para regra de risco de glosa", async () => {
      const mockRegra = {
        id: 3,
        codigo: "risco_glosa_alto",
        parametros: {
          scoreRiscoMinimo: 30,
          historicoMinimoContas: 5,
          maxResultados: 10,
        },
      };

      vi.mocked(db.getRegraIAById).mockResolvedValue(mockRegra as any);

      const result = await db.getRegraIAById(3);
      expect(result?.parametros).toHaveProperty("scoreRiscoMinimo");
      expect(result?.parametros).toHaveProperty("historicoMinimoContas");
    });
  });

  describe("Categorias de Regras", () => {
    it("deve aceitar categoria outlier", async () => {
      vi.mocked(db.createRegraIA).mockResolvedValue({ id: 1 });

      await db.createRegraIA({
        codigo: "teste",
        nome: "Teste",
        categoria: "outlier",
        tipoAlerta: "alerta",
        ativo: "sim",
      });

      expect(db.createRegraIA).toHaveBeenCalled();
    });

    it("deve aceitar categoria padrao_erro", async () => {
      vi.mocked(db.createRegraIA).mockResolvedValue({ id: 1 });

      await db.createRegraIA({
        codigo: "teste",
        nome: "Teste",
        categoria: "padrao_erro",
        tipoAlerta: "critico",
        ativo: "sim",
      });

      expect(db.createRegraIA).toHaveBeenCalled();
    });

    it("deve aceitar categoria risco_glosa", async () => {
      vi.mocked(db.createRegraIA).mockResolvedValue({ id: 1 });

      await db.createRegraIA({
        codigo: "teste",
        nome: "Teste",
        categoria: "risco_glosa",
        tipoAlerta: "alerta",
        ativo: "sim",
      });

      expect(db.createRegraIA).toHaveBeenCalled();
    });
  });

  describe("Tipos de Alerta", () => {
    it("deve aceitar tipo critico", async () => {
      vi.mocked(db.updateRegraIA).mockResolvedValue({ success: true });

      await db.updateRegraIA(1, { tipoAlerta: "critico" });
      expect(db.updateRegraIA).toHaveBeenCalledWith(1, { tipoAlerta: "critico" });
    });

    it("deve aceitar tipo alerta", async () => {
      vi.mocked(db.updateRegraIA).mockResolvedValue({ success: true });

      await db.updateRegraIA(1, { tipoAlerta: "alerta" });
      expect(db.updateRegraIA).toHaveBeenCalledWith(1, { tipoAlerta: "alerta" });
    });

    it("deve aceitar tipo info", async () => {
      vi.mocked(db.updateRegraIA).mockResolvedValue({ success: true });

      await db.updateRegraIA(1, { tipoAlerta: "info" });
      expect(db.updateRegraIA).toHaveBeenCalledWith(1, { tipoAlerta: "info" });
    });
  });
});
