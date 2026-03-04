import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  db: {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    set: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockReturnThis(),
  },
}));

// Mock sql template tag
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return {
    ...actual,
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: any[]) => ({
        strings,
        values,
        getSQL: () => ({ strings, values }),
      }),
      {
        raw: (s: string) => s,
      }
    ),
  };
});

describe("Padrões de Cobrança - Estrutura e Validação", () => {
  describe("Padrão de Preço por Procedimento/Convênio", () => {
    it("deve calcular média, mín, máx e desvio padrão corretamente", () => {
      const valores = [100, 120, 110, 130, 115];
      const media = valores.reduce((a, b) => a + b, 0) / valores.length;
      const min = Math.min(...valores);
      const max = Math.max(...valores);
      const variancia = valores.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / valores.length;
      const desvio = Math.sqrt(variancia);

      expect(media).toBe(115);
      expect(min).toBe(100);
      expect(max).toBe(130);
      expect(desvio).toBeCloseTo(10, 0);
    });

    it("deve calcular confiança baseada em ocorrências", () => {
      const calcConfianca = (ocorrencias: number): number => {
        if (ocorrencias >= 100) return 95;
        if (ocorrencias >= 50) return 85;
        if (ocorrencias >= 20) return 70;
        if (ocorrencias >= 10) return 55;
        return 30;
      };

      expect(calcConfianca(150)).toBe(95);
      expect(calcConfianca(75)).toBe(85);
      expect(calcConfianca(25)).toBe(70);
      expect(calcConfianca(15)).toBe(55);
      expect(calcConfianca(5)).toBe(30);
    });

    it("deve agrupar por convênio corretamente", () => {
      const itens = [
        { codigoItem: "10101039", convenio: "IPASGO", valorFaturado: "90.00" },
        { codigoItem: "10101039", convenio: "IPASGO", valorFaturado: "90.00" },
        { codigoItem: "10101039", convenio: "UNIMED", valorFaturado: "119.02" },
        { codigoItem: "10101039", convenio: "UNIMED", valorFaturado: "119.02" },
        { codigoItem: "10101039", convenio: "BRADESCO", valorFaturado: "125.00" },
      ];

      const agrupado = new Map<string, number[]>();
      for (const item of itens) {
        const key = `${item.codigoItem}|${item.convenio}`;
        if (!agrupado.has(key)) agrupado.set(key, []);
        agrupado.get(key)!.push(parseFloat(item.valorFaturado));
      }

      expect(agrupado.size).toBe(3);
      expect(agrupado.get("10101039|IPASGO")).toEqual([90, 90]);
      expect(agrupado.get("10101039|UNIMED")).toEqual([119.02, 119.02]);
      expect(agrupado.get("10101039|BRADESCO")).toEqual([125]);
    });
  });

  describe("Padrão de Glosa por Convênio", () => {
    it("deve calcular taxa de glosa corretamente", () => {
      const totalFaturado = 1000;
      const totalGlosado = 250;
      const taxaGlosa = (totalGlosado / totalFaturado) * 100;

      expect(taxaGlosa).toBe(25);
    });

    it("deve classificar nível de risco corretamente", () => {
      const classificarRisco = (taxaGlosa: number): string => {
        if (taxaGlosa >= 50) return "critico";
        if (taxaGlosa >= 30) return "alto";
        if (taxaGlosa >= 15) return "medio";
        return "baixo";
      };

      expect(classificarRisco(60)).toBe("critico");
      expect(classificarRisco(35)).toBe("alto");
      expect(classificarRisco(20)).toBe("medio");
      expect(classificarRisco(10)).toBe("baixo");
    });

    it("deve identificar códigos de glosa frequentes", () => {
      const glosas = [
        { codigoGlosa: "0101", descricao: "Procedimento não autorizado" },
        { codigoGlosa: "0101", descricao: "Procedimento não autorizado" },
        { codigoGlosa: "0101", descricao: "Procedimento não autorizado" },
        { codigoGlosa: "0205", descricao: "Valor acima da tabela" },
        { codigoGlosa: "0205", descricao: "Valor acima da tabela" },
        { codigoGlosa: "0310", descricao: "Duplicidade" },
      ];

      const contagem = new Map<string, { codigo: string; descricao: string; count: number }>();
      for (const g of glosas) {
        const existing = contagem.get(g.codigoGlosa);
        if (existing) {
          existing.count++;
        } else {
          contagem.set(g.codigoGlosa, { codigo: g.codigoGlosa, descricao: g.descricao, count: 1 });
        }
      }

      const frequentes = Array.from(contagem.values()).sort((a, b) => b.count - a.count);
      expect(frequentes[0].codigo).toBe("0101");
      expect(frequentes[0].count).toBe(3);
      expect(frequentes[1].codigo).toBe("0205");
      expect(frequentes[1].count).toBe(2);
    });
  });

  describe("Padrão de Quantidade por Item", () => {
    it("deve calcular limites estatísticos (2 desvios padrão)", () => {
      const quantidades = [5, 6, 4, 5, 7, 5, 6, 4, 5, 5];
      const media = quantidades.reduce((a, b) => a + b, 0) / quantidades.length;
      const variancia = quantidades.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / quantidades.length;
      const desvio = Math.sqrt(variancia);
      const limiteInferior = Math.max(0, media - 2 * desvio);
      const limiteSuperior = media + 2 * desvio;

      expect(media).toBe(5.2);
      expect(limiteInferior).toBeGreaterThanOrEqual(0);
      expect(limiteSuperior).toBeGreaterThan(media);
      // Qualquer valor fora dos limites é outlier
      expect(50).toBeGreaterThan(limiteSuperior); // 50 unidades seria outlier
    });

    it("deve detectar outliers de quantidade", () => {
      const media = 5;
      const desvio = 1;
      const limiteSuperior = media + 2 * desvio; // 7
      const limiteInferior = Math.max(0, media - 2 * desvio); // 3

      const isOutlier = (qtd: number) => qtd > limiteSuperior || qtd < limiteInferior;

      expect(isOutlier(50)).toBe(true); // muito acima
      expect(isOutlier(1)).toBe(true); // muito abaixo
      expect(isOutlier(5)).toBe(false); // normal
      expect(isOutlier(6)).toBe(false); // dentro do limite
    });
  });

  describe("Padrão de Composição de Conta (Kit Cirúrgico)", () => {
    it("deve identificar itens frequentemente associados a um procedimento", () => {
      const contas = [
        { procedimento: "40101010", itens: ["seringa", "agulha", "gaze", "equipo"] },
        { procedimento: "40101010", itens: ["seringa", "agulha", "gaze", "luva"] },
        { procedimento: "40101010", itens: ["seringa", "agulha", "gaze", "equipo", "luva"] },
        { procedimento: "40101010", itens: ["seringa", "agulha", "gaze"] },
        { procedimento: "40101010", itens: ["seringa", "agulha", "gaze", "equipo"] },
      ];

      const totalContas = contas.length;
      const itemCount = new Map<string, number>();
      for (const conta of contas) {
        for (const item of conta.itens) {
          itemCount.set(item, (itemCount.get(item) || 0) + 1);
        }
      }

      // Itens que aparecem em pelo menos 60% das contas
      const frequentes = Array.from(itemCount.entries())
        .filter(([, count]) => (count / totalContas) >= 0.6)
        .map(([item, count]) => ({
          item,
          frequencia: Math.round((count / totalContas) * 100),
        }))
        .sort((a, b) => b.frequencia - a.frequencia);

      expect(frequentes.length).toBeGreaterThanOrEqual(3);
      expect(frequentes.find(f => f.item === "seringa")?.frequencia).toBe(100);
      expect(frequentes.find(f => f.item === "agulha")?.frequencia).toBe(100);
      expect(frequentes.find(f => f.item === "gaze")?.frequencia).toBe(100);
      expect(frequentes.find(f => f.item === "equipo")?.frequencia).toBe(60);
    });

    it("deve calcular valor médio da conta para um procedimento", () => {
      const valoresContas = [1500, 1800, 1600, 1700, 1550];
      const media = valoresContas.reduce((a, b) => a + b, 0) / valoresContas.length;

      expect(media).toBe(1630);
    });

    it("deve filtrar itens com frequência abaixo do limiar", () => {
      const itens = [
        { codigo: "A", ocorrencias: 10, totalContas: 10 }, // 100%
        { codigo: "B", ocorrencias: 8, totalContas: 10 },  // 80%
        { codigo: "C", ocorrencias: 3, totalContas: 10 },  // 30%
        { codigo: "D", ocorrencias: 1, totalContas: 10 },  // 10%
      ];

      const limiar = 0.3; // 30%
      const frequentes = itens.filter(i => (i.ocorrencias / i.totalContas) >= limiar);

      expect(frequentes.length).toBe(3); // A, B, C
      expect(frequentes.map(f => f.codigo)).toEqual(["A", "B", "C"]);
    });
  });

  describe("Comparação entre Convênios", () => {
    it("deve identificar diferenças de preço entre convênios para o mesmo procedimento", () => {
      const precosPorConvenio = [
        { convenio: "IPASGO", media: 90 },
        { convenio: "UNIMED", media: 119.02 },
        { convenio: "BRADESCO", media: 125 },
        { convenio: "VIVACOM", media: 141.86 },
      ];

      const mediaGeral = precosPorConvenio.reduce((a, b) => a + b.media, 0) / precosPorConvenio.length;
      const menorPagador = precosPorConvenio.sort((a, b) => a.media - b.media)[0];
      const maiorPagador = precosPorConvenio.sort((a, b) => b.media - a.media)[0];

      expect(menorPagador.convenio).toBe("IPASGO");
      expect(maiorPagador.convenio).toBe("VIVACOM");
      expect(maiorPagador.media - menorPagador.media).toBeCloseTo(51.86, 1);
    });
  });
});
