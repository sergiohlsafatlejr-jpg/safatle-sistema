import { describe, it, expect } from "vitest";

/**
 * Testes unitários para a lógica de custos por convênio.
 * Testa as funções de cálculo de margem, agrupamento por convênio,
 * e a lógica de cruzamento entre itens faturados e custos de estoque.
 */

// ====== Helpers de cálculo (replicados da lógica do backend) ======

function calcularMargem(valorFaturado: number, custoEstoque: number): number {
  return valorFaturado - custoEstoque;
}

function calcularMargemPercent(valorFaturado: number, custoEstoque: number): number {
  if (valorFaturado === 0) return 0;
  return ((valorFaturado - custoEstoque) / valorFaturado) * 100;
}

interface ItemFaturado {
  codigoItem: string;
  descricao: string;
  tipoItem: string;
  convenio: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  competencia: string;
  numeroConta: string;
}

interface CustoProduto {
  codprod: string;
  custoEstoque: number;
  custoMultFat: number;
  valormm: number;
}

interface ResumoConvenio {
  convenio: string;
  totalContas: number;
  totalItens: number;
  valorFaturado: number;
  custoEstoque: number;
  margem: number;
  margemPercent: number;
}

function agruparPorConvenio(itens: ItemFaturado[], custos: Map<string, CustoProduto>): ResumoConvenio[] {
  const map = new Map<string, {
    contas: Set<string>;
    totalItens: number;
    valorFaturado: number;
    custoEstoque: number;
  }>();

  for (const item of itens) {
    const existing = map.get(item.convenio) || {
      contas: new Set<string>(),
      totalItens: 0,
      valorFaturado: 0,
      custoEstoque: 0,
    };
    existing.contas.add(item.numeroConta);
    existing.totalItens += 1;
    existing.valorFaturado += item.valorTotal;

    const custo = custos.get(item.codigoItem);
    if (custo) {
      existing.custoEstoque += custo.custoEstoque * item.quantidade;
    }

    map.set(item.convenio, existing);
  }

  return Array.from(map.entries()).map(([convenio, data]) => ({
    convenio,
    totalContas: data.contas.size,
    totalItens: data.totalItens,
    valorFaturado: data.valorFaturado,
    custoEstoque: data.custoEstoque,
    margem: calcularMargem(data.valorFaturado, data.custoEstoque),
    margemPercent: calcularMargemPercent(data.valorFaturado, data.custoEstoque),
  })).sort((a, b) => b.valorFaturado - a.valorFaturado);
}

function calcularKpis(resumos: ResumoConvenio[]) {
  const valorFaturadoTotal = resumos.reduce((acc, r) => acc + r.valorFaturado, 0);
  const custoEstoqueTotal = resumos.reduce((acc, r) => acc + r.custoEstoque, 0);
  const margemTotal = valorFaturadoTotal - custoEstoqueTotal;
  const margemMediaPercent = valorFaturadoTotal > 0
    ? ((valorFaturadoTotal - custoEstoqueTotal) / valorFaturadoTotal) * 100
    : 0;
  const totalConvenios = resumos.length;
  const conveniMaiorFaturamento = resumos.length > 0 ? resumos[0].convenio : "-";
  const totalItensAnalisados = resumos.reduce((acc, r) => acc + r.totalItens, 0);

  return {
    valorFaturadoTotal,
    custoEstoqueTotal,
    margemTotal,
    margemMediaPercent,
    totalConvenios,
    conveniMaiorFaturamento,
    totalItensAnalisados,
    totalItensSemCusto: 0,
  };
}

function identificarTopItensPrejuizo(
  itens: ItemFaturado[],
  custos: Map<string, CustoProduto>,
  limit: number = 20
) {
  const resultado = itens
    .map((item) => {
      const custo = custos.get(item.codigoItem);
      const custoUnit = custo?.custoEstoque || 0;
      const custoTotal = custoUnit * item.quantidade;
      const margem = item.valorTotal - custoTotal;
      const margemPercent = item.valorTotal > 0
        ? ((item.valorTotal - custoTotal) / item.valorTotal) * 100
        : 0;
      return {
        codigoItem: item.codigoItem,
        descricao: item.descricao,
        tipoItem: item.tipoItem,
        convenio: item.convenio,
        quantidade: item.quantidade,
        valorFaturado: item.valorTotal,
        custoEstoque: custoUnit,
        custoTotal,
        margem,
        margemPercent,
      };
    })
    .filter((r) => r.margem < 0)
    .sort((a, b) => a.margem - b.margem)
    .slice(0, limit);

  return resultado;
}

// ====== TESTES ======

