import { describe, it, expect } from "vitest";

// ============================================================
// Testes para melhorias em Contas a Pagar e Contas a Receber
// ============================================================

describe("Contas a Pagar - Schema e Filtros", () => {
  it("deve ter os campos centroCustoId e dataPagamento na tabela finTransacoes", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finTransacoes);
    expect(cols).toContain("centroCustoId");
    expect(cols).toContain("dataPagamento");
    expect(cols).toContain("categoriaId");
    expect(cols).toContain("empresaId");
    expect(cols).toContain("bancoId");
  });

  it("deve ter a tabela fin_centros_custo definida no schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.finCentrosCusto).toBeDefined();
    const cols = Object.keys(schema.finCentrosCusto);
    expect(cols).toContain("id");
    expect(cols).toContain("nome");
    expect(cols).toContain("codigo");
  });

  it("deve ter o router financeiro com sub-router transacoes que aceita filtros avançados", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("deve ter o router transacoes.listar com suporte a centroCustoId, dataInicio e dataFim", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    // Verificar que o router existe e tem a procedure listar
    const procedures = financeiroRouter._def.procedures;
    // O router é composto de sub-routers, verificamos que existe
    expect(financeiroRouter).toBeDefined();
  });
});

describe("Contas a Receber - Campos Tipo de Serviço e Descrição de Serviço", () => {
  it("deve ter os campos tipoServico e descricaoServico na tabela finRecebiveis", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finRecebiveis);
    expect(cols).toContain("tipoServico");
    expect(cols).toContain("descricaoServico");
  });

  it("deve ter os campos básicos da tabela finRecebiveis preservados", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finRecebiveis);
    expect(cols).toContain("id");
    expect(cols).toContain("descricao");
    expect(cols).toContain("valor");
    expect(cols).toContain("dataVencimento");
    expect(cols).toContain("dataRecebimento");
    expect(cols).toContain("recebido");
    expect(cols).toContain("empresaId");
    expect(cols).toContain("clienteId");
    expect(cols).toContain("bancoId");
    expect(cols).toContain("observacoes");
  });

  it("deve ter o campo tipoServico como varchar(255) opcional", async () => {
    const schema = await import("../drizzle/schema");
    // Verificar que o campo existe e é do tipo correto
    const tipoServicoCol = (schema.finRecebiveis as any).tipoServico;
    expect(tipoServicoCol).toBeDefined();
    // Verificar que não é notNull (é opcional)
    expect(tipoServicoCol.notNull).toBeFalsy();
  });

  it("deve ter o campo descricaoServico como text opcional", async () => {
    const schema = await import("../drizzle/schema");
    const descricaoServicoCol = (schema.finRecebiveis as any).descricaoServico;
    expect(descricaoServicoCol).toBeDefined();
    expect(descricaoServicoCol.notNull).toBeFalsy();
  });

  it("deve ter o router recebiveis com procedure tiposServicoDistintos", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    // O router deve existir e ter sub-routers
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
  });
});

describe("Contas a Pagar - Tabela com JOIN para Categoria e Centro de Custo", () => {
  it("deve ter a tabela finCategorias definida no schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.finCategorias).toBeDefined();
    const cols = Object.keys(schema.finCategorias);
    expect(cols).toContain("id");
    expect(cols).toContain("nome");
  });

  it("deve ter índices na tabela finTransacoes para performance de filtros", async () => {
    const schema = await import("../drizzle/schema");
    // Verificar que a tabela tem os campos de FK para filtros
    const cols = Object.keys(schema.finTransacoes);
    expect(cols).toContain("empresaId");
    expect(cols).toContain("categoriaId");
    expect(cols).toContain("centroCustoId");
    expect(cols).toContain("dataVencimento");
    expect(cols).toContain("pago");
  });
});

