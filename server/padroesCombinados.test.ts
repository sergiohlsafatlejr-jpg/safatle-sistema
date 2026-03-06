import { describe, expect, it } from "vitest";

/**
 * Testa a lógica de parsing e matching de padrões combinados (CIRURGIA A + CIRURGIA B)
 * Essa lógica é usada em:
 * - comparadorPadroes.ts (matching de composição)
 * - db.ts (comparação com padrões e regras)
 */

// Extrair a lógica de parsing de padrões combinados (mesma usada no código)
function parseCodigosCombinados(codigoProc: string): string[] {
  return codigoProc.includes(" + ")
    ? codigoProc.split(" + ").map(c => c.trim()).filter(Boolean)
    : [codigoProc];
}

function verificarTodosPresentes(codigosCombinados: string[], codigosNaConta: Set<string>): boolean {
  return codigosCombinados.every(c => codigosNaConta.has(c));
}

describe("Padrões Combinados - Parsing", () => {
  it("deve retornar um array com um código para procedimento simples", () => {
    const result = parseCodigosCombinados("10101039");
    expect(result).toEqual(["10101039"]);
  });

  it("deve retornar array com dois códigos para padrão combinado", () => {
    const result = parseCodigosCombinados("10101039 + 20201010");
    expect(result).toEqual(["10101039", "20201010"]);
  });

  it("deve retornar array com três códigos para padrão triplo", () => {
    const result = parseCodigosCombinados("10101039 + 20201010 + 30301020");
    expect(result).toEqual(["10101039", "20201010", "30301020"]);
  });

  it("deve lidar com espaços extras", () => {
    const result = parseCodigosCombinados("10101039  +  20201010");
    expect(result).toEqual(["10101039", "20201010"]);
  });

  it("deve filtrar strings vazias", () => {
    const result = parseCodigosCombinados("10101039 +  + 20201010");
    expect(result).toEqual(["10101039", "20201010"]);
  });

  it("deve lidar com código vazio", () => {
    const result = parseCodigosCombinados("");
    expect(result).toEqual([""]);
  });
});

describe("Padrões Combinados - Matching", () => {
  it("deve dar match quando procedimento simples está na conta", () => {
    const codigos = parseCodigosCombinados("10101039");
    const codigosNaConta = new Set(["10101039", "20201010", "30301020"]);
    expect(verificarTodosPresentes(codigos, codigosNaConta)).toBe(true);
  });

  it("não deve dar match quando procedimento simples não está na conta", () => {
    const codigos = parseCodigosCombinados("99999999");
    const codigosNaConta = new Set(["10101039", "20201010"]);
    expect(verificarTodosPresentes(codigos, codigosNaConta)).toBe(false);
  });

  it("deve dar match quando TODOS os procedimentos combinados estão na conta", () => {
    const codigos = parseCodigosCombinados("10101039 + 20201010");
    const codigosNaConta = new Set(["10101039", "20201010", "30301020"]);
    expect(verificarTodosPresentes(codigos, codigosNaConta)).toBe(true);
  });

  it("não deve dar match quando apenas UM dos procedimentos combinados está na conta", () => {
    const codigos = parseCodigosCombinados("10101039 + 20201010");
    const codigosNaConta = new Set(["10101039", "30301020"]);
    expect(verificarTodosPresentes(codigos, codigosNaConta)).toBe(false);
  });

  it("não deve dar match quando NENHUM dos procedimentos combinados está na conta", () => {
    const codigos = parseCodigosCombinados("10101039 + 20201010");
    const codigosNaConta = new Set(["30301020", "40401030"]);
    expect(verificarTodosPresentes(codigos, codigosNaConta)).toBe(false);
  });

  it("deve dar match para padrão triplo quando todos estão presentes", () => {
    const codigos = parseCodigosCombinados("10101039 + 20201010 + 30301020");
    const codigosNaConta = new Set(["10101039", "20201010", "30301020", "40401030"]);
    expect(verificarTodosPresentes(codigos, codigosNaConta)).toBe(true);
  });

  it("não deve dar match para padrão triplo quando falta um", () => {
    const codigos = parseCodigosCombinados("10101039 + 20201010 + 30301020");
    const codigosNaConta = new Set(["10101039", "20201010"]);
    expect(verificarTodosPresentes(codigos, codigosNaConta)).toBe(false);
  });
});

describe("Padrões Combinados - Cenário Real", () => {
  it("deve simular cenário de CIRURGIA A + CIRURGIA B com kit associado", () => {
    // Simula um gabarito: "31401011 + 31401038" (duas cirurgias juntas)
    // com itens associados: fio cirúrgico, anestésico, etc.
    const codigoPadrao = "31401011 + 31401038";
    const codigosCombinados = parseCodigosCombinados(codigoPadrao);
    
    expect(codigosCombinados).toEqual(["31401011", "31401038"]);
    
    // Conta que tem ambas as cirurgias
    const contaCompleta = new Set(["31401011", "31401038", "60036761", "60000325"]);
    expect(verificarTodosPresentes(codigosCombinados, contaCompleta)).toBe(true);
    
    // Conta que tem apenas uma cirurgia
    const contaParcial = new Set(["31401011", "60036761", "60000325"]);
    expect(verificarTodosPresentes(codigosCombinados, contaParcial)).toBe(false);
  });

  it("deve gerar código e descrição combinados corretamente (simulando frontend)", () => {
    const procedimentos = [
      { codigo: "31401011", descricao: "HERNIORRAFIA INGUINAL" },
      { codigo: "31401038", descricao: "COLECISTECTOMIA" },
    ];
    
    const codigoCombinado = procedimentos.map(p => p.codigo).filter(Boolean).join(" + ");
    const descricaoCombinada = procedimentos.map(p => p.descricao).filter(Boolean).join(" + ");
    
    expect(codigoCombinado).toBe("31401011 + 31401038");
    expect(descricaoCombinada).toBe("HERNIORRAFIA INGUINAL + COLECISTECTOMIA");
    
    // Verificar que o parsing funciona com o código gerado
    const parsed = parseCodigosCombinados(codigoCombinado);
    expect(parsed).toEqual(["31401011", "31401038"]);
  });
});
