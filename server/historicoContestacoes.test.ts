import { describe, it, expect, vi } from "vitest";
import { 
  GLOSAS_TISS, 
  obterInfoGlosa, 
  obterArgumentoContestacao,
  obterAcoesRecomendadas,
  obterDocumentosSugeridos,
  traduzirCodigoGlosa
} from "../shared/glossaryGlosas";

describe("Histórico de Contestações - Dicionário de Glosas", () => {
  describe("obterInfoGlosa", () => {
    it("deve retornar informações para código existente", () => {
      const info = obterInfoGlosa("2108");
      expect(info).toBeDefined();
      expect(info?.codigo).toBe("2108");
      expect(info?.descricao).toBeDefined();
    });

    it("deve retornar undefined para código inexistente", () => {
      const info = obterInfoGlosa("9999");
      expect(info).toBeUndefined();
    });
  });

  describe("obterArgumentoContestacao", () => {
    it("deve retornar argumento para código existente", () => {
      const argumento = obterArgumentoContestacao("2108");
      expect(argumento).toBeDefined();
      expect(typeof argumento).toBe("string");
      expect(argumento.length).toBeGreaterThan(10);
    });

    it("deve retornar mensagem padrão para código inexistente", () => {
      const argumento = obterArgumentoContestacao("9999");
      expect(argumento).toBeDefined();
      expect(typeof argumento).toBe("string");
    });
  });

  describe("obterAcoesRecomendadas", () => {
    it("deve retornar array de ações para código existente", () => {
      const acoes = obterAcoesRecomendadas("2108");
      expect(Array.isArray(acoes)).toBe(true);
      expect(acoes.length).toBeGreaterThan(0);
    });

    it("deve retornar array para código inexistente", () => {
      const acoes = obterAcoesRecomendadas("9999");
      expect(Array.isArray(acoes)).toBe(true);
    });
  });

  describe("obterDocumentosSugeridos", () => {
    it("deve retornar array de documentos para código existente", () => {
      const docs = obterDocumentosSugeridos("2108");
      expect(Array.isArray(docs)).toBe(true);
    });

    it("deve retornar array para código inexistente", () => {
      const docs = obterDocumentosSugeridos("9999");
      expect(Array.isArray(docs)).toBe(true);
    });
  });

  describe("traduzirCodigoGlosa", () => {
    it("deve traduzir código existente", () => {
      const descricao = traduzirCodigoGlosa("2108");
      expect(descricao).toBeDefined();
      expect(descricao).not.toBe("2108");
    });

    it("deve retornar descrição genérica se não existir no dicionário", () => {
      const descricao = traduzirCodigoGlosa("9999");
      expect(descricao).toContain("9999");
    });
  });

  describe("GLOSAS_TISS", () => {
    it("deve conter códigos de glosa", () => {
      expect(Object.keys(GLOSAS_TISS).length).toBeGreaterThan(0);
    });

    it("cada glosa deve ter estrutura correta", () => {
      const primeirosCodigos = Object.keys(GLOSAS_TISS).slice(0, 5);
      primeirosCodigos.forEach(codigo => {
        const glosa = GLOSAS_TISS[codigo];
        expect(glosa.codigo).toBe(codigo);
        expect(glosa.descricao).toBeDefined();
        expect(glosa.grupo).toBeDefined();
      });
    });

    it("glosas devem ter argumentoContestacao quando disponível", () => {
      const glosaComArgumento = Object.values(GLOSAS_TISS).find(g => g.argumentoContestacao);
      expect(glosaComArgumento).toBeDefined();
      expect(glosaComArgumento?.argumentoContestacao?.length).toBeGreaterThan(10);
    });

    it("glosas devem ter acoesRecomendadas quando disponível", () => {
      const glosaComAcoes = Object.values(GLOSAS_TISS).find(g => g.acoesRecomendadas && g.acoesRecomendadas.length > 0);
      expect(glosaComAcoes).toBeDefined();
      expect(Array.isArray(glosaComAcoes?.acoesRecomendadas)).toBe(true);
    });
  });
});
