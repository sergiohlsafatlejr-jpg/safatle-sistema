import { describe, it, expect } from "vitest";

/**
 * Testes unitários para a lógica de custos por convênio.
 * Testa os cálculos de margem, agrupamento por convênio e item,
 * e a lógica de cruzamento entre lançamentos (lancamen) e custos de estoque (tabprod).
 *
 * Fonte de dados: PostgreSQL Warleine
 * - lancamen: itens cobrados (vltotreais, vlcusto, quantidade, codprod)
 * - contas: cabeçalho da conta (numconta → codplaco)
 * - cadplaco: cadastro de convênios (codplaco → nomeplaco)
 * - tabprod: custo de estoque (codprod → custoatual)
 */

// ====== Tipos que espelham a interface do backend ======

interface ConvenioDetalhe {
  convenio: string;
  codplaco: string;
  quantidade: number;
  valorCobrado: number;
  vlcusto: number;
  custoTotal: number;
  margem: number;
  resultado: "lucro" | "prejuizo" | "empate";
}

interface ItemCustoConvenio {
  codprod: string;
  descricao: string;
  tipoItem: string;
  custoEstoque: number;
  convenios: ConvenioDetalhe[];
}

interface ResumoConvenio {
  convenio: string;
  codplaco: string;
  totalLancamentos: number;
  totalFaturado: number;
  totalCusto: number;
  margem: number;
  margemPercent: number;
  resultado: "lucro" | "prejuizo" | "empate";
}

// ====== Helpers de cálculo (replicam a lógica do backend) ======

function calcularMargem(valorCobrado: number, custoTotal: number): number {
  return Math.round((valorCobrado - custoTotal) * 100) / 100;
}

function determinarResultado(margem: number): "lucro" | "prejuizo" | "empate" {
  if (margem > 0.01) return "lucro";
  if (margem < -0.01) return "prejuizo";
  return "empate";
}

function calcularMargemPercent(totalFaturado: number, totalCusto: number): number {
  if (totalCusto <= 0) return 0;
  return Math.round(((totalFaturado - totalCusto) / totalCusto) * 10000) / 100;
}

// Simula o que o backend faz: recebe rows do PostgreSQL e agrupa
interface LancamenRow {
  codprod: string;
  descricao: string;
  tipoitem: string;
  codplaco: string;
  convenio: string;
  total_quantidade: number;
  total_cobrado: number;
  total_vlcusto: number;
  custo_estoque_unitario: number;
  num_lancamentos: number;
}

function processarItens(rows: LancamenRow[]): {
  itens: ItemCustoConvenio[];
  totalItensSemCusto: number;
  valorFaturadoTotal: number;
  custoTotalGeral: number;
} {
  const itensMap = new Map<string, ItemCustoConvenio>();
  let totalItensSemCusto = 0;
  let valorFaturadoTotal = 0;
  let custoTotalGeral = 0;

  for (const row of rows) {
    const codprod = (row.codprod || "").trim();
    const descricao = (row.descricao || "").trim();
    const tipoItem = row.tipoitem || "P";
    const convenio = row.convenio || "Sem Convênio";
    const codplaco = row.codplaco || "";
    const quantidade = row.total_quantidade;
    const valorCobrado = row.total_cobrado;
    const vlcusto = row.total_vlcusto;
    const custoEstoqueUnit = row.custo_estoque_unitario;
    const custoTotal = custoEstoqueUnit > 0 ? custoEstoqueUnit * quantidade : vlcusto;
    const margem = valorCobrado - custoTotal;

    if (custoEstoqueUnit === 0 && vlcusto === 0) {
      totalItensSemCusto++;
    }

    valorFaturadoTotal += valorCobrado;
    custoTotalGeral += custoTotal;

    if (!itensMap.has(codprod)) {
      itensMap.set(codprod, {
        codprod,
        descricao,
        tipoItem,
        custoEstoque: custoEstoqueUnit,
        convenios: [],
      });
    }

    const item = itensMap.get(codprod)!;
    item.convenios.push({
      convenio,
      codplaco,
      quantidade: Math.round(quantidade * 100) / 100,
      valorCobrado: Math.round(valorCobrado * 100) / 100,
      vlcusto: Math.round(vlcusto * 100) / 100,
      custoTotal: Math.round(custoTotal * 100) / 100,
      margem: Math.round(margem * 100) / 100,
      resultado: determinarResultado(margem),
    });
  }

  return {
    itens: Array.from(itensMap.values()),
    totalItensSemCusto,
    valorFaturadoTotal,
    custoTotalGeral,
  };
}

