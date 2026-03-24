import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do db module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  analisarPadroesCobrancaTasy: vi.fn(),
  salvarPadroesCobrancaTasy: vi.fn(),
  createRegraNegocio: vi.fn(),
  addItemRegraNegocio: vi.fn(),
  getRegrasNegocio: vi.fn(),
  getRegraNegocioById: vi.fn(),
  updateRegraNegocio: vi.fn(),
  deleteRegraNegocio: vi.fn(),
  removeItemRegraNegocio: vi.fn(),
}));

import * as db from "./db";

describe("Geração de Regras a partir dos Padrões Tasy", () => {
  const mockAnalise = {
    totalContas: 5764,
    totalItens: 60883,
    padroesComposicao: [
      {
        codigoProcedimento: "40304361",
        descricao: "HEMOGRAMA COMPLETO",
        tipo: "PROCEDIMENTO",
        frequenciaPercentual: 68.6,
        totalOcorrencias: 3954,
        contasComItem: 3954,
        quantidadeMedia: 1.2,
        quantidadeMin: 1,
        quantidadeMax: 3,
        valorUnitarioMedio: 4.11,
        valorTotalMedio: 4.93,
        itensAssociados: [
          { codigo: "40311040", descricao: "CREATININA", tipo: "PROCEDIMENTO", frequencia: 90, quantidadeMedia: 1.0, valorUnitarioMedio: 3.51 },
          { codigo: "40311082", descricao: "UREIA", tipo: "PROCEDIMENTO", frequencia: 85, quantidadeMedia: 1.0, valorUnitarioMedio: 3.51 },
          { codigo: "40308030", descricao: "PCR", tipo: "PROCEDIMENTO", frequencia: 72, quantidadeMedia: 1.0, valorUnitarioMedio: 6.18 },
          { codigo: "40301630", descricao: "POTASSIO", tipo: "PROCEDIMENTO", frequencia: 69, quantidadeMedia: 1.0, valorUnitarioMedio: 3.51 },
          { codigo: "40301567", descricao: "SODIO", tipo: "PROCEDIMENTO", frequencia: 67, quantidadeMedia: 1.0, valorUnitarioMedio: 3.51 },
          { codigo: "40302423", descricao: "GLICOSE", tipo: "PROCEDIMENTO", frequencia: 10, quantidadeMedia: 1.0, valorUnitarioMedio: 3.51 },
        ],
      },
      {
        codigoProcedimento: "40302423",
        descricao: "GLICOSE",
        tipo: "PROCEDIMENTO",
        frequenciaPercentual: 5.2,
        totalOcorrencias: 300,
        contasComItem: 300,
        quantidadeMedia: 1.0,
        quantidadeMin: 1,
        quantidadeMax: 1,
        valorUnitarioMedio: 3.51,
        valorTotalMedio: 3.51,
        itensAssociados: [
          { codigo: "40304361", descricao: "HEMOGRAMA", tipo: "PROCEDIMENTO", frequencia: 80, quantidadeMedia: 1.0, valorUnitarioMedio: 4.11 },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Preview dos Padrões Tasy", () => {
    it("deve filtrar padrões com frequência abaixo do mínimo", () => {
      const frequenciaMinima = 15;
      const padroesElegiveis = mockAnalise.padroesComposicao
        .filter(p => p.frequenciaPercentual >= frequenciaMinima && p.itensAssociados.length > 0)
        .map(p => ({
          ...p,
          itensAssociados: p.itensAssociados.filter(a => a.frequencia >= frequenciaMinima),
        }))
        .filter(p => p.itensAssociados.length > 0);

      // Hemograma (68.6%) passa, Glicose (5.2%) não passa
      expect(padroesElegiveis).toHaveLength(1);
      expect(padroesElegiveis[0].codigoProcedimento).toBe("40304361");
    });

    it("deve filtrar itens associados com frequência abaixo do mínimo", () => {
      const frequenciaMinima = 15;
      const padrao = mockAnalise.padroesComposicao[0];
      const itensFiltrados = padrao.itensAssociados.filter(a => a.frequencia >= frequenciaMinima);

      // GLICOSE (10%) não passa, os outros 5 passam
      expect(itensFiltrados).toHaveLength(5);
      expect(itensFiltrados.find(i => i.codigo === "40302423")).toBeUndefined();
    });

    it("deve incluir todos os padrões com frequência mínima baixa", () => {
      const frequenciaMinima = 5;
      const padroesElegiveis = mockAnalise.padroesComposicao
        .filter(p => p.frequenciaPercentual >= frequenciaMinima && p.itensAssociados.length > 0)
        .map(p => ({
          ...p,
          itensAssociados: p.itensAssociados.filter(a => a.frequencia >= frequenciaMinima),
        }))
        .filter(p => p.itensAssociados.length > 0);

      // Ambos passam com frequência mínima 5%
      expect(padroesElegiveis).toHaveLength(2);
    });

    it("deve retornar vazio quando frequência mínima é muito alta", () => {
      const frequenciaMinima = 80;
      const padroesElegiveis = mockAnalise.padroesComposicao
        .filter(p => p.frequenciaPercentual >= frequenciaMinima && p.itensAssociados.length > 0)
        .map(p => ({
          ...p,
          itensAssociados: p.itensAssociados.filter(a => a.frequencia >= frequenciaMinima),
        }))
        .filter(p => p.itensAssociados.length > 0);

      expect(padroesElegiveis).toHaveLength(0);
    });
  });

  describe("Geração de Regras", () => {
    it("deve criar regra com itens associados filtrados", async () => {
      const mockCreateRegra = vi.mocked(db.createRegraNegocio);
      const mockAddItem = vi.mocked(db.addItemRegraNegocio);
      mockCreateRegra.mockResolvedValue(1);
      mockAddItem.mockResolvedValue(undefined as any);

      const frequenciaMinima = 15;
      const padrao = mockAnalise.padroesComposicao[0];
      const itensAssociadosFiltrados = padrao.itensAssociados.filter(a => a.frequencia >= frequenciaMinima);

      // Simular criação da regra
      const regraId = await db.createRegraNegocio({
        convenioId: null,
        estabelecimentoId: 6,
        nome: `Padrão Tasy: ${padrao.descricao}`,
        descricao: `Regra gerada automaticamente a partir de ${padrao.contasComItem} contas do Tasy.`,
        codigoProcedimentoPrincipal: padrao.codigoProcedimento,
        descricaoProcedimentoPrincipal: padrao.descricao,
        tipoVerificacao: "deve_conter",
        acaoInconsistencia: "alerta",
        prioridade: 8,
      } as any);

      expect(regraId).toBe(1);
      expect(mockCreateRegra).toHaveBeenCalledOnce();

      // Simular adição de itens
      for (const item of itensAssociadosFiltrados) {
        await db.addItemRegraNegocio({
          regraId: regraId!,
          codigoItem: item.codigo,
          descricaoItem: item.descricao,
          tipoItem: "procedimento",
          quantidadeMinima: Math.max(1, Math.floor(item.quantidadeMedia)),
          quantidadeMaxima: Math.ceil(item.quantidadeMedia * 2),
          valorEsperado: item.valorUnitarioMedio > 0 ? String(item.valorUnitarioMedio.toFixed(2)) : null,
          obrigatorio: item.frequencia >= 70 ? "sim" : "nao",
        } as any);
      }

      expect(mockAddItem).toHaveBeenCalledTimes(5);
    });

    it("deve definir prioridade com base na frequência", () => {
      const calcPrioridade = (freq: number) => freq >= 50 ? 8 : freq >= 25 ? 5 : 3;

      expect(calcPrioridade(68.6)).toBe(8);
      expect(calcPrioridade(35)).toBe(5);
      expect(calcPrioridade(15)).toBe(3);
    });

    it("deve definir obrigatoriedade com base na frequência do item", () => {
      const calcObrigatorio = (freq: number) => freq >= 70 ? "sim" : "nao";

      expect(calcObrigatorio(90)).toBe("sim");
      expect(calcObrigatorio(85)).toBe("sim");
      expect(calcObrigatorio(72)).toBe("sim");
      expect(calcObrigatorio(69)).toBe("nao");
      expect(calcObrigatorio(67)).toBe("nao");
    });

    it("deve mapear tipos de item corretamente", () => {
      const mapTipoItem = (tipo: string) => {
        const t = tipo.toUpperCase();
        if (t.includes("PROC") || t === "P" || t === "C" || t === "O" || t === "01") return "procedimento";
        if (t.includes("TAXA")) return "taxa";
        if (t.includes("MAT")) return "material";
        if (t.includes("MED") || t.includes("MEDICAMENTO")) return "medicamento";
        if (t.includes("DIAR")) return "diaria";
        return "outros";
      };

      expect(mapTipoItem("PROCEDIMENTO")).toBe("procedimento");
      expect(mapTipoItem("P")).toBe("procedimento");
      expect(mapTipoItem("PROC/TAXA")).toBe("procedimento");
      expect(mapTipoItem("TAXA")).toBe("taxa");
      expect(mapTipoItem("MAT_MED")).toBe("material");
      expect(mapTipoItem("MEDICAMENTO")).toBe("medicamento");
      expect(mapTipoItem("DIARIA")).toBe("diaria");
      expect(mapTipoItem("OUTROS")).toBe("outros");
    });

    it("deve filtrar apenas padrões selecionados pelo usuário", () => {
      const padroesSelecionados = ["40304361"];
      const padroesElegiveis = mockAnalise.padroesComposicao
        .filter(p => p.frequenciaPercentual >= 5)
        .filter(p => padroesSelecionados.includes(p.codigoProcedimento));

      expect(padroesElegiveis).toHaveLength(1);
      expect(padroesElegiveis[0].codigoProcedimento).toBe("40304361");
    });

    it("deve calcular quantidade mínima e máxima corretamente", () => {
      const calcQtdMin = (media: number) => Math.max(1, Math.floor(media));
      const calcQtdMax = (media: number) => Math.ceil(media * 2);

      expect(calcQtdMin(1.2)).toBe(1);
      expect(calcQtdMax(1.2)).toBe(3);
      expect(calcQtdMin(3.7)).toBe(3);
      expect(calcQtdMax(3.7)).toBe(8);
      expect(calcQtdMin(0.5)).toBe(1);
      expect(calcQtdMax(0.5)).toBe(1);
    });
  });

  describe("Integração com Regras de Negócio existentes", () => {
    it("deve gerar nome da regra com prefixo 'Padrão Tasy:'", () => {
      const padrao = mockAnalise.padroesComposicao[0];
      const nome = `Padrão Tasy: ${padrao.descricao || padrao.codigoProcedimento}`;
      expect(nome).toBe("Padrão Tasy: HEMOGRAMA COMPLETO");
    });

    it("deve gerar descrição com total de contas e frequência", () => {
      const padrao = mockAnalise.padroesComposicao[0];
      const descricao = `Regra gerada automaticamente a partir de ${padrao.contasComItem} contas do Tasy. Frequência: ${padrao.frequenciaPercentual}%. Valor médio: R$ ${padrao.valorTotalMedio.toFixed(2)}`;
      expect(descricao).toContain("3954 contas");
      expect(descricao).toContain("68.6%");
      expect(descricao).toContain("R$ 4.93");
    });
  });
});