describe("Cálculos de Margem", () => {
  it("deve calcular margem positiva corretamente", () => {
    expect(calcularMargem(100, 60)).toBe(40);
  });

  it("deve calcular margem negativa (prejuízo)", () => {
    expect(calcularMargem(50, 80)).toBe(-30);
  });

  it("deve calcular margem zero quando valores iguais", () => {
    expect(calcularMargem(100, 100)).toBe(0);
  });

  it("deve calcular margem percentual corretamente", () => {
    expect(calcularMargemPercent(100, 60)).toBeCloseTo(40);
  });

  it("deve calcular margem percentual negativa", () => {
    expect(calcularMargemPercent(50, 80)).toBeCloseTo(-60);
  });

  it("deve retornar 0% quando valor faturado é zero", () => {
    expect(calcularMargemPercent(0, 50)).toBe(0);
  });
});

describe("Agrupamento por Convênio", () => {
  const custos = new Map<string, CustoProduto>([
    ["001", { codprod: "001", custoEstoque: 10, custoMultFat: 12, valormm: 15 }],
    ["002", { codprod: "002", custoEstoque: 5, custoMultFat: 6, valormm: 8 }],
    ["003", { codprod: "003", custoEstoque: 20, custoMultFat: 22, valormm: 25 }],
  ]);

  const itens: ItemFaturado[] = [
    { codigoItem: "001", descricao: "Produto A", tipoItem: "M", convenio: "UNIMED", quantidade: 10, valorUnitario: 15, valorTotal: 150, competencia: "2026-01", numeroConta: "100" },
    { codigoItem: "002", descricao: "Produto B", tipoItem: "M", convenio: "UNIMED", quantidade: 5, valorUnitario: 8, valorTotal: 40, competencia: "2026-01", numeroConta: "100" },
    { codigoItem: "001", descricao: "Produto A", tipoItem: "M", convenio: "BRADESCO", quantidade: 3, valorUnitario: 15, valorTotal: 45, competencia: "2026-01", numeroConta: "200" },
    { codigoItem: "003", descricao: "Produto C", tipoItem: "H", convenio: "BRADESCO", quantidade: 2, valorUnitario: 25, valorTotal: 50, competencia: "2026-01", numeroConta: "200" },
    { codigoItem: "002", descricao: "Produto B", tipoItem: "M", convenio: "IPASGO", quantidade: 8, valorUnitario: 8, valorTotal: 64, competencia: "2026-02", numeroConta: "300" },
  ];

  it("deve agrupar itens por convênio corretamente", () => {
    const resultado = agruparPorConvenio(itens, custos);
    expect(resultado).toHaveLength(3);
  });

  it("deve ordenar por valor faturado decrescente", () => {
    const resultado = agruparPorConvenio(itens, custos);
    expect(resultado[0].convenio).toBe("UNIMED"); // 150 + 40 = 190
    expect(resultado[0].valorFaturado).toBe(190);
  });

  it("deve contar contas distintas por convênio", () => {
    const resultado = agruparPorConvenio(itens, custos);
    const unimed = resultado.find((r) => r.convenio === "UNIMED")!;
    expect(unimed.totalContas).toBe(1); // conta 100
    const bradesco = resultado.find((r) => r.convenio === "BRADESCO")!;
    expect(bradesco.totalContas).toBe(1); // conta 200
  });

  it("deve calcular custo de estoque por convênio", () => {
    const resultado = agruparPorConvenio(itens, custos);
    const unimed = resultado.find((r) => r.convenio === "UNIMED")!;
    // Produto A: 10 * 10 = 100, Produto B: 5 * 5 = 25 → total = 125
    expect(unimed.custoEstoque).toBe(125);
  });

  it("deve calcular margem por convênio", () => {
    const resultado = agruparPorConvenio(itens, custos);
    const unimed = resultado.find((r) => r.convenio === "UNIMED")!;
    // Faturado: 190, Custo: 125 → Margem: 65
    expect(unimed.margem).toBe(65);
  });

  it("deve lidar com itens sem custo cadastrado", () => {
    const itensSemCusto: ItemFaturado[] = [
      { codigoItem: "999", descricao: "Sem custo", tipoItem: "M", convenio: "UNIMED", quantidade: 5, valorUnitario: 10, valorTotal: 50, competencia: "2026-01", numeroConta: "400" },
    ];
    const resultado = agruparPorConvenio(itensSemCusto, custos);
    expect(resultado[0].custoEstoque).toBe(0);
    expect(resultado[0].margem).toBe(50);
  });

  it("deve retornar array vazio quando não há itens", () => {
    const resultado = agruparPorConvenio([], custos);
    expect(resultado).toHaveLength(0);
  });
});