function processarResumoConvenio(rows: { codplaco: string; convenio: string; total_lancamentos: number; total_faturado: number; total_vlcusto: number; total_custo_estoque: number }[]): ResumoConvenio[] {
  return rows.map((r) => {
    const totalFaturado = r.total_faturado;
    const totalCustoEstoque = r.total_custo_estoque;
    const totalVlcusto = r.total_vlcusto;
    const totalCusto = totalCustoEstoque > 0 ? totalCustoEstoque : totalVlcusto;
    const margem = totalFaturado - totalCusto;
    return {
      convenio: r.convenio || "Sem Convênio",
      codplaco: r.codplaco || "",
      totalLancamentos: r.total_lancamentos,
      totalFaturado: Math.round(totalFaturado * 100) / 100,
      totalCusto: Math.round(totalCusto * 100) / 100,
      margem: Math.round(margem * 100) / 100,
      margemPercent: calcularMargemPercent(totalFaturado, totalCusto),
      resultado: determinarResultado(margem),
    };
  });
}

// ====== TESTES ======

describe("Cálculos de Margem (nova lógica Warleine)", () => {
  it("deve calcular margem positiva (lucro)", () => {
    expect(calcularMargem(150, 100)).toBe(50);
    expect(determinarResultado(50)).toBe("lucro");
  });

  it("deve calcular margem negativa (prejuízo)", () => {
    expect(calcularMargem(50, 80)).toBe(-30);
    expect(determinarResultado(-30)).toBe("prejuizo");
  });

  it("deve calcular margem zero (empate)", () => {
    expect(calcularMargem(100, 100)).toBe(0);
    expect(determinarResultado(0)).toBe("empate");
  });

  it("deve tratar valores muito próximos de zero como empate", () => {
    expect(determinarResultado(0.005)).toBe("empate");
    expect(determinarResultado(-0.005)).toBe("empate");
  });

  it("deve calcular margem percentual corretamente", () => {
    // (1000 - 600) / 600 * 100 = 66.67%
    expect(calcularMargemPercent(1000, 600)).toBeCloseTo(66.67, 1);
  });

  it("deve retornar 0% quando custo é zero", () => {
    expect(calcularMargemPercent(1000, 0)).toBe(0);
  });

  it("deve calcular margem percentual negativa", () => {
    // (50 - 80) / 80 * 100 = -37.5%
    expect(calcularMargemPercent(50, 80)).toBeCloseTo(-37.5, 1);
  });
});

