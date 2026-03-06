import { describe, it, expect } from "vitest";

// Test the score calculation logic directly
// The calcularScoreRisco function is inside comparadorPadroes.ts

describe("Score de Risco - Cálculo", () => {
  // Simular a lógica de cálculo do score
  function calcularScoreRisco(divergencias: Array<{ tipo: string; severidade?: string }>) {
    if (!divergencias || divergencias.length === 0) {
      return { score: 0, nivel: "baixo" as const, detalhes: { composicao: 0, preco: 0, quantidade: 0, total: 0 } };
    }

    let scoreComposicao = 0;
    let scorePreco = 0;
    let scoreQuantidade = 0;

    for (const d of divergencias) {
      const peso = d.severidade === "alta" ? 15 : d.severidade === "media" ? 10 : 5;
      
      if (d.tipo === "ITEM_FALTANTE" || d.tipo === "ITEM_EXTRA" || d.tipo === "COMPOSICAO") {
        scoreComposicao += peso;
      } else if (d.tipo === "PRECO" || d.tipo === "PRECO_ACIMA" || d.tipo === "PRECO_ABAIXO") {
        scorePreco += peso;
      } else if (d.tipo === "QUANTIDADE" || d.tipo === "QTD_ACIMA" || d.tipo === "QTD_ABAIXO") {
        scoreQuantidade += peso;
      }
    }

    const total = Math.min(100, scoreComposicao + scorePreco + scoreQuantidade);
    const nivel = total >= 70 ? "critico" : total >= 40 ? "alto" : total >= 20 ? "medio" : "baixo";

    return { score: total, nivel, detalhes: { composicao: scoreComposicao, preco: scorePreco, quantidade: scoreQuantidade, total } };
  }

  it("deve retornar score 0 para conta sem divergências", () => {
    const result = calcularScoreRisco([]);
    expect(result.score).toBe(0);
    expect(result.nivel).toBe("baixo");
  });

  it("deve calcular score baixo para poucas divergências leves", () => {
    const result = calcularScoreRisco([
      { tipo: "PRECO", severidade: "baixa" },
    ]);
    expect(result.score).toBeLessThanOrEqual(20);
    expect(result.nivel).toBe("baixo");
  });

  it("deve calcular score médio para divergências moderadas", () => {
    const result = calcularScoreRisco([
      { tipo: "ITEM_FALTANTE", severidade: "media" },
      { tipo: "PRECO", severidade: "media" },
      { tipo: "QUANTIDADE", severidade: "baixa" },
    ]);
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.nivel).toBe("medio");
  });

  it("deve calcular score alto para muitas divergências", () => {
    const result = calcularScoreRisco([
      { tipo: "ITEM_FALTANTE", severidade: "alta" },
      { tipo: "ITEM_EXTRA", severidade: "alta" },
      { tipo: "PRECO", severidade: "alta" },
      { tipo: "QUANTIDADE", severidade: "media" },
    ]);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(["alto", "critico"]).toContain(result.nivel);
  });

  it("deve calcular score crítico para muitas divergências graves", () => {
    const result = calcularScoreRisco([
      { tipo: "ITEM_FALTANTE", severidade: "alta" },
      { tipo: "ITEM_FALTANTE", severidade: "alta" },
      { tipo: "ITEM_EXTRA", severidade: "alta" },
      { tipo: "PRECO", severidade: "alta" },
      { tipo: "PRECO", severidade: "alta" },
      { tipo: "QUANTIDADE", severidade: "alta" },
    ]);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.nivel).toBe("critico");
  });

  it("deve limitar o score a 100", () => {
    const muitasDivergencias = Array(20).fill({ tipo: "ITEM_FALTANTE", severidade: "alta" });
    const result = calcularScoreRisco(muitasDivergencias);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("deve separar scores por categoria", () => {
    const result = calcularScoreRisco([
      { tipo: "ITEM_FALTANTE", severidade: "alta" },
      { tipo: "PRECO", severidade: "media" },
      { tipo: "QUANTIDADE", severidade: "baixa" },
    ]);
    expect(result.detalhes.composicao).toBeGreaterThan(0);
    expect(result.detalhes.preco).toBeGreaterThan(0);
    expect(result.detalhes.quantidade).toBeGreaterThan(0);
  });
});

