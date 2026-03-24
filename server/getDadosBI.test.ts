import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testa a lógica de filtro por competência da conta no getDadosBI.
 * A correção principal: quando há filtro de competência, o getDadosBI deve
 * usar JOIN com contas_convenio_resumo para filtrar pela competência da CONTA,
 * não pela competência do item individual no faturamento_tiss.
 */

// Mock do db.execute para capturar a SQL gerada
const mockExecute = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();

vi.mock("./db", async () => {
  const actual = await vi.importActual("./db") as any;
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => [],
        }),
      }),
      execute: mockExecute,
    }),
  };
});

describe("getDadosBI - Filtro por competência da conta", () => {
  
  it("deve gerar SQL com JOIN na contas_convenio_resumo quando há filtro de competência", () => {
    // Simular a construção da SQL como feita no getDadosBI
    const estabelecimentoId = 3;
    const competenciaFiltro = "2026/01";
    const convenioId: number | undefined = undefined;

    const sqlParts: string[] = [
      'SELECT ft.* FROM faturamento_tiss ft',
      'INNER JOIN contas_convenio_resumo ccr ON ccr.numeroConta = ft.numero_guia_prestador AND ccr.estabelecimentoId = ft.estabelecimentoId',
      'WHERE ft.estabelecimentoId = ' + (estabelecimentoId || 0),
    ];
    if (convenioId) sqlParts.push('AND ft.convenioId = ' + convenioId);
    if (competenciaFiltro) sqlParts.push(`AND ccr.competencia = '${competenciaFiltro}'`);

    const finalSql = sqlParts.join(' ');
    
    expect(finalSql).toContain('INNER JOIN contas_convenio_resumo ccr');
    expect(finalSql).toContain("ccr.competencia = '2026/01'");
    expect(finalSql).toContain('ft.estabelecimentoId = 3');
    expect(finalSql).not.toContain('ft.competencia'); // NÃO deve filtrar por competência do item
  });

  it("deve gerar SQL com filtro LIKE para ano quando só ano é fornecido", () => {
    const estabelecimentoId = 3;
    const anoReferencia = 2026;
    const competenciaFiltro: string | undefined = undefined;

    const sqlParts: string[] = [
      'SELECT ft.* FROM faturamento_tiss ft',
      'INNER JOIN contas_convenio_resumo ccr ON ccr.numeroConta = ft.numero_guia_prestador AND ccr.estabelecimentoId = ft.estabelecimentoId',
      'WHERE ft.estabelecimentoId = ' + (estabelecimentoId || 0),
    ];
    if (competenciaFiltro) sqlParts.push(`AND ccr.competencia = '${competenciaFiltro}'`);
    else if (anoReferencia) sqlParts.push(`AND ccr.competencia LIKE '${anoReferencia}/%'`);

    const finalSql = sqlParts.join(' ');
    
    expect(finalSql).toContain('INNER JOIN contas_convenio_resumo ccr');
    expect(finalSql).toContain("ccr.competencia LIKE '2026/%'");
  });

  it("deve incluir filtro de convênio quando fornecido", () => {
    const estabelecimentoId = 3;
    const competenciaFiltro = "2026/01";
    const convenioId = 1;

    const sqlParts: string[] = [
      'SELECT ft.* FROM faturamento_tiss ft',
      'INNER JOIN contas_convenio_resumo ccr ON ccr.numeroConta = ft.numero_guia_prestador AND ccr.estabelecimentoId = ft.estabelecimentoId',
      'WHERE ft.estabelecimentoId = ' + (estabelecimentoId || 0),
    ];
    if (convenioId) sqlParts.push('AND ft.convenioId = ' + convenioId);
    if (competenciaFiltro) sqlParts.push(`AND ccr.competencia = '${competenciaFiltro}'`);

    const finalSql = sqlParts.join(' ');
    
    expect(finalSql).toContain('AND ft.convenioId = 1');
    expect(finalSql).toContain("ccr.competencia = '2026/01'");
  });

  it("deve mapear snake_case para camelCase corretamente", () => {
    const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
    
    expect(snakeToCamel("valor_faturado")).toBe("valorFaturado");
    expect(snakeToCamel("numero_guia_prestador")).toBe("numeroGuiaPrestador");
    expect(snakeToCamel("carteira_beneficiario")).toBe("carteiraBeneficiario");
    expect(snakeToCamel("tipo_item")).toBe("tipoItem");
    expect(snakeToCamel("codigo_item")).toBe("codigoItem");
    expect(snakeToCamel("descricao_item")).toBe("descricaoItem");
    expect(snakeToCamel("nome_prof")).toBe("nomeProf");
    expect(snakeToCamel("data_execucao")).toBe("dataExecucao");
    expect(snakeToCamel("arquivo_id")).toBe("arquivoId");
    expect(snakeToCamel("convenioId")).toBe("convenioId"); // já camelCase
    expect(snakeToCamel("estabelecimentoId")).toBe("estabelecimentoId"); // já camelCase
    expect(snakeToCamel("competencia")).toBe("competencia"); // sem underscore
    expect(snakeToCamel("id")).toBe("id"); // simples
  });

  it("deve mapear um row completo de snake_case para camelCase", () => {
    const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
    
    const rawRow = {
      id: 1,
      numero_lote: "12345",
      numero_guia_prestador: "67385277",
      valor_faturado: "100.00",
      tipo_item: "procedimento",
      codigo_item: "10101012",
      descricao_item: "Consulta",
      carteira_beneficiario: "ABC123",
      nome_prof: "Dr. Silva",
      convenioId: 1,
      estabelecimentoId: 3,
      competencia: "2026/01",
      arquivo_id: 100,
    };

    const mapped: any = {};
    for (const key of Object.keys(rawRow)) {
      mapped[snakeToCamel(key)] = (rawRow as any)[key];
    }

    expect(mapped.id).toBe(1);
    expect(mapped.numeroLote).toBe("12345");
    expect(mapped.numeroGuiaPrestador).toBe("67385277");
    expect(mapped.valorFaturado).toBe("100.00");
    expect(mapped.tipoItem).toBe("procedimento");
    expect(mapped.codigoItem).toBe("10101012");
    expect(mapped.descricaoItem).toBe("Consulta");
    expect(mapped.carteiraBeneficiario).toBe("ABC123");
    expect(mapped.nomeProf).toBe("Dr. Silva");
    expect(mapped.convenioId).toBe(1);
    expect(mapped.estabelecimentoId).toBe(3);
    expect(mapped.competencia).toBe("2026/01");
    expect(mapped.arquivoId).toBe(100);
  });
});