describe("Processamento de Itens (lancamen → itens agrupados)", () => {
  const sampleRows: LancamenRow[] = [
    {
      codprod: "001",
      descricao: "SERINGA 10ML",
      tipoitem: "P",
      codplaco: "10",
      convenio: "UNIMED",
      total_quantidade: 100,
      total_cobrado: 500,
      total_vlcusto: 200,
      custo_estoque_unitario: 2.5,
      num_lancamentos: 50,
    },
    {
      codprod: "001",
      descricao: "SERINGA 10ML",
      tipoitem: "P",
      codplaco: "20",
      convenio: "IPASGO",
      total_quantidade: 80,
      total_cobrado: 320,
      total_vlcusto: 160,
      custo_estoque_unitario: 2.5,
      num_lancamentos: 30,
    },
    {
      codprod: "002",
      descricao: "DIPIRONA 500MG",
      tipoitem: "P",
      codplaco: "10",
      convenio: "UNIMED",
      total_quantidade: 200,
      total_cobrado: 400,
      total_vlcusto: 300,
      custo_estoque_unitario: 1.5,
      num_lancamentos: 100,
    },
    {
      codprod: "003",
      descricao: "CONSULTA MEDICA",
      tipoitem: "S",
      codplaco: "10",
      convenio: "UNIMED",
      total_quantidade: 10,
      total_cobrado: 1500,
      total_vlcusto: 0,
      custo_estoque_unitario: 0,
      num_lancamentos: 10,
    },
  ];

  it("deve agrupar itens por codprod (SERINGA aparece uma vez com 2 convênios)", () => {
    const { itens } = processarItens(sampleRows);
    expect(itens).toHaveLength(3); // 001, 002, 003
    const seringa = itens.find((i) => i.codprod === "001")!;
    expect(seringa.convenios).toHaveLength(2); // UNIMED e IPASGO
  });

  it("deve calcular custo total usando custoEstoque quando disponível", () => {
    const { itens } = processarItens(sampleRows);
    const seringa = itens.find((i) => i.codprod === "001")!;
    const unimed = seringa.convenios.find((c) => c.convenio === "UNIMED")!;
    // custoEstoque 2.5 * quantidade 100 = 250
    expect(unimed.custoTotal).toBe(250);
    expect(unimed.valorCobrado).toBe(500);
    expect(unimed.margem).toBe(250); // 500 - 250
    expect(unimed.resultado).toBe("lucro");
  });

  it("deve usar vlcusto como fallback quando custoEstoque é zero", () => {
    const { itens } = processarItens(sampleRows);
    const consulta = itens.find((i) => i.codprod === "003")!;
    const unimed = consulta.convenios.find((c) => c.convenio === "UNIMED")!;
    // custoEstoque 0, então usa vlcusto = 0
    expect(unimed.custoTotal).toBe(0);
    expect(unimed.margem).toBe(1500);
  });

  it("deve contar itens sem custo corretamente", () => {
    const { totalItensSemCusto } = processarItens(sampleRows);
    // Consulta médica tem custoEstoque=0 e vlcusto=0
    expect(totalItensSemCusto).toBe(1);
  });

  it("deve calcular totais gerais corretamente", () => {
    const { valorFaturadoTotal, custoTotalGeral } = processarItens(sampleRows);
    // 500 + 320 + 400 + 1500 = 2720
    expect(valorFaturadoTotal).toBe(2720);
    // Seringa UNIMED: 2.5*100=250, Seringa IPASGO: 2.5*80=200, Dipirona: 1.5*200=300, Consulta: 0
    expect(custoTotalGeral).toBe(750);
  });

  it("deve determinar resultado correto por convênio", () => {
    const { itens } = processarItens(sampleRows);
    const dipirona = itens.find((i) => i.codprod === "002")!;
    const unimed = dipirona.convenios[0];
    // valorCobrado 400, custoTotal 1.5*200=300 → margem 100 → lucro
    expect(unimed.resultado).toBe("lucro");
  });

  it("deve lidar com array vazio", () => {
    const { itens, totalItensSemCusto, valorFaturadoTotal } = processarItens([]);
    expect(itens).toHaveLength(0);
    expect(totalItensSemCusto).toBe(0);
    expect(valorFaturadoTotal).toBe(0);
  });

  it("deve identificar prejuízo quando custo > valor cobrado", () => {
    const rows: LancamenRow[] = [
      {
        codprod: "010",
        descricao: "MATERIAL CARO",
        tipoitem: "P",
        codplaco: "10",
        convenio: "UNIMED",
        total_quantidade: 50,
        total_cobrado: 200,
        total_vlcusto: 100,
        custo_estoque_unitario: 10,
        num_lancamentos: 50,
      },
    ];
    const { itens } = processarItens(rows);
    const material = itens[0];
    // custoTotal = 10 * 50 = 500, valorCobrado = 200 → margem = -300
    expect(material.convenios[0].margem).toBe(-300);
    expect(material.convenios[0].resultado).toBe("prejuizo");
  });
});

describe("Processamento de Resumo por Convênio", () => {
  const sampleResumo = [
    {
      codplaco: "10",
      convenio: "UNIMED",
      total_lancamentos: 1000,
      total_faturado: 50000,
      total_vlcusto: 20000,
      total_custo_estoque: 25000,
    },
    {
      codplaco: "20",
      convenio: "IPASGO",
      total_lancamentos: 500,
      total_faturado: 30000,
      total_vlcusto: 15000,
      total_custo_estoque: 18000,
    },
    {
      codplaco: "30",
      convenio: "PARTICULAR",
      total_lancamentos: 200,
      total_faturado: 10000,
      total_vlcusto: 12000,
      total_custo_estoque: 0, // sem custo de estoque, usa vlcusto
    },
  ];

  it("deve processar resumo por convênio corretamente", () => {
    const resultado = processarResumoConvenio(sampleResumo);
    expect(resultado).toHaveLength(3);
  });

  it("deve usar custo de estoque quando disponível", () => {
    const resultado = processarResumoConvenio(sampleResumo);
    const unimed = resultado.find((r) => r.codplaco === "10")!;
    expect(unimed.totalCusto).toBe(25000);
    expect(unimed.margem).toBe(25000); // 50000 - 25000
    expect(unimed.resultado).toBe("lucro");
  });

  it("deve usar vlcusto como fallback quando custo de estoque é zero", () => {
    const resultado = processarResumoConvenio(sampleResumo);
    const particular = resultado.find((r) => r.codplaco === "30")!;
    expect(particular.totalCusto).toBe(12000); // usa vlcusto
    expect(particular.margem).toBe(-2000); // 10000 - 12000
    expect(particular.resultado).toBe("prejuizo");
  });

  it("deve calcular margem percentual corretamente", () => {
    const resultado = processarResumoConvenio(sampleResumo);
    const ipasgo = resultado.find((r) => r.codplaco === "20")!;
    // (30000 - 18000) / 18000 * 100 = 66.67%
    expect(ipasgo.margemPercent).toBeCloseTo(66.67, 1);
  });

  it("deve lidar com convênio sem nome", () => {
    const rows = [
      { codplaco: "", convenio: "", total_lancamentos: 10, total_faturado: 100, total_vlcusto: 50, total_custo_estoque: 0 },
    ];
    const resultado = processarResumoConvenio(rows);
    expect(resultado[0].convenio).toBe("Sem Convênio");
  });
});

