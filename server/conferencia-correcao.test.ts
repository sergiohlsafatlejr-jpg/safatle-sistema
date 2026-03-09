import { describe, it, expect } from "vitest";

/**
 * Testes para o fluxo de Conferência Pós-Correção
 * Valida a lógica de snapshot, comparação e classificação de itens
 */

// ============ Lógica de classificação de itens ============

interface ItemSnapshot {
  codigoItem: string;
  descricaoItem: string;
  quantidade: string;
  valorUnitario: string;
  valorTotal: string;
}

interface ItemAtual {
  codigoItem: string;
  descricaoItem: string;
  quantidade: string;
  valorUnitario: string;
  valorTotal: string;
}

interface DivergenciaAceita {
  codigoItem: string;
  tipoDivergencia: string;
  dadosDivergencia: any;
}

type StatusCorrecao = "corrigido" | "parcialmente_corrigido" | "nao_corrigido" | "novo_problema";

function classificarItem(
  itemAnterior: ItemSnapshot,
  itemAtual: ItemAtual | undefined,
  divergencia: DivergenciaAceita | undefined
): StatusCorrecao {
  // Se não existe mais o item na reimportação
  if (!itemAtual) {
    return divergencia ? "corrigido" : "novo_problema";
  }

  // Se não tinha divergência, verificar se agora tem problema
  if (!divergencia) {
    const qtdMudou = itemAnterior.quantidade !== itemAtual.quantidade;
    const valorMudou = itemAnterior.valorTotal !== itemAtual.valorTotal;
    if (qtdMudou || valorMudou) {
      return "novo_problema";
    }
    return "corrigido"; // sem divergência e sem mudança = ok
  }

  // Tinha divergência - verificar se foi corrigido
  const qtdMudou = itemAnterior.quantidade !== itemAtual.quantidade;
  const valorMudou = itemAnterior.valorTotal !== itemAtual.valorTotal;

  if (qtdMudou || valorMudou) {
    // Algo mudou - verificar se é a correção esperada
    const dados = divergencia.dadosDivergencia;
    if (dados && dados.quantidadeEsperada) {
      if (itemAtual.quantidade === String(dados.quantidadeEsperada)) {
        return "corrigido";
      }
      return "parcialmente_corrigido";
    }
    if (dados && dados.valorEsperado) {
      if (parseFloat(itemAtual.valorTotal) === dados.valorEsperado) {
        return "corrigido";
      }
      return "parcialmente_corrigido";
    }
    // Mudou mas sem valor esperado definido - considerar parcial
    return "parcialmente_corrigido";
  }

  // Nada mudou - não corrigido
  return "nao_corrigido";
}

function calcularResumoConferencia(itensClassificados: { status: StatusCorrecao }[]) {
  const total = itensClassificados.length;
  const corrigidos = itensClassificados.filter(i => i.status === "corrigido").length;
  const parciais = itensClassificados.filter(i => i.status === "parcialmente_corrigido").length;
  const naoCorrigidos = itensClassificados.filter(i => i.status === "nao_corrigido").length;
  const novosProblemas = itensClassificados.filter(i => i.status === "novo_problema").length;
  const taxaCorrecao = total > 0 ? ((corrigidos + parciais) / total) * 100 : 0;

  return { total, corrigidos, parciais, naoCorrigidos, novosProblemas, taxaCorrecao };
}

