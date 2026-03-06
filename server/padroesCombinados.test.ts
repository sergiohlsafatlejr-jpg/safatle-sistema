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

// ========== TESTES DE QUANTIDADE MÍNIMA / MÁXIMA ==========

interface ItemEsperado {
  codigo: string;
  descricao: string;
  tipo: string;
  frequencia: number;
  quantidadeMedia: number;
  quantidadeMin?: number;
  quantidadeMax?: number;
  valorMedio?: number;
}

interface DivergenciaQtd {
  tipo: "ABAIXO_MINIMO" | "ACIMA_MAXIMO" | "DIVERGENTE_MEDIA" | "OK";
  mensagem: string;
  valorEsperado: string;
  valorEncontrado: string;
}

/**
 * Replica a lógica de verificação de quantidade do comparadorPadroes.ts
 */
function verificarQuantidade(itemEsperado: ItemEsperado, qtdNaConta: number, isGabarito: boolean): DivergenciaQtd | null {
  const qtdMin = itemEsperado.quantidadeMin ?? itemEsperado.quantidadeMedia;
  const qtdMax = itemEsperado.quantidadeMax ?? itemEsperado.quantidadeMedia;
  const qtdEsperada = itemEsperado.quantidadeMedia;
  const fonte = isGabarito ? "gabarito" : "padrão aprendido";

  if (qtdMin > 0 || qtdMax > 0) {
    if (qtdNaConta < qtdMin) {
      return {
        tipo: "ABAIXO_MINIMO",
        mensagem: `Quantidade de "${itemEsperado.descricao}" ABAIXO do mínimo permitido pelo ${fonte}: mínimo ${qtdMin}, encontrado ${qtdNaConta.toFixed(1)}`,
        valorEsperado: `${qtdMin} - ${qtdMax}`,
        valorEncontrado: `${qtdNaConta.toFixed(1)}`,
      };
    } else if (qtdNaConta > qtdMax) {
      return {
        tipo: "ACIMA_MAXIMO",
        mensagem: `Quantidade de "${itemEsperado.descricao}" ACIMA do máximo permitido pelo ${fonte}: máximo ${qtdMax}, encontrado ${qtdNaConta.toFixed(1)}`,
        valorEsperado: `${qtdMin} - ${qtdMax}`,
        valorEncontrado: `${qtdNaConta.toFixed(1)}`,
      };
    }
    return null; // Dentro da faixa
  } else if (qtdNaConta > 0 && qtdEsperada > 0) {
    const diffPercent = Math.abs(qtdNaConta - qtdEsperada) / qtdEsperada * 100;
    if (diffPercent > 50) {
      return {
        tipo: "DIVERGENTE_MEDIA",
        mensagem: `Quantidade divergente: esperado ~${qtdEsperada.toFixed(1)}, encontrado ${qtdNaConta.toFixed(1)}`,
        valorEsperado: `${qtdEsperada.toFixed(1)}`,
        valorEncontrado: `${qtdNaConta.toFixed(1)}`,
      };
    }
  }
  return null;
}

describe("Quantidade Mínima / Máxima - Verificação de Faixa", () => {
  const itemBase: ItemEsperado = {
    codigo: "60036761",
    descricao: "TAXA DE ATENDIMENTO",
    tipo: "TAXA",
    frequencia: 100,
    quantidadeMedia: 2,
    quantidadeMin: 1,
    quantidadeMax: 5,
  };

  it("deve retornar null quando quantidade está dentro da faixa", () => {
    expect(verificarQuantidade(itemBase, 1, true)).toBeNull();
    expect(verificarQuantidade(itemBase, 3, true)).toBeNull();
    expect(verificarQuantidade(itemBase, 5, true)).toBeNull();
  });

  it("deve detectar quantidade ABAIXO do mínimo", () => {
    const result = verificarQuantidade(itemBase, 0.5, true);
    expect(result).not.toBeNull();
    expect(result!.tipo).toBe("ABAIXO_MINIMO");
    expect(result!.valorEsperado).toBe("1 - 5");
    expect(result!.mensagem).toContain("ABAIXO");
  });

  it("deve detectar quantidade ACIMA do máximo", () => {
    const result = verificarQuantidade(itemBase, 10, true);
    expect(result).not.toBeNull();
    expect(result!.tipo).toBe("ACIMA_MAXIMO");
    expect(result!.valorEsperado).toBe("1 - 5");
    expect(result!.mensagem).toContain("ACIMA");
  });

  it("deve aceitar exatamente o mínimo", () => {
    expect(verificarQuantidade(itemBase, 1, true)).toBeNull();
  });

  it("deve aceitar exatamente o máximo", () => {
    expect(verificarQuantidade(itemBase, 5, true)).toBeNull();
  });

  it("deve detectar quantidade 0 como abaixo do mínimo", () => {
    const result = verificarQuantidade(itemBase, 0, true);
    expect(result).not.toBeNull();
    expect(result!.tipo).toBe("ABAIXO_MINIMO");
  });
});

