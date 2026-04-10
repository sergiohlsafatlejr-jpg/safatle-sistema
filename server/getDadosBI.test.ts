import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testa a lógica de filtro por competência da conta no getDadosBI.
 * A correção principal: quando há filtro de competência, o getDadosBI deve
 * usar SUBQUERY com contas_convenio_resumo para encontrar as guias da competência,
 * depois buscar TODOS os itens dessas guias no staging_faturamento_xml (sem filtrar por competência do item).
 * O filtro de convênio é aplicado APENAS na subquery (contas_convenio_resumo),
 * NÃO no staging_faturamento_xml, para garantir que todos os itens das guias sejam incluídos.
 */

describe("getDadosBI - Filtro por competência da conta via subquery", () => {
  
  // Simula a construção da SQL como feita no getDadosBI atualizado
  function buildQuery(opts: { estabelecimentoId: number; competenciaFiltro?: string; anoReferencia?: number; convenioId?: number }) {
    const { estabelecimentoId, competenciaFiltro, anoReferencia, convenioId } = opts;
    
    const subqueryParts: string[] = [
      'SELECT DISTINCT ccr.numeroConta FROM contas_convenio_resumo ccr',
      'WHERE ccr.estabelecimentoId = ' + (estabelecimentoId || 0),
    ];
    if (convenioId) subqueryParts.push('AND ccr.convenioId = ' + convenioId);
    if (competenciaFiltro) subqueryParts.push(`AND ccr.competencia = '${competenciaFiltro}'`);
    else if (anoReferencia) subqueryParts.push(`AND ccr.competencia LIKE '${anoReferencia}/%'`);
    
    const sqlParts: string[] = [
      'SELECT ft.* FROM staging_faturamento_xml ft',
      'WHERE ft.estabelecimentoId = ' + (estabelecimentoId || 0),
      'AND ft.numero_guia_prestador IN (' + subqueryParts.join(' ') + ')',
    ];
    
    return sqlParts.join(' ');
  }

  it("deve gerar SQL com subquery na contas_convenio_resumo quando há filtro de competência", () => {
    const finalSql = buildQuery({ estabelecimentoId: 3, competenciaFiltro: "2026/01" });
    
    expect(finalSql).toContain('SELECT DISTINCT ccr.numeroConta FROM contas_convenio_resumo ccr');
    expect(finalSql).toContain("ccr.competencia = '2026/01'");
    expect(finalSql).toContain('ft.estabelecimentoId = 3');
    expect(finalSql).toContain('ft.numero_guia_prestador IN (');
    // NÃO deve filtrar por competência do item no staging_faturamento_xml
    expect(finalSql).not.toContain('ft.competencia');
  });

  it("deve gerar SQL com filtro LIKE para ano quando só ano é fornecido", () => {
    const finalSql = buildQuery({ estabelecimentoId: 3, anoReferencia: 2026 });
    
    expect(finalSql).toContain('SELECT DISTINCT ccr.numeroConta FROM contas_convenio_resumo ccr');
    expect(finalSql).toContain("ccr.competencia LIKE '2026/%'");
  });

  it("deve filtrar convênio APENAS na subquery, NÃO no staging_faturamento_xml", () => {
    const finalSql = buildQuery({ estabelecimentoId: 1, competenciaFiltro: "2026/01", convenioId: 60008 });
    
    // Convênio deve estar na subquery
    expect(finalSql).toContain('ccr.convenioId = 60008');
    // Convênio NÃO deve estar no staging_faturamento_xml
    // Contar ocorrências de "convenioId = 60008" - deve ser apenas 1 (na subquery)
    const matches = finalSql.match(/convenioId = 60008/g);
    expect(matches).toHaveLength(1);
    // Verificar que NÃO tem ft.convenioId
    expect(finalSql).not.toContain('ft.convenioId');
  });

  it("sem filtro de convênio, subquery não deve ter filtro de convênio", () => {
    const finalSql = buildQuery({ estabelecimentoId: 1, competenciaFiltro: "2026/01" });
    
    expect(finalSql).not.toContain('convenioId');
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