describe("Conferência Pós-Correção - Classificação de Itens", () => {

  it("deve classificar como 'corrigido' quando item com divergência foi alterado para valor esperado", () => {
    const anterior: ItemSnapshot = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "5",
      valorUnitario: "100.00",
      valorTotal: "500.00",
    };
    const atual: ItemAtual = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "3",
      valorUnitario: "100.00",
      valorTotal: "300.00",
    };
    const divergencia: DivergenciaAceita = {
      codigoItem: "10101012",
      tipoDivergencia: "quantidade_acima",
      dadosDivergencia: { quantidadeEsperada: 3 },
    };

    const status = classificarItem(anterior, atual, divergencia);
    expect(status).toBe("corrigido");
  });

  it("deve classificar como 'parcialmente_corrigido' quando item mudou mas não para o valor esperado", () => {
    const anterior: ItemSnapshot = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "5",
      valorUnitario: "100.00",
      valorTotal: "500.00",
    };
    const atual: ItemAtual = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "4",
      valorUnitario: "100.00",
      valorTotal: "400.00",
    };
    const divergencia: DivergenciaAceita = {
      codigoItem: "10101012",
      tipoDivergencia: "quantidade_acima",
      dadosDivergencia: { quantidadeEsperada: 3 },
    };

    const status = classificarItem(anterior, atual, divergencia);
    expect(status).toBe("parcialmente_corrigido");
  });

  it("deve classificar como 'nao_corrigido' quando item com divergência não foi alterado", () => {
    const anterior: ItemSnapshot = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "5",
      valorUnitario: "100.00",
      valorTotal: "500.00",
    };
    const atual: ItemAtual = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "5",
      valorUnitario: "100.00",
      valorTotal: "500.00",
    };
    const divergencia: DivergenciaAceita = {
      codigoItem: "10101012",
      tipoDivergencia: "quantidade_acima",
      dadosDivergencia: { quantidadeEsperada: 3 },
    };

    const status = classificarItem(anterior, atual, divergencia);
    expect(status).toBe("nao_corrigido");
  });

  it("deve classificar como 'corrigido' quando item com divergência foi removido", () => {
    const anterior: ItemSnapshot = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "5",
      valorUnitario: "100.00",
      valorTotal: "500.00",
    };
    const divergencia: DivergenciaAceita = {
      codigoItem: "10101012",
      tipoDivergencia: "item_nao_esperado",
      dadosDivergencia: {},
    };

    const status = classificarItem(anterior, undefined, divergencia);
    expect(status).toBe("corrigido");
  });

  it("deve classificar como 'novo_problema' quando item sem divergência desapareceu", () => {
    const anterior: ItemSnapshot = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "3",
      valorUnitario: "100.00",
      valorTotal: "300.00",
    };

    const status = classificarItem(anterior, undefined, undefined);
    expect(status).toBe("novo_problema");
  });

  it("deve classificar como 'novo_problema' quando item sem divergência teve valor alterado", () => {
    const anterior: ItemSnapshot = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "3",
      valorUnitario: "100.00",
      valorTotal: "300.00",
    };
    const atual: ItemAtual = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "5",
      valorUnitario: "100.00",
      valorTotal: "500.00",
    };

    const status = classificarItem(anterior, atual, undefined);
    expect(status).toBe("novo_problema");
  });

  it("deve classificar como 'parcialmente_corrigido' quando item mudou sem valor esperado definido", () => {
    const anterior: ItemSnapshot = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "5",
      valorUnitario: "100.00",
      valorTotal: "500.00",
    };
    const atual: ItemAtual = {
      codigoItem: "10101012",
      descricaoItem: "Consulta",
      quantidade: "4",
      valorUnitario: "100.00",
      valorTotal: "400.00",
    };
    const divergencia: DivergenciaAceita = {
      codigoItem: "10101012",
      tipoDivergencia: "quantidade_acima",
      dadosDivergencia: {},
    };

    const status = classificarItem(anterior, atual, divergencia);
    expect(status).toBe("parcialmente_corrigido");
  });
});

describe("Conferência Pós-Correção - Resumo da Conferência", () => {

  it("deve calcular resumo correto com mix de status", () => {
    const itens = [
      { status: "corrigido" as StatusCorrecao },
      { status: "corrigido" as StatusCorrecao },
      { status: "parcialmente_corrigido" as StatusCorrecao },
      { status: "nao_corrigido" as StatusCorrecao },
      { status: "novo_problema" as StatusCorrecao },
    ];

    const resumo = calcularResumoConferencia(itens);

    expect(resumo.total).toBe(5);
    expect(resumo.corrigidos).toBe(2);
    expect(resumo.parciais).toBe(1);
    expect(resumo.naoCorrigidos).toBe(1);
    expect(resumo.novosProblemas).toBe(1);
    expect(resumo.taxaCorrecao).toBe(60); // (2+1)/5 * 100
  });

  it("deve retornar taxa 100% quando todos corrigidos", () => {
    const itens = [
      { status: "corrigido" as StatusCorrecao },
      { status: "corrigido" as StatusCorrecao },
      { status: "corrigido" as StatusCorrecao },
    ];

    const resumo = calcularResumoConferencia(itens);

    expect(resumo.taxaCorrecao).toBe(100);
    expect(resumo.corrigidos).toBe(3);
    expect(resumo.naoCorrigidos).toBe(0);
  });

  it("deve retornar taxa 0% quando nenhum corrigido", () => {
    const itens = [
      { status: "nao_corrigido" as StatusCorrecao },
      { status: "nao_corrigido" as StatusCorrecao },
    ];

    const resumo = calcularResumoConferencia(itens);

    expect(resumo.taxaCorrecao).toBe(0);
    expect(resumo.naoCorrigidos).toBe(2);
  });

  it("deve retornar taxa 0% para lista vazia", () => {
    const resumo = calcularResumoConferencia([]);

    expect(resumo.total).toBe(0);
    expect(resumo.taxaCorrecao).toBe(0);
  });

  it("deve incluir parcialmente corrigidos na taxa de correção", () => {
    const itens = [
      { status: "parcialmente_corrigido" as StatusCorrecao },
      { status: "parcialmente_corrigido" as StatusCorrecao },
      { status: "nao_corrigido" as StatusCorrecao },
      { status: "nao_corrigido" as StatusCorrecao },
    ];

    const resumo = calcularResumoConferencia(itens);

    expect(resumo.taxaCorrecao).toBe(50); // (0+2)/4 * 100
  });
});