describe("Top Itens Prejuízo e Lucro", () => {
  const rows: LancamenRow[] = [
    { codprod: "001", descricao: "ITEM PREJUIZO A", tipoitem: "P", codplaco: "10", convenio: "UNIMED", total_quantidade: 100, total_cobrado: 200, total_vlcusto: 0, custo_estoque_unitario: 5, num_lancamentos: 100 },
    { codprod: "002", descricao: "ITEM PREJUIZO B", tipoitem: "P", codplaco: "10", convenio: "UNIMED", total_quantidade: 50, total_cobrado: 100, total_vlcusto: 0, custo_estoque_unitario: 4, num_lancamentos: 50 },
    { codprod: "003", descricao: "ITEM LUCRO A", tipoitem: "P", codplaco: "10", convenio: "UNIMED", total_quantidade: 10, total_cobrado: 500, total_vlcusto: 0, custo_estoque_unitario: 2, num_lancamentos: 10 },
    { codprod: "004", descricao: "ITEM EMPATE", tipoitem: "P", codplaco: "10", convenio: "UNIMED", total_quantidade: 10, total_cobrado: 50, total_vlcusto: 0, custo_estoque_unitario: 5, num_lancamentos: 10 },
  ];

  it("deve identificar itens com prejuízo", () => {
    const { itens } = processarItens(rows);
    const todosConvenios = itens.flatMap((i) => i.convenios.map((c) => ({ ...c, codprod: i.codprod, descricao: i.descricao })));
    const prejuizo = todosConvenios.filter((c) => c.resultado === "prejuizo");
    // Item A: 200 - 500 = -300 (prejuízo)
    // Item B: 100 - 200 = -100 (prejuízo)
    expect(prejuizo).toHaveLength(2);
  });

  it("deve identificar itens com lucro", () => {
    const { itens } = processarItens(rows);
    const todosConvenios = itens.flatMap((i) => i.convenios.map((c) => ({ ...c, codprod: i.codprod, descricao: i.descricao })));
    const lucro = todosConvenios.filter((c) => c.resultado === "lucro");
    // Item Lucro A: 500 - 20 = 480 (lucro)
    expect(lucro).toHaveLength(1);
  });

  it("deve identificar item empate", () => {
    const { itens } = processarItens(rows);
    const todosConvenios = itens.flatMap((i) => i.convenios.map((c) => ({ ...c, codprod: i.codprod, descricao: i.descricao })));
    const empate = todosConvenios.filter((c) => c.resultado === "empate");
    // Item Empate: 50 - 50 = 0
    expect(empate).toHaveLength(1);
  });

  it("deve ordenar prejuízos do maior para o menor", () => {
    const { itens } = processarItens(rows);
    const todosConvenios = itens.flatMap((i) => i.convenios.map((c) => ({ ...c, codprod: i.codprod, descricao: i.descricao })));
    const prejuizo = todosConvenios
      .filter((c) => c.resultado === "prejuizo")
      .sort((a, b) => a.margem - b.margem);
    expect(prejuizo[0].descricao).toBe("ITEM PREJUIZO A"); // -300
    expect(prejuizo[1].descricao).toBe("ITEM PREJUIZO B"); // -100
  });
});

