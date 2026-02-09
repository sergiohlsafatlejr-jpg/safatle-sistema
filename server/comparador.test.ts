import { describe, expect, it } from "vitest";
import { compararProcedimentos, toDivergenciaInsert, gerarResumoComparacao } from "./comparador";

describe("compararProcedimentos", () => {
  it("compara itens com campos legados (procedimentos)", () => {
    const enviados = [
      { id: 1, codigo: "10101012", quantidade: 1, valorUnitario: "100.00", valorTotal: "100.00", pacienteCarteirinha: "123", guiaNumero: "G001" },
      { id: 2, codigo: "10101020", quantidade: 2, valorUnitario: "50.00", valorTotal: "100.00", pacienteCarteirinha: "123", guiaNumero: "G001" },
    ];
    const retornados = [
      { id: 3, codigo: "10101012", quantidade: 1, valorUnitario: "100.00", valorTotal: "100.00", pacienteCarteirinha: "123", guiaNumero: "G001" },
      { id: 4, codigo: "10101020", quantidade: 2, valorUnitario: "50.00", valorTotal: "100.00", pacienteCarteirinha: "123", guiaNumero: "G001" },
    ];

    const resultado = compararProcedimentos(enviados, retornados);

    expect(resultado.totalItensEnviados).toBe(2);
    expect(resultado.totalItensRetornados).toBe(2);
    expect(resultado.totalDivergencias).toBe(0);
    expect(resultado.valorTotalEnviado).toBe(200);
    expect(resultado.valorTotalRetornado).toBe(200);
    expect(resultado.diferencaValor).toBe(0);
  });

  it("compara itens com campos de faturamento_tiss (codigoItem, valorFaturado, etc.)", () => {
    const enviados = [
      { id: 1, codigoItem: "10101012", quantidade: "1", valorFaturado: "150.00", carteiraBeneficiario: "456", numeroGuiaPrestador: "G002" },
      { id: 2, codigoItem: "20201010", quantidade: "3", valorFaturado: "75.00", carteiraBeneficiario: "456", numeroGuiaPrestador: "G002" },
    ];
    const retornados = [
      { id: 3, codigoItem: "10101012", quantidade: "1", valorFaturado: "150.00", carteiraBeneficiario: "456", numeroGuiaPrestador: "G002" },
      { id: 4, codigoItem: "20201010", quantidade: "3", valorFaturado: "60.00", carteiraBeneficiario: "456", numeroGuiaPrestador: "G002" },
    ];

    const resultado = compararProcedimentos(enviados, retornados);

    expect(resultado.totalItensEnviados).toBe(2);
    expect(resultado.totalItensRetornados).toBe(2);
    expect(resultado.totalDivergencias).toBe(1);
    expect(resultado.valorTotalEnviado).toBe(225);
    expect(resultado.valorTotalRetornado).toBe(210);
    expect(resultado.diferencaValor).toBeCloseTo(15, 2);

    // A divergência deve ser de valor no item 20201010
    const divValor = resultado.divergencias.find(d => d.tipo === "valor");
    expect(divValor).toBeDefined();
    expect(divValor!.valorEnviado).toBe("75.00");
    expect(divValor!.valorRetornado).toBe("60.00");
  });

  it("detecta itens ausentes no retorno (faturamento_tiss)", () => {
    const enviados = [
      { id: 1, codigoItem: "10101012", quantidade: "1", valorFaturado: "100.00", carteiraBeneficiario: "789", numeroGuiaPrestador: "G003" },
      { id: 2, codigoItem: "30301030", quantidade: "1", valorFaturado: "200.00", carteiraBeneficiario: "789", numeroGuiaPrestador: "G003" },
    ];
    const retornados = [
      { id: 3, codigoItem: "10101012", quantidade: "1", valorFaturado: "100.00", carteiraBeneficiario: "789", numeroGuiaPrestador: "G003" },
    ];

    const resultado = compararProcedimentos(enviados, retornados);

    expect(resultado.totalDivergencias).toBe(1);
    const divAusente = resultado.divergencias.find(d => d.tipo === "ausente_retorno");
    expect(divAusente).toBeDefined();
    expect(divAusente!.valorEnviado).toBe("200.00");
  });

  it("detecta itens ausentes no envio (faturamento_tiss)", () => {
    const enviados = [
      { id: 1, codigoItem: "10101012", quantidade: "1", valorFaturado: "100.00", carteiraBeneficiario: "111", numeroGuiaPrestador: "G004" },
    ];
    const retornados = [
      { id: 2, codigoItem: "10101012", quantidade: "1", valorFaturado: "100.00", carteiraBeneficiario: "111", numeroGuiaPrestador: "G004" },
      { id: 3, codigoItem: "40401040", quantidade: "1", valorFaturado: "50.00", carteiraBeneficiario: "111", numeroGuiaPrestador: "G004" },
    ];

    const resultado = compararProcedimentos(enviados, retornados);

    expect(resultado.totalDivergencias).toBe(1);
    const divAusente = resultado.divergencias.find(d => d.tipo === "ausente_envio");
    expect(divAusente).toBeDefined();
    expect(divAusente!.valorRetornado).toBe("50.00");
  });

  it("detecta divergência de quantidade (faturamento_tiss)", () => {
    const enviados = [
      { id: 1, codigoItem: "10101012", quantidade: "5", valorFaturado: "500.00", carteiraBeneficiario: "222", numeroGuiaPrestador: "G005" },
    ];
    const retornados = [
      { id: 2, codigoItem: "10101012", quantidade: "3", valorFaturado: "500.00", carteiraBeneficiario: "222", numeroGuiaPrestador: "G005" },
    ];

    const resultado = compararProcedimentos(enviados, retornados);

    expect(resultado.totalDivergencias).toBe(1);
    const divQtd = resultado.divergencias.find(d => d.tipo === "quantidade");
    expect(divQtd).toBeDefined();
    expect(divQtd!.valorEnviado).toBe("5");
    expect(divQtd!.valorRetornado).toBe("3");
  });

  it("funciona com campos mistos (legado + faturamento_tiss)", () => {
    // Simula cenário onde enviados vêm de procedimentos e retornados de faturamento_tiss
    const enviados = [
      { id: 1, codigo: "10101012", quantidade: 1, valorTotal: "100.00", pacienteCarteirinha: "333", guiaNumero: "G006" },
    ];
    const retornados = [
      { id: 2, codigoItem: "10101012", quantidade: "1", valorFaturado: "100.00", carteiraBeneficiario: "333", numeroGuiaPrestador: "G006" },
    ];

    const resultado = compararProcedimentos(enviados, retornados);

    expect(resultado.totalDivergencias).toBe(0);
    expect(resultado.valorTotalEnviado).toBe(100);
    expect(resultado.valorTotalRetornado).toBe(100);
  });
});