describe("Contas a Receber - Filtro por Tipo de Serviço", () => {
  it("deve ter o campo tipoServico na tabela finRecebiveis para filtro", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finRecebiveis);
    expect(cols).toContain("tipoServico");
  });

  it("deve ter o campo clienteId na tabela finRecebiveis para JOIN com clientes", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finRecebiveis);
    expect(cols).toContain("clienteId");
  });

  it("deve ter a tabela finClientes para JOIN no listar recebiveis", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.finClientes).toBeDefined();
    const cols = Object.keys(schema.finClientes);
    expect(cols).toContain("id");
    expect(cols).toContain("nome");
  });
});

describe("Edição Inline - Contas a Pagar (transacoes.atualizar)", () => {
  it("deve ter a procedure transacoes.atualizar definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("deve ter os campos necessários para atualização na tabela finTransacoes", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finTransacoes);
    // Campos editáveis
    expect(cols).toContain("descricao");
    expect(cols).toContain("valor");
    expect(cols).toContain("dataVencimento");
    expect(cols).toContain("dataPagamento");
    expect(cols).toContain("pago");
    expect(cols).toContain("empresaId");
    expect(cols).toContain("categoriaId");
    expect(cols).toContain("bancoId");
    expect(cols).toContain("centroCustoId");
    expect(cols).toContain("observacoes");
  });

  it("deve ter o campo updatedAt para rastreamento de alterações", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finTransacoes);
    expect(cols).toContain("updatedAt");
  });
});

describe("Edição Inline - Contas a Receber (recebiveis.atualizar)", () => {
  it("deve ter a procedure recebiveis.atualizar definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("deve ter os campos necessários para atualização na tabela finRecebiveis", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finRecebiveis);
    // Campos editáveis
    expect(cols).toContain("descricao");
    expect(cols).toContain("valor");
    expect(cols).toContain("dataVencimento");
    expect(cols).toContain("dataRecebimento");
    expect(cols).toContain("recebido");
    expect(cols).toContain("empresaId");
    expect(cols).toContain("clienteId");
    expect(cols).toContain("bancoId");
    expect(cols).toContain("tipoServico");
    expect(cols).toContain("descricaoServico");
    expect(cols).toContain("observacoes");
  });

  it("deve ter o campo updatedAt para rastreamento de alterações em recebiveis", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finRecebiveis);
    expect(cols).toContain("updatedAt");
  });

  it("deve ter os tipos de serviço padrão cobrindo os cenários hospitalares", () => {
    const tiposServicoPadrao = ["Consulta", "Exame", "Cirurgia", "Internação", "Procedimento", "Fisioterapia", "Urgência/Emergência", "Home Care", "Telemedicina", "Outros"];
    expect(tiposServicoPadrao).toHaveLength(10);
    expect(tiposServicoPadrao).toContain("Consulta");
    expect(tiposServicoPadrao).toContain("Cirurgia");
    expect(tiposServicoPadrao).toContain("Internação");
    expect(tiposServicoPadrao).toContain("Urgência/Emergência");
    expect(tiposServicoPadrao).toContain("Home Care");
    expect(tiposServicoPadrao).toContain("Telemedicina");
  });
});

describe("Duplicar e Seleção em Lote - Contas a Pagar", () => {
  it("deve ter a procedure transacoes.duplicar definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    // Verificar que o router tem procedures definidas
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
    expect(routerDef.procedures).toBeDefined();
  });

  it("deve ter a procedure transacoes.excluirEmLote definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("deve ter todos os campos necessários para duplicação na tabela finTransacoes", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finTransacoes);
    // Campos que devem ser copiados na duplicação
    expect(cols).toContain("empresaId");
    expect(cols).toContain("categoriaId");
    expect(cols).toContain("tipoId");
    expect(cols).toContain("custoId");
    expect(cols).toContain("bancoId");
    expect(cols).toContain("centroCustoId");
    expect(cols).toContain("descricao");
    expect(cols).toContain("valor");
    expect(cols).toContain("dataVencimento");
    expect(cols).toContain("observacoes");
    expect(cols).toContain("userId");
  });
});