describe("Conferência Pós-Correção - Snapshot", () => {

  it("deve montar snapshot com dados corretos dos itens", () => {
    const itens = [
      { id: 1, codigoItem: "10101012", descricaoItem: "Consulta", quantidade: "3", valorUnitario: "100.00", valorTotal: "300.00", tipoItem: "procedimento" },
      { id: 2, codigoItem: "30101019", descricaoItem: "Hemograma", quantidade: "1", valorUnitario: "50.00", valorTotal: "50.00", tipoItem: "procedimento" },
    ];

    const snapshot = itens.map(item => ({
      codigoItem: item.codigoItem,
      descricaoItem: item.descricaoItem,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
    }));

    expect(snapshot).toHaveLength(2);
    expect(snapshot[0].codigoItem).toBe("10101012");
    expect(snapshot[0].valorTotal).toBe("300.00");
    expect(snapshot[1].codigoItem).toBe("30101019");
  });

  it("deve calcular valor total do snapshot corretamente", () => {
    const itens = [
      { valorTotal: "300.00" },
      { valorTotal: "50.00" },
      { valorTotal: "150.75" },
    ];

    const valorTotal = itens.reduce((sum, item) => sum + parseFloat(item.valorTotal), 0);

    expect(valorTotal).toBe(500.75);
  });

  it("deve identificar divergências aceitas corretamente", () => {
    const feedbacks = [
      { codigoItem: "10101012", decisao: "aceitar", tipoDivergencia: "quantidade_acima" },
      { codigoItem: "30101019", decisao: "rejeitar", tipoDivergencia: "valor_acima" },
      { codigoItem: "40201015", decisao: "aceitar", tipoDivergencia: "item_nao_esperado" },
    ];

    const divergenciasAceitas = feedbacks.filter(f => f.decisao === "aceitar");

    expect(divergenciasAceitas).toHaveLength(2);
    expect(divergenciasAceitas[0].codigoItem).toBe("10101012");
    expect(divergenciasAceitas[1].codigoItem).toBe("40201015");
  });
});

describe("Conferência Pós-Correção - Status da Conta", () => {

  it("deve definir status 'aprovada' quando taxa >= 90%", () => {
    const taxaCorrecao = 95;
    const status = taxaCorrecao >= 90 ? "aprovada" : taxaCorrecao >= 50 ? "parcial" : "reprovada";
    expect(status).toBe("aprovada");
  });

  it("deve definir status 'parcial' quando taxa entre 50% e 90%", () => {
    const taxaCorrecao = 70;
    const status = taxaCorrecao >= 90 ? "aprovada" : taxaCorrecao >= 50 ? "parcial" : "reprovada";
    expect(status).toBe("parcial");
  });

  it("deve definir status 'reprovada' quando taxa < 50%", () => {
    const taxaCorrecao = 30;
    const status = taxaCorrecao >= 90 ? "aprovada" : taxaCorrecao >= 50 ? "parcial" : "reprovada";
    expect(status).toBe("reprovada");
  });

  it("deve definir status 'aprovada' quando taxa é exatamente 90%", () => {
    const taxaCorrecao = 90;
    const status = taxaCorrecao >= 90 ? "aprovada" : taxaCorrecao >= 50 ? "parcial" : "reprovada";
    expect(status).toBe("aprovada");
  });
});