describe("Quantidade Mínima / Máxima - Fallback para Média", () => {
  const itemSemFaixa: ItemEsperado = {
    codigo: "60036761",
    descricao: "TAXA DE ATENDIMENTO",
    tipo: "TAXA",
    frequencia: 100,
    quantidadeMedia: 2,
    // sem quantidadeMin/quantidadeMax
  };

  it("deve usar quantidadeMedia como fallback quando min/max não definidos", () => {
    // Sem min/max, usa a lógica de faixa com quantidadeMedia como min E max
    // Então qtdMin=2, qtdMax=2, e 2 está dentro da faixa
    const result = verificarQuantidade(itemSemFaixa, 2, true);
    expect(result).toBeNull();
  });

  it("deve detectar divergência quando sem min/max e quantidade muito diferente", () => {
    // qtdMin=2, qtdMax=2 (fallback), qtdNaConta=10 -> acima do máximo
    const result = verificarQuantidade(itemSemFaixa, 10, true);
    expect(result).not.toBeNull();
    expect(result!.tipo).toBe("ACIMA_MAXIMO");
  });
});

describe("Quantidade Mínima / Máxima - Cenário Real Cirúrgico", () => {
  it("deve validar kit cirúrgico com faixas realistas", () => {
    const kitCirurgico: ItemEsperado[] = [
      { codigo: "60023112", descricao: "TAXA DE SALA PORTE 2", tipo: "TAXA", frequencia: 100, quantidadeMedia: 1, quantidadeMin: 1, quantidadeMax: 1 },
      { codigo: "1900146234", descricao: "SERINGA 20ML", tipo: "MAT_MED", frequencia: 95, quantidadeMedia: 3, quantidadeMin: 1, quantidadeMax: 10 },
      { codigo: "60034343", descricao: "OXIGENIO POR MINUTO", tipo: "TAXA", frequencia: 90, quantidadeMedia: 60, quantidadeMin: 30, quantidadeMax: 120 },
      { codigo: "90065549", descricao: "CLORETO DE SODIO 500ML", tipo: "MAT_MED", frequencia: 85, quantidadeMedia: 2, quantidadeMin: 1, quantidadeMax: 5 },
    ];

    // Conta normal - tudo dentro da faixa
    const qtdsNormais = [1, 5, 90, 3];
    kitCirurgico.forEach((item, idx) => {
      expect(verificarQuantidade(item, qtdsNormais[idx], true)).toBeNull();
    });

    // Conta com oxigênio excessivo (200 minutos, max é 120)
    const resultOxigenio = verificarQuantidade(kitCirurgico[2], 200, true);
    expect(resultOxigenio).not.toBeNull();
    expect(resultOxigenio!.tipo).toBe("ACIMA_MAXIMO");
    expect(resultOxigenio!.mensagem).toContain("OXIGENIO POR MINUTO");

    // Conta sem taxa de sala (0 quando mínimo é 1)
    const resultTaxa = verificarQuantidade(kitCirurgico[0], 0, true);
    expect(resultTaxa).not.toBeNull();
    expect(resultTaxa!.tipo).toBe("ABAIXO_MINIMO");
  });

  it("deve calcular quantidadeMedia como média de min e max (simula frontend)", () => {
    const qtdMin = 2;
    const qtdMax = 8;
    const qtdMedia = (qtdMin + qtdMax) / 2;
    expect(qtdMedia).toBe(5);
  });
});