describe("KPIs Gerais", () => {
  it("deve calcular KPIs totais corretamente", () => {
    const resumos: ResumoConvenio[] = [
      { convenio: "UNIMED", totalContas: 5, totalItens: 50, valorFaturado: 10000, custoEstoque: 6000, margem: 4000, margemPercent: 40 },
      { convenio: "BRADESCO", totalContas: 3, totalItens: 30, valorFaturado: 5000, custoEstoque: 4000, margem: 1000, margemPercent: 20 },
    ];
    const kpis = calcularKpis(resumos);
    expect(kpis.valorFaturadoTotal).toBe(15000);
    expect(kpis.custoEstoqueTotal).toBe(10000);
    expect(kpis.margemTotal).toBe(5000);
    expect(kpis.totalConvenios).toBe(2);
    expect(kpis.conveniMaiorFaturamento).toBe("UNIMED");
    expect(kpis.totalItensAnalisados).toBe(80);
  });

  it("deve retornar valores zerados quando não há dados", () => {
    const kpis = calcularKpis([]);
    expect(kpis.valorFaturadoTotal).toBe(0);
    expect(kpis.margemTotal).toBe(0);
    expect(kpis.totalConvenios).toBe(0);
    expect(kpis.conveniMaiorFaturamento).toBe("-");
  });

  it("deve calcular margem média percentual corretamente", () => {
    const resumos: ResumoConvenio[] = [
      { convenio: "UNIMED", totalContas: 1, totalItens: 10, valorFaturado: 1000, custoEstoque: 600, margem: 400, margemPercent: 40 },
    ];
    const kpis = calcularKpis(resumos);
    expect(kpis.margemMediaPercent).toBeCloseTo(40);
  });
});

describe("Top Itens com Prejuízo", () => {
  const custos = new Map<string, CustoProduto>([
    ["001", { codprod: "001", custoEstoque: 50, custoMultFat: 55, valormm: 60 }],
    ["002", { codprod: "002", custoEstoque: 5, custoMultFat: 6, valormm: 8 }],
    ["003", { codprod: "003", custoEstoque: 100, custoMultFat: 110, valormm: 120 }],
  ]);

  const itens: ItemFaturado[] = [
    { codigoItem: "001", descricao: "Produto caro", tipoItem: "M", convenio: "UNIMED", quantidade: 10, valorUnitario: 30, valorTotal: 300, competencia: "2026-01", numeroConta: "100" },
    { codigoItem: "002", descricao: "Produto barato", tipoItem: "M", convenio: "UNIMED", quantidade: 5, valorUnitario: 8, valorTotal: 40, competencia: "2026-01", numeroConta: "100" },
    { codigoItem: "003", descricao: "Produto muito caro", tipoItem: "H", convenio: "BRADESCO", quantidade: 2, valorUnitario: 80, valorTotal: 160, competencia: "2026-01", numeroConta: "200" },
  ];

  it("deve identificar itens com prejuízo (margem negativa)", () => {
    const resultado = identificarTopItensPrejuizo(itens, custos);
    // Produto caro: faturado 300, custo 500 → margem -200
    // Produto muito caro: faturado 160, custo 200 → margem -40
    // Produto barato: faturado 40, custo 25 → margem +15 (não entra)
    expect(resultado).toHaveLength(2);
  });

  it("deve ordenar por maior prejuízo primeiro", () => {
    const resultado = identificarTopItensPrejuizo(itens, custos);
    expect(resultado[0].descricao).toBe("Produto caro"); // margem -200
    expect(resultado[1].descricao).toBe("Produto muito caro"); // margem -40
  });

  it("deve calcular custo total corretamente", () => {
    const resultado = identificarTopItensPrejuizo(itens, custos);
    const produtoCaro = resultado.find((r) => r.codigoItem === "001")!;
    expect(produtoCaro.custoTotal).toBe(500); // 50 * 10
    expect(produtoCaro.margem).toBe(-200); // 300 - 500
  });

  it("deve respeitar o limite de resultados", () => {
    const resultado = identificarTopItensPrejuizo(itens, custos, 1);
    expect(resultado).toHaveLength(1);
  });

  it("deve retornar array vazio quando não há prejuízo", () => {
    const itensSemPrejuizo: ItemFaturado[] = [
      { codigoItem: "002", descricao: "Produto barato", tipoItem: "M", convenio: "UNIMED", quantidade: 5, valorUnitario: 8, valorTotal: 40, competencia: "2026-01", numeroConta: "100" },
    ];
    const resultado = identificarTopItensPrejuizo(itensSemPrejuizo, custos);
    expect(resultado).toHaveLength(0);
  });
});

describe("Múltiplas Competências", () => {
  const custos = new Map<string, CustoProduto>([
    ["001", { codprod: "001", custoEstoque: 10, custoMultFat: 12, valormm: 15 }],
  ]);

  it("deve agrupar itens de diferentes competências no mesmo convênio", () => {
    const itens: ItemFaturado[] = [
      { codigoItem: "001", descricao: "Produto A", tipoItem: "M", convenio: "UNIMED", quantidade: 5, valorUnitario: 15, valorTotal: 75, competencia: "2026-01", numeroConta: "100" },
      { codigoItem: "001", descricao: "Produto A", tipoItem: "M", convenio: "UNIMED", quantidade: 3, valorUnitario: 15, valorTotal: 45, competencia: "2026-02", numeroConta: "200" },
    ];
    const resultado = agruparPorConvenio(itens, custos);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].valorFaturado).toBe(120);
    expect(resultado[0].totalContas).toBe(2);
  });
});