describe("Cenários com múltiplos convênios para o mesmo item", () => {
  it("deve mostrar o mesmo item com resultados diferentes por convênio", () => {
    const rows: LancamenRow[] = [
      {
        codprod: "001",
        descricao: "SERINGA 10ML",
        tipoitem: "P",
        codplaco: "10",
        convenio: "UNIMED",
        total_quantidade: 100,
        total_cobrado: 500,  // 5.00 por unidade
        total_vlcusto: 0,
        custo_estoque_unitario: 3, // custo 3.00 por unidade
        num_lancamentos: 100,
      },
      {
        codprod: "001",
        descricao: "SERINGA 10ML",
        tipoitem: "P",
        codplaco: "20",
        convenio: "IPASGO",
        total_quantidade: 100,
        total_cobrado: 200,  // 2.00 por unidade
        total_vlcusto: 0,
        custo_estoque_unitario: 3, // custo 3.00 por unidade
        num_lancamentos: 100,
      },
    ];

    const { itens } = processarItens(rows);
    expect(itens).toHaveLength(1); // mesmo codprod, agrupado

    const seringa = itens[0];
    expect(seringa.convenios).toHaveLength(2);

    const unimed = seringa.convenios.find((c) => c.convenio === "UNIMED")!;
    expect(unimed.margem).toBe(200); // 500 - 300
    expect(unimed.resultado).toBe("lucro");

    const ipasgo = seringa.convenios.find((c) => c.convenio === "IPASGO")!;
    expect(ipasgo.margem).toBe(-100); // 200 - 300
    expect(ipasgo.resultado).toBe("prejuizo");
  });

  it("deve demonstrar o cenário real: mesmo item, lucro em um convênio, prejuízo em outro", () => {
    // Cenário: Seringa 10ml custa R$ 3,00 no estoque
    // UNIMED paga R$ 5,00 → lucro de R$ 2,00 por unidade
    // IPASGO paga R$ 2,00 → prejuízo de R$ 1,00 por unidade
    const rows: LancamenRow[] = [
      {
        codprod: "SER10",
        descricao: "SERINGA DESCARTAVEL 10ML",
        tipoitem: "P",
        codplaco: "10",
        convenio: "UNIMED GOIANIA",
        total_quantidade: 500,
        total_cobrado: 2500, // 5.00 cada
        total_vlcusto: 0,
        custo_estoque_unitario: 3,
        num_lancamentos: 500,
      },
      {
        codprod: "SER10",
        descricao: "SERINGA DESCARTAVEL 10ML",
        tipoitem: "P",
        codplaco: "20",
        convenio: "IPASGO",
        total_quantidade: 300,
        total_cobrado: 600, // 2.00 cada
        total_vlcusto: 0,
        custo_estoque_unitario: 3,
        num_lancamentos: 300,
      },
    ];

    const { itens, valorFaturadoTotal, custoTotalGeral } = processarItens(rows);

    const seringa = itens[0];
    const unimed = seringa.convenios.find((c) => c.convenio === "UNIMED GOIANIA")!;
    const ipasgo = seringa.convenios.find((c) => c.convenio === "IPASGO")!;

    // UNIMED: 2500 - (3*500) = 2500 - 1500 = 1000 lucro
    expect(unimed.margem).toBe(1000);
    expect(unimed.resultado).toBe("lucro");

    // IPASGO: 600 - (3*300) = 600 - 900 = -300 prejuízo
    expect(ipasgo.margem).toBe(-300);
    expect(ipasgo.resultado).toBe("prejuizo");

    // Totais
    expect(valorFaturadoTotal).toBe(3100); // 2500 + 600
    expect(custoTotalGeral).toBe(2400); // 1500 + 900
  });
});

describe("Arredondamento e precisão", () => {
  it("deve arredondar valores para 2 casas decimais", () => {
    const rows: LancamenRow[] = [
      {
        codprod: "001",
        descricao: "ITEM TESTE",
        tipoitem: "P",
        codplaco: "10",
        convenio: "TESTE",
        total_quantidade: 3,
        total_cobrado: 10.333,
        total_vlcusto: 0,
        custo_estoque_unitario: 2.777,
        num_lancamentos: 3,
      },
    ];
    const { itens } = processarItens(rows);
    const conv = itens[0].convenios[0];
    // custoTotal = 2.777 * 3 = 8.331 → arredondado 8.33
    expect(conv.custoTotal).toBe(8.33);
    // margem = 10.333 - 8.331 = 2.002 → arredondado 2.0
    expect(conv.margem).toBe(2);
    expect(conv.valorCobrado).toBe(10.33);
  });
});