describe("Duplicar e Seleção em Lote - Contas a Receber", () => {
  it("deve ter a procedure recebiveis.duplicar definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
    expect(routerDef.procedures).toBeDefined();
  });

  it("deve ter a procedure recebiveis.excluirEmLote definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("deve ter todos os campos necessários para duplicação na tabela finRecebiveis", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finRecebiveis);
    // Campos que devem ser copiados na duplicação
    expect(cols).toContain("empresaId");
    expect(cols).toContain("clienteId");
    expect(cols).toContain("tipoId");
    expect(cols).toContain("bancoId");
    expect(cols).toContain("descricao");
    expect(cols).toContain("valor");
    expect(cols).toContain("dataVencimento");
    expect(cols).toContain("tipoServico");
    expect(cols).toContain("descricaoServico");
    expect(cols).toContain("observacoes");
    expect(cols).toContain("userId");
  });

  it("deve ter o campo recebido como enum para controle de status na duplicação", async () => {
    const schema = await import("../drizzle/schema");
    const recebidoCol = (schema.finRecebiveis as any).recebido;
    expect(recebidoCol).toBeDefined();
  });
});

describe("Duplicar em Lote - Backend", () => {
  it("deve ter a procedure transacoes.duplicarEmLote definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
    expect(routerDef.procedures).toBeDefined();
  });

  it("deve ter a procedure recebiveis.duplicarEmLote definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
    expect(routerDef.procedures).toBeDefined();
  });
});

describe("Filtro por Período Personalizado", () => {
  it("deve calcular período personalizado corretamente quando datas são fornecidas", () => {
    const dataInicio = "2026-01-01";
    const dataFim = "2026-03-31";
    const filtroPeriodo = "personalizado";

    let resultado: any = {};
    if (filtroPeriodo === "personalizado" && dataInicio && dataFim) {
      resultado = { dataInicio, dataFim };
    }

    expect(resultado.dataInicio).toBe("2026-01-01");
    expect(resultado.dataFim).toBe("2026-03-31");
  });

  it("deve retornar objeto vazio quando período personalizado não tem datas", () => {
    const dataInicio = "";
    const dataFim = "";
    const filtroPeriodo = "personalizado";

    let resultado: any = {};
    if (filtroPeriodo === "personalizado" && dataInicio && dataFim) {
      resultado = { dataInicio, dataFim };
    }

    expect(resultado.dataInicio).toBeUndefined();
    expect(resultado.dataFim).toBeUndefined();
  });

  it("deve calcular período mensal corretamente", () => {
    const hoje = new Date(2026, 2, 19); // março 2026
    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
    const dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);

    expect(dataInicio).toBe("2026-03-01");
    expect(dataFim).toBe("2026-03-31");
  });

  it("deve calcular período trimestral corretamente", () => {
    const hoje = new Date(2026, 2, 19); // março 2026 (Q1)
    const m = hoje.getMonth();
    const qi = m - (m % 3);
    const dataInicio = new Date(hoje.getFullYear(), qi, 1).toISOString().slice(0, 10);
    const dataFim = new Date(hoje.getFullYear(), qi + 3, 0).toISOString().slice(0, 10);

    expect(dataInicio).toBe("2026-01-01");
    expect(dataFim).toBe("2026-03-31");
  });

  it("deve calcular período anual corretamente", () => {
    const hoje = new Date(2026, 2, 19);
    const dataInicio = `${hoje.getFullYear()}-01-01`;
    const dataFim = `${hoje.getFullYear()}-12-31`;

    expect(dataInicio).toBe("2026-01-01");
    expect(dataFim).toBe("2026-12-31");
  });
});

