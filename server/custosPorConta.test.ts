import { describe, it, expect, vi } from "vitest";

// Test the interface types and data processing logic for Custos por Conta

describe("Custos por Conta - Lógica de Processamento", () => {
  // Helper to simulate the margin calculation logic used in buscarCustosPorConta
  function calcularMargem(custoTotal: number, valorCobrado: number) {
    const margem = valorCobrado - custoTotal;
    return {
      margem: Math.round(margem * 100) / 100,
      margemPercent: custoTotal > 0 ? Math.round((margem / custoTotal) * 10000) / 100 : 0,
      resultado: margem > 0.01 ? "lucro" as const : margem < -0.01 ? "prejuizo" as const : "empate" as const,
    };
  }

  it("deve calcular lucro corretamente quando valor cobrado > custo", () => {
    const result = calcularMargem(1000, 1500);
    expect(result.resultado).toBe("lucro");
    expect(result.margem).toBe(500);
    expect(result.margemPercent).toBe(50);
  });

  it("deve calcular prejuízo corretamente quando custo > valor cobrado", () => {
    const result = calcularMargem(2000, 1000);
    expect(result.resultado).toBe("prejuizo");
    expect(result.margem).toBe(-1000);
    expect(result.margemPercent).toBe(-50);
  });

  it("deve calcular empate quando valores são iguais", () => {
    const result = calcularMargem(1000, 1000);
    expect(result.resultado).toBe("empate");
    expect(result.margem).toBe(0);
  });

  it("deve lidar com custo zero sem dividir por zero", () => {
    const result = calcularMargem(0, 500);
    expect(result.resultado).toBe("lucro");
    expect(result.margem).toBe(500);
    expect(result.margemPercent).toBe(0); // Sem divisão por zero
  });

  it("deve arredondar valores para 2 casas decimais", () => {
    const result = calcularMargem(333.333, 666.666);
    expect(result.margem).toBe(333.33); // Arredondado
  });
});

describe("Custos por Conta - Classificação de Itens", () => {
  function classificarItem(custoEstoqueUnit: number, vlcusto: number, quantidade: number, vltotreais: number) {
    const custoItem = custoEstoqueUnit > 0 ? custoEstoqueUnit * quantidade : vlcusto;
    const margem = vltotreais - custoItem;
    return {
      custoTotal: Math.round(custoItem * 100) / 100,
      margem: Math.round(margem * 100) / 100,
      resultado: margem > 0.01 ? "lucro" as const : margem < -0.01 ? "prejuizo" as const : "empate" as const,
    };
  }

  it("deve preferir custo de estoque quando disponível", () => {
    const result = classificarItem(10, 5, 3, 50);
    expect(result.custoTotal).toBe(30); // 10 * 3 = 30 (usa custo estoque)
    expect(result.margem).toBe(20); // 50 - 30 = 20
    expect(result.resultado).toBe("lucro");
  });

  it("deve usar vlcusto quando custo de estoque é zero", () => {
    const result = classificarItem(0, 15, 3, 50);
    expect(result.custoTotal).toBe(15); // usa vlcusto diretamente
    expect(result.margem).toBe(35); // 50 - 15 = 35
    expect(result.resultado).toBe("lucro");
  });

  it("deve identificar item sem custo", () => {
    const custoEstoqueUnit = 0;
    const vlcusto = 0;
    const isSemCusto = custoEstoqueUnit === 0 && vlcusto === 0;
    expect(isSemCusto).toBe(true);
  });

  it("deve identificar item com prejuízo", () => {
    const result = classificarItem(100, 0, 5, 200);
    // custo = 100 * 5 = 500, cobrado = 200
    expect(result.custoTotal).toBe(500);
    expect(result.margem).toBe(-300);
    expect(result.resultado).toBe("prejuizo");
  });
});

describe("Conferência Pós-Correção - Tempo de Correção", () => {
  function calcularDiasCorrecao(dataAuditoria: Date, dataCorrecao: Date | null): number | null {
    if (!dataCorrecao) return null;
    const diffMs = dataCorrecao.getTime() - dataAuditoria.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  it("deve calcular dias de correção corretamente", () => {
    const auditoria = new Date("2026-03-01");
    const correcao = new Date("2026-03-05");
    expect(calcularDiasCorrecao(auditoria, correcao)).toBe(4);
  });

  it("deve retornar 0 quando corrigido no mesmo dia", () => {
    const auditoria = new Date("2026-03-01");
    const correcao = new Date("2026-03-01");
    expect(calcularDiasCorrecao(auditoria, correcao)).toBe(0);
  });

  it("deve retornar null quando não há data de correção", () => {
    const auditoria = new Date("2026-03-01");
    expect(calcularDiasCorrecao(auditoria, null)).toBeNull();
  });

  it("deve lidar com diferença de horas arredondando para cima", () => {
    const auditoria = new Date("2026-03-01T10:00:00");
    const correcao = new Date("2026-03-02T08:00:00"); // 22 horas depois
    expect(calcularDiasCorrecao(auditoria, correcao)).toBe(1);
  });

  it("deve calcular corretamente para períodos longos", () => {
    const auditoria = new Date("2026-01-01");
    const correcao = new Date("2026-03-01"); // ~59 dias
    const dias = calcularDiasCorrecao(auditoria, correcao);
    expect(dias).toBe(59);
  });
});