describe("toDivergenciaInsert", () => {
  it("converte divergência detalhada para formato de inserção", () => {
    const div = {
      tipo: "valor" as const,
      procedimentoEnviadoId: 1,
      procedimentoRetornadoId: 2,
      campo: "valorTotal",
      valorEnviado: "100.00",
      valorRetornado: "90.00",
      diferenca: 10,
      descricao: "Divergência de valor",
    };

    const result = toDivergenciaInsert(div, 42);

    expect(result.comparacaoId).toBe(42);
    expect(result.tipo).toBe("valor");
    expect(result.procedimentoEnviadoId).toBe(1);
    expect(result.procedimentoRetornadoId).toBe(2);
    expect(result.valorEnviado).toBe("100.00");
    expect(result.valorRetornado).toBe("90.00");
    expect(result.diferenca).toBe("10");
    expect(result.resolvido).toBe("nao");
  });
});

describe("gerarResumoComparacao", () => {
  it("gera resumo estatístico correto", () => {
    const result = {
      totalItensEnviados: 10,
      totalItensRetornados: 8,
      totalDivergencias: 3,
      valorTotalEnviado: 1000,
      valorTotalRetornado: 800,
      diferencaValor: 200,
      divergencias: [
        { tipo: "valor" as const, descricao: "d1" },
        { tipo: "valor" as const, descricao: "d2" },
        { tipo: "ausente_retorno" as const, descricao: "d3" },
      ],
    };

    const resumo = gerarResumoComparacao(result);

    expect(resumo.percentualDivergencia).toBe(30);
    expect(resumo.percentualValorRecuperado).toBe(80);
    expect(resumo.tiposDivergencia).toEqual({
      valor: 2,
      ausente_retorno: 1,
    });
  });
});