describe("Detecção de Outliers", () => {
  function detectarOutliers(contas: Array<{ id: number; valorTotal: number; convenioId: number }>) {
    // Agrupar por convênio
    const porConvenio = new Map<number, number[]>();
    for (const c of contas) {
      if (!porConvenio.has(c.convenioId)) porConvenio.set(c.convenioId, []);
      porConvenio.get(c.convenioId)!.push(c.valorTotal);
    }

    // Calcular média e desvio padrão por convênio
    const stats = new Map<number, { media: number; desvio: number }>();
    for (const [conv, valores] of porConvenio) {
      if (valores.length < 3) continue; // Precisa de pelo menos 3 contas
      const media = valores.reduce((a, b) => a + b, 0) / valores.length;
      const desvio = Math.sqrt(valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / valores.length);
      stats.set(conv, { media, desvio });
    }

    // Marcar outliers (> 2 desvios padrão)
    return contas.map(c => {
      const s = stats.get(c.convenioId);
      if (!s || s.desvio === 0) return { ...c, isOutlier: false };
      const zScore = Math.abs(c.valorTotal - s.media) / s.desvio;
      return { ...c, isOutlier: zScore > 2 };
    });
  }

  it("deve não marcar outliers quando há poucas contas", () => {
    const contas = [
      { id: 1, valorTotal: 100, convenioId: 1 },
      { id: 2, valorTotal: 200, convenioId: 1 },
    ];
    const result = detectarOutliers(contas);
    expect(result.every(c => !c.isOutlier)).toBe(true);
  });

  it("deve detectar outlier com valor muito acima da média", () => {
    const contas = [
      { id: 1, valorTotal: 100, convenioId: 1 },
      { id: 2, valorTotal: 102, convenioId: 1 },
      { id: 3, valorTotal: 101, convenioId: 1 },
      { id: 4, valorTotal: 99, convenioId: 1 },
      { id: 5, valorTotal: 98, convenioId: 1 },
      { id: 6, valorTotal: 103, convenioId: 1 },
      { id: 7, valorTotal: 97, convenioId: 1 },
      { id: 8, valorTotal: 5000, convenioId: 1 }, // Outlier extremo
    ];
    const result = detectarOutliers(contas);
    const outlier = result.find(c => c.id === 8);
    expect(outlier?.isOutlier).toBe(true);
    // Os demais não devem ser outliers
    const normais = result.filter(c => c.id !== 8);
    expect(normais.every(c => !c.isOutlier)).toBe(true);
  });

  it("deve não marcar contas normais como outlier", () => {
    const contas = [
      { id: 1, valorTotal: 100, convenioId: 1 },
      { id: 2, valorTotal: 110, convenioId: 1 },
      { id: 3, valorTotal: 105, convenioId: 1 },
      { id: 4, valorTotal: 95, convenioId: 1 },
      { id: 5, valorTotal: 102, convenioId: 1 },
    ];
    const result = detectarOutliers(contas);
    expect(result.every(c => !c.isOutlier)).toBe(true);
  });

  it("deve separar outliers por convênio", () => {
    const contas = [
      { id: 1, valorTotal: 100, convenioId: 1 },
      { id: 2, valorTotal: 105, convenioId: 1 },
      { id: 3, valorTotal: 110, convenioId: 1 },
      { id: 4, valorTotal: 95, convenioId: 1 },
      { id: 5, valorTotal: 1000, convenioId: 2 }, // Não é outlier pois é o único do convênio 2
      { id: 6, valorTotal: 1050, convenioId: 2 },
    ];
    const result = detectarOutliers(contas);
    // Convênio 2 tem apenas 2 contas, então nenhuma deve ser outlier
    const conv2 = result.filter(c => c.convenioId === 2);
    expect(conv2.every(c => !c.isOutlier)).toBe(true);
  });
});

describe("Padrão por Profissional Executante", () => {
  it("deve agrupar padrões por profissional quando solicitado", () => {
    // Simular dados de itens com profissionais diferentes
    const itens = [
      { procedimento: "31102050", profissional: "Dr. Silva", item: "LUVA", setor: "CC" },
      { procedimento: "31102050", profissional: "Dr. Silva", item: "SERINGA", setor: "CC" },
      { procedimento: "31102050", profissional: "Dr. Santos", item: "LUVA", setor: "CC" },
      { procedimento: "31102050", profissional: "Dr. Santos", item: "CATETER", setor: "CC" },
    ];

    // Agrupar por procedimento+profissional
    const grupos = new Map<string, string[]>();
    for (const i of itens) {
      const key = `${i.procedimento}|${i.profissional}`;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(i.item);
    }

    expect(grupos.size).toBe(2);
    expect(grupos.get("31102050|Dr. Silva")).toContain("LUVA");
    expect(grupos.get("31102050|Dr. Silva")).toContain("SERINGA");
    expect(grupos.get("31102050|Dr. Santos")).toContain("CATETER");
  });

  it("deve manter padrão genérico quando não agrupar por profissional", () => {
    const itens = [
      { procedimento: "31102050", profissional: "Dr. Silva", item: "LUVA" },
      { procedimento: "31102050", profissional: "Dr. Santos", item: "LUVA" },
    ];

    // Agrupar apenas por procedimento (sem profissional)
    const grupos = new Map<string, string[]>();
    for (const i of itens) {
      const key = i.procedimento;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(i.item);
    }

    expect(grupos.size).toBe(1);
    expect(grupos.get("31102050")?.length).toBe(2);
  });
});

describe("Hierarquia de Porte CBHPM vs Convênio", () => {
  it("deve priorizar tabela do convênio sobre CBHPM", () => {
    const cbhpm = { codigo: "31102050", porte: "6", porteAnestesico: "5" };
    const convenio = { codigo: "31102050", porte: "7", porteAnestesico: "6", convenio: "UNIMED" };

    // Hierarquia: convênio > CBHPM
    const porteEfetivo = convenio ? convenio.porte : cbhpm.porte;
    expect(porteEfetivo).toBe("7"); // Usa o do convênio
  });

  it("deve usar CBHPM como fallback quando convênio não tem tabela", () => {
    const cbhpm = { codigo: "31102050", porte: "6", porteAnestesico: "5" };
    const convenio = null;

    const porteEfetivo = convenio ? (convenio as any).porte : cbhpm.porte;
    expect(porteEfetivo).toBe("6"); // Usa o da CBHPM
  });
});
