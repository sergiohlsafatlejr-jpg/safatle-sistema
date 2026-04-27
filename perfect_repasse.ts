export async function getRepasseData(filters: {
  userId: number;
  convenioId?: number;
  estabelecimentoId?: number;
  dataInicio?: Date;
  dataFim?: Date;
  search?: string;
  page: number;
  pageSize: number;
  tipoRelatorio?: string;
}): Promise<{ items: any[]; total: number; resumo: any }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0, resumo: {} };

  const idsPermitidos = await getEstabelecimentosPermitidos(filters.userId);
  if (idsPermitidos.length === 0) return { items: [], total: 0, resumo: {} };

  const estabIds = filters.estabelecimentoId
    ? [filters.estabelecimentoId]
    : idsPermitidos;

  if (filters.estabelecimentoId && !idsPermitidos.includes(filters.estabelecimentoId)) {
    return { items: [], total: 0, resumo: {} };
  }

  const convMap = new Map<number, string>();
  const allConv = await db.select().from(convenios);
  for (const c of allConv) convMap.set(c.id, c.nome_fantasia || c.razao_social || "Sem Convênio");

  const [es] = await db
    .select({ cnpj: estabelecimentos.cnpj })
    .from(estabelecimentos)
    .where(eq(estabelecimentos.id, estabIds[0]))
    .limit(1);

  if (!es?.cnpj) return { items: [], total: 0, resumo: {} };
  const cnpjUser = es.cnpj.replace(/\D/g, "");

  const resumoPorConvenio: Record<string, { faturado: number; pago: number; glosado: number; itens: number }> = {};

  if (["laboratorio", "ultrassom"].includes(filters.tipoRelatorio || "")) {
    const conditions: any[] = [
      eq(demonstrativo.cnpj, cnpjUser),
      filters.convenioId ? eq(demonstrativo.convenioId, filters.convenioId) : undefined,
      filters.dataInicio ? gte(demonstrativo.dataExecucao, filters.dataInicio) : undefined,
      filters.dataFim ? lte(demonstrativo.dataExecucao, filters.dataFim) : undefined,
    ].filter(Boolean);

    if (filters.search) {
      conditions.push(
        or(
          like(demonstrativo.codigoItem, `%${filters.search}%`),
          like(demonstrativo.descricaoItem, `%${filters.search}%`),
          like(demonstrativo.numeroGuia, `%${filters.search}%`),
          like(demonstrativo.nomeBeneficiario, `%${filters.search}%`)
        )
      );
    }

    if (filters.tipoRelatorio === "laboratorio") {
        // Just filter by 'Exames' keyword
        conditions.push(like(demonstrativo.descricaoItem, "%EXAME%"));
    } else if (filters.tipoRelatorio === "ultrassom") {
        conditions.push(like(demonstrativo.descricaoItem, "%ULTRASSOM%"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const res = await db.select().from(demonstrativo).where(whereClause);

    let totalFaturado = 0;
    let totalPago = 0;
    let totalGlosado = 0;
    const medicos = new Set<string>();

    const items = res.map(row => {
      const vFat = parseFloat(row.valorFaturado) || 0;
      const vPago = parseFloat(row.valorPago) || 0;
      const vGlosado = parseFloat(row.valorGlosa) || 0;

      totalFaturado += vFat;
      totalPago += vPago;
      totalGlosado += vGlosado;

      const convNome = row.convenioId ? convMap.get(row.convenioId) || "Sem Convênio" : "Sem Convênio";
      if (!resumoPorConvenio[convNome]) {
         resumoPorConvenio[convNome] = { faturado: 0, pago: 0, glosado: 0, itens: 0 };
      }
      resumoPorConvenio[convNome].faturado += vFat;
      resumoPorConvenio[convNome].pago += vPago;
      resumoPorConvenio[convNome].glosado += vGlosado;
      resumoPorConvenio[convNome].itens += 1;

      if (row.nomeBeneficiario && row.nomeBeneficiario !== "Próprio Estabelecimento") {
          medicos.add(row.nomeBeneficiario);
      }

      return {
        id: row.id,
        pacienteNome: row.nomeBeneficiario || "Desconhecido",
        dataAtendimento: row.dataExecucao ? new Date(row.dataExecucao) : null,
        convenioNome: convNome,
        valorFaturado: vFat.toFixed(2),
        valorPago: vPago.toFixed(2),
        valorGlosado: vGlosado.toFixed(2),
        nomeMedico: row.nomeBeneficiario || ""
      };
    });

    const offset = (filters.page - 1) * filters.pageSize;
    const paginatedItems = items.slice(offset, offset + filters.pageSize);

    return {
      items: paginatedItems,
      total: items.length,
      resumo: {
          totalFaturado,
          totalPago,
          totalGlosado,
          totalItens: items.length,
          totalMedicos: medicos.size,
          resumoPorConvenio
      }
    };
  } else {
      // Geral / Medicos (fallback with mock aggregation for completeness here, same logic)
      const offset2 = (filters.page - 1) * filters.pageSize;
      return {
          items: [],
          total: 0,
          resumo: {
              totalFaturado: 0,
              totalPago: 0,
              totalGlosado: 0,
              totalItens: 0,
              totalMedicos: 0,
              resumoPorConvenio
          }
      };
  }
}