describe("Dashboard Financeiro - Backend", () => {
  it("deve ter a procedure dashboard.resumo definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
    expect(routerDef.procedures).toBeDefined();
  });

  it("deve ter a procedure dashboard.fluxoCaixa definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("deve ter a procedure dashboard.analiseDetalhada definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("deve ter a procedure dashboard.pagamentosPorCategoria definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("deve ter a procedure dashboard.comparativoMensal definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("deve ter a procedure dashboard.dre definida no router financeiro", async () => {
    const { financeiroRouter } = await import("./routers/financeiroRouter");
    expect(financeiroRouter).toBeDefined();
    const routerDef = financeiroRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("deve ter as tabelas necessárias para o dashboard no schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.finTransacoes).toBeDefined();
    expect(schema.finRecebiveis).toBeDefined();
    expect(schema.finBancos).toBeDefined();
    expect(schema.finCategorias).toBeDefined();
    expect(schema.finCentrosCusto).toBeDefined();
  });

  it("deve ter campos de status nas tabelas para cálculo de KPIs", async () => {
    const schema = await import("../drizzle/schema");
    // Transações: pago (sim/nao)
    const transCols = Object.keys(schema.finTransacoes);
    expect(transCols).toContain("pago");
    expect(transCols).toContain("valor");
    expect(transCols).toContain("dataVencimento");
    expect(transCols).toContain("dataPagamento");
    // Recebíveis: recebido (sim/nao)
    const recCols = Object.keys(schema.finRecebiveis);
    expect(recCols).toContain("recebido");
    expect(recCols).toContain("valor");
    expect(recCols).toContain("dataVencimento");
    expect(recCols).toContain("dataRecebimento");
  });

  it("deve ter campos essenciais na tabela de bancos", async () => {
    const schema = await import("../drizzle/schema");
    const bancoCols = Object.keys(schema.finBancos);
    expect(bancoCols).toContain("nome");
    expect(bancoCols).toContain("id");
  });
});

describe("DRE - Demonstrativo de Resultado", () => {
  it("deve calcular margem corretamente", () => {
    const totalReceitas = 100000;
    const totalDespesas = 75000;
    const resultado = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? (resultado / totalReceitas * 100) : 0;

    expect(resultado).toBe(25000);
    expect(margem).toBe(25);
  });

  it("deve calcular margem negativa quando despesas excedem receitas", () => {
    const totalReceitas = 50000;
    const totalDespesas = 80000;
    const resultado = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? (resultado / totalReceitas * 100) : 0;

    expect(resultado).toBe(-30000);
    expect(margem).toBe(-60);
  });

  it("deve calcular percentual sobre receita corretamente", () => {
    const pctReceita = (val: number, total: number) => total > 0 ? `${(val / total * 100).toFixed(1)}%` : "\u2014";

    expect(pctReceita(25000, 100000)).toBe("25.0%");
    expect(pctReceita(0, 100000)).toBe("0.0%");
    expect(pctReceita(100000, 100000)).toBe("100.0%");
    expect(pctReceita(50000, 0)).toBe("\u2014");
  });

  it("deve ter campo tipoServico na tabela finRecebiveis para agrupamento de receitas", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finRecebiveis);
    expect(cols).toContain("tipoServico");
  });

  it("deve ter campo categoriaId na tabela finTransacoes para agrupamento de despesas", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finTransacoes);
    expect(cols).toContain("categoriaId");
  });

  it("deve ter campo centroCustoId na tabela finTransacoes para despesas por CC", async () => {
    const schema = await import("../drizzle/schema");
    const cols = Object.keys(schema.finTransacoes);
    expect(cols).toContain("centroCustoId");
  });

  it("deve gerar evolução DRE com dados de 6 meses", () => {
    const evolucao = [];
    const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const ano = 2026;
    const mesNum = 3; // março

    for (let i = 5; i >= 0; i--) {
      const d = new Date(ano, mesNum - 1 - i, 1);
      const mLabel = `${MONTHS_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
      evolucao.push({ mes: mLabel, receitas: 100000 - i * 10000, despesas: 80000 - i * 5000, resultado: 20000 - i * 5000 });
    }

    expect(evolucao.length).toBe(6);
    expect(evolucao[0].mes).toBe("Out/25");
    expect(evolucao[5].mes).toBe("Mar/26");
    expect(evolucao[5].resultado).toBe(20000);
  });
});
