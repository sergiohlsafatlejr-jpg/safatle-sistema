import pg from "pg";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { custosProtudosCache, custosProdutosSyncMeta } from "../drizzle/schema-integracao";
import { eq, and, like, sql, count, desc, asc } from "drizzle-orm";

const { Pool } = pg;

let warleinePool: pg.Pool | null = null;

function getWarleinePool(): pg.Pool {
  if (!warleinePool) {
    warleinePool = new Pool({
      host: ENV.warleineDbHost,
      port: parseInt(ENV.warleineDbPort, 10),
      database: ENV.warleineDbName,
      user: ENV.warleineDbUser,
      password: ENV.warleineDbPassword,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: false,
    });
  }
  return warleinePool;
}

// ============================================================
// MAPEAMENTOS
// ============================================================

const TIPO_PROD_MAP: Record<string, string> = {
  M: "Medicamento",
  T: "Taxa",
  O: "Outros",
};

const TABELA_PRECO_MAP: Record<string, string> = {
  "50": "Tabela 50",
  "04": "Tabela 04 (Brasindice)",
  "07": "Tabela 07 (Simpro)",
  "06": "Tabela 06",
};

// ============================================================
// INTERFACES
// ============================================================

export interface FiltroCustos {
  tipoprod?: string;
  codtbmm?: string;
  busca?: string;
  limit?: number;
  offset?: number;
}

export interface MetricasCustosDashboard {
  totalProdutos: number;
  totalMedicamentos: number;
  totalTaxas: number;
  totalOutros: number;
  custoMedioEstoque: number;
  custoMedioFatura: number;
  valorMedioMM: number;
  porTipoProduto: { nome: string; codigo: string; total: number }[];
  porTabelaPreco: { nome: string; codigo: string; total: number }[];
  topCustoEstoque: { codprod: string; descricao: string; custoEstoque: number; tipoprod: string }[];
  topCustoFatura: { codprod: string; descricao: string; custoMultFat: number; tipoprod: string }[];
  comparativoCustos: { tipo: string; custoEstoque: number; custoFatura: number; valorMM: number }[];
  fonte: "cache_local" | "postgresql_direto";
}

// ============================================================
// BUSCAR PRODUTOS - Cache local ou PostgreSQL
// ============================================================

export async function buscarCustosProdutos(
  estabelecimentoId: number,
  filtros: FiltroCustos
): Promise<{
  dados: any[];
  total: number;
  pagina: number;
  totalPaginas: number;
  fonte: "cache_local" | "postgresql_direto";
}> {
  const limit = filtros.limit || 50;
  const offset = filtros.offset || 0;

  // Tentar cache local primeiro
  try {
    const db = await getDb();
    if (db) {
      const cacheCount = await db
        .select({ total: count() })
        .from(custosProtudosCache)
        .where(eq(custosProtudosCache.estabelecimentoId, estabelecimentoId));

      if (cacheCount[0]?.total > 0) {
        return buscarDoCache(db, estabelecimentoId, filtros, limit, offset);
      }
    }
  } catch (e) {
    console.warn("[RelatorioCustos] Cache local indisponível:", (e as Error).message);
  }

  // Fallback: PostgreSQL direto
  return buscarDoPostgresql(filtros, limit, offset);
}

async function buscarDoCache(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  estabelecimentoId: number,
  filtros: FiltroCustos,
  limit: number,
  offset: number
): Promise<{
  dados: any[];
  total: number;
  pagina: number;
  totalPaginas: number;
  fonte: "cache_local" | "postgresql_direto";
}> {
  const conditions: any[] = [eq(custosProtudosCache.estabelecimentoId, estabelecimentoId)];

  if (filtros.tipoprod) {
    conditions.push(eq(custosProtudosCache.tipoprod, filtros.tipoprod));
  }
  if (filtros.codtbmm) {
    conditions.push(eq(custosProtudosCache.codtbmm, filtros.codtbmm));
  }
  if (filtros.busca) {
    conditions.push(
      sql`(${custosProtudosCache.descricao} LIKE ${"%" + filtros.busca + "%"} OR ${custosProtudosCache.codprod} LIKE ${"%" + filtros.busca + "%"})`
    );
  }

  const whereClause = and(...conditions);

  const [totalResult, dados] = await Promise.all([
    db.select({ total: count() }).from(custosProtudosCache).where(whereClause),
    db
      .select()
      .from(custosProtudosCache)
      .where(whereClause)
      .orderBy(asc(custosProtudosCache.descricao))
      .limit(limit)
      .offset(offset),
  ]);

  const total = totalResult[0]?.total || 0;

  return {
    dados: dados.map((d) => ({
      codprod: d.codprod,
      codtbmm: d.codtbmm,
      descricao: d.descricao,
      tipoprod: d.tipoprod,
      tipoprodDesc: TIPO_PROD_MAP[d.tipoprod || ""] || d.tipoprod,
      tabelaPrecoDesc: TABELA_PRECO_MAP[d.codtbmm] || `Tabela ${d.codtbmm}`,
      capacidadeEstoque: d.capacidadeEstoque ? parseFloat(d.capacidadeEstoque) : null,
      multEstoque: d.multEstoque ? parseFloat(d.multEstoque) : null,
      multFaturas: d.multFaturas ? parseFloat(d.multFaturas) : null,
      unidadeEstoque: d.unidadeEstoque,
      unidadeFaturas: d.unidadeFaturas,
      custoEstoque: d.custoEstoque ? parseFloat(d.custoEstoque) : null,
      custoMultFat: d.custoMultFat ? parseFloat(d.custoMultFat) : null,
      valormm: d.valormm ? parseFloat(d.valormm) : null,
      prevenbras: d.prevenbras ? parseFloat(d.prevenbras) : null,
      prefabsimp: d.prefabsimp ? parseFloat(d.prefabsimp) : null,
    })),
    total,
    pagina: Math.floor(offset / limit) + 1,
    totalPaginas: Math.ceil(total / limit),
    fonte: "cache_local",
  };
}

async function buscarDoPostgresql(
  filtros: FiltroCustos,
  limit: number,
  offset: number
): Promise<{
  dados: any[];
  total: number;
  pagina: number;
  totalPaginas: number;
  fonte: "cache_local" | "postgresql_direto";
}> {
  const client = await getWarleinePool().connect();
  try {
    const tabelasCodtbmm = filtros.codtbmm ? [filtros.codtbmm] : ["50", "04", "07", "06"];
    const params: any[] = [];
    let paramIdx = 1;

    const extraConditions: string[] = [];
    if (filtros.tipoprod) {
      extraConditions.push(`A.tipoprod = $${paramIdx}`);
      params.push(filtros.tipoprod);
      paramIdx++;
    }
    if (filtros.busca) {
      extraConditions.push(`(A.descricao ILIKE $${paramIdx} OR A.codprod ILIKE $${paramIdx})`);
      params.push(`%${filtros.busca}%`);
      paramIdx++;
    }

    const extraWhere = extraConditions.length > 0 ? ` AND ${extraConditions.join(" AND ")}` : "";

    // Build UNION query
    const unionParts = tabelasCodtbmm.map((tbmm) => {
      return `
        SELECT A.codprod, B.codtbmm, A.descricao, A.tipoprod,
          A.capacidade AS capacidade_estoque,
          A.multcobr AS mult_estoque,
          B.multcobr AS mult_faturas,
          A.unidade AS unidade_estoque,
          B.unidade AS unidade_faturas,
          A.custoatual AS custo_estoque,
          CASE 
            WHEN A.tipoprod IN ('M','T','O') THEN A.custoatual / NULLIF(B.multcobr, 0)
            ELSE A.custoatual
          END AS custo_mult_fat,
          B.valormm,
          A.prevenbras,
          A.prefabsimp
        FROM "PACIENTE".tabprod A
        JOIN "PACIENTE".tabmprop B ON A.codprod = B.codprod
        WHERE B.codtbmm = '${tbmm}'
          AND A.tipoprod IN ('M','T','O')
          AND A.inativo IS NULL
          ${extraWhere}
      `;
    });

    const fullQuery = unionParts.join(" UNION ALL ");

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM (${fullQuery}) sub`;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    // Fetch data with pagination
    const dataQuery = `SELECT * FROM (${fullQuery}) sub ORDER BY descricao ASC LIMIT ${limit} OFFSET ${offset}`;
    const dataResult = await client.query(dataQuery, params);

    return {
      dados: dataResult.rows.map((r: any) => ({
        codprod: r.codprod,
        codtbmm: r.codtbmm,
        descricao: r.descricao,
        tipoprod: r.tipoprod,
        tipoprodDesc: TIPO_PROD_MAP[r.tipoprod] || r.tipoprod,
        tabelaPrecoDesc: TABELA_PRECO_MAP[r.codtbmm] || `Tabela ${r.codtbmm}`,
        capacidadeEstoque: r.capacidade_estoque ? parseFloat(r.capacidade_estoque) : null,
        multEstoque: r.mult_estoque ? parseFloat(r.mult_estoque) : null,
        multFaturas: r.mult_faturas ? parseFloat(r.mult_faturas) : null,
        unidadeEstoque: r.unidade_estoque,
        unidadeFaturas: r.unidade_faturas,
        custoEstoque: r.custo_estoque ? parseFloat(r.custo_estoque) : null,
        custoMultFat: r.custo_mult_fat ? parseFloat(r.custo_mult_fat) : null,
        valormm: r.valormm ? parseFloat(r.valormm) : null,
        prevenbras: r.prevenbras ? parseFloat(r.prevenbras) : null,
        prefabsimp: r.prefabsimp ? parseFloat(r.prefabsimp) : null,
      })),
      total,
      pagina: Math.floor(offset / limit) + 1,
      totalPaginas: Math.ceil(total / limit),
      fonte: "postgresql_direto",
    };
  } finally {
    client.release();
  }
}

// ============================================================
// BUSCAR OPÇÕES DE FILTRO
// ============================================================

export async function buscarOpcoesFiltrosCustos(estabelecimentoId: number): Promise<{
  tiposProduto: { codigo: string; nome: string }[];
  tabelasPreco: { codigo: string; nome: string }[];
  fonte: "cache_local" | "postgresql_direto";
}> {
  try {
    const db = await getDb();
    if (db) {
      const cacheCount = await db
        .select({ total: count() })
        .from(custosProtudosCache)
        .where(eq(custosProtudosCache.estabelecimentoId, estabelecimentoId));

      if (cacheCount[0]?.total > 0) {
        const [tipos, tabelas] = await Promise.all([
          db
            .selectDistinct({ codigo: custosProtudosCache.tipoprod })
            .from(custosProtudosCache)
            .where(
              and(
                eq(custosProtudosCache.estabelecimentoId, estabelecimentoId),
                sql`${custosProtudosCache.tipoprod} IS NOT NULL`
              )
            )
            .orderBy(custosProtudosCache.tipoprod),
          db
            .selectDistinct({ codigo: custosProtudosCache.codtbmm })
            .from(custosProtudosCache)
            .where(eq(custosProtudosCache.estabelecimentoId, estabelecimentoId))
            .orderBy(custosProtudosCache.codtbmm),
        ]);

        return {
          tiposProduto: tipos
            .filter((t) => t.codigo)
            .map((t) => ({
              codigo: t.codigo!,
              nome: TIPO_PROD_MAP[t.codigo!] || t.codigo!,
            })),
          tabelasPreco: tabelas.map((t) => ({
            codigo: t.codigo,
            nome: TABELA_PRECO_MAP[t.codigo] || `Tabela ${t.codigo}`,
          })),
          fonte: "cache_local",
        };
      }
    }
  } catch (e) {
    console.warn("[RelatorioCustos] Cache indisponível para filtros:", (e as Error).message);
  }

  // Fallback estático
  return {
    tiposProduto: [
      { codigo: "M", nome: "Medicamento" },
      { codigo: "T", nome: "Taxa" },
      { codigo: "O", nome: "Outros" },
    ],
    tabelasPreco: [
      { codigo: "50", nome: "Tabela 50" },
      { codigo: "04", nome: "Tabela 04 (Brasindice)" },
      { codigo: "07", nome: "Tabela 07 (Simpro)" },
      { codigo: "06", nome: "Tabela 06" },
    ],
    fonte: "postgresql_direto",
  };
}

// ============================================================
// MÉTRICAS AGREGADAS PARA DASHBOARD
// ============================================================

export async function buscarMetricasCustosDashboard(
  estabelecimentoId: number,
  filtros?: { tipoprod?: string; codtbmm?: string }
): Promise<MetricasCustosDashboard> {
  try {
    const db = await getDb();
    if (db) {
      const cacheCount = await db
        .select({ total: count() })
        .from(custosProtudosCache)
        .where(eq(custosProtudosCache.estabelecimentoId, estabelecimentoId));

      if (cacheCount[0]?.total > 0) {
        return buscarMetricasDoCache(db, estabelecimentoId, filtros);
      }
    }
  } catch (e) {
    console.warn("[DashboardCustos] Cache indisponível:", (e as Error).message);
  }

  return buscarMetricasDoPostgresql(filtros);
}

async function buscarMetricasDoCache(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  estabelecimentoId: number,
  filtros?: { tipoprod?: string; codtbmm?: string }
): Promise<MetricasCustosDashboard> {
  const baseConditions: any[] = [eq(custosProtudosCache.estabelecimentoId, estabelecimentoId)];
  if (filtros?.tipoprod) {
    baseConditions.push(eq(custosProtudosCache.tipoprod, filtros.tipoprod));
  }
  if (filtros?.codtbmm) {
    baseConditions.push(eq(custosProtudosCache.codtbmm, filtros.codtbmm));
  }
  const whereClause = and(...baseConditions);

  const [
    totalResult,
    porTipo,
    porTabela,
    topCustoEstoque,
    topCustoFatura,
    avgResult,
    comparativo,
  ] = await Promise.all([
    // Totais por tipo
    db
      .select({
        tipoprod: custosProtudosCache.tipoprod,
        total: count(),
      })
      .from(custosProtudosCache)
      .where(whereClause)
      .groupBy(custosProtudosCache.tipoprod),

    // Por tipo (para gráfico)
    db
      .select({
        codigo: custosProtudosCache.tipoprod,
        total: count(),
      })
      .from(custosProtudosCache)
      .where(whereClause)
      .groupBy(custosProtudosCache.tipoprod)
      .orderBy(desc(count())),

    // Por tabela de preço
    db
      .select({
        codigo: custosProtudosCache.codtbmm,
        total: count(),
      })
      .from(custosProtudosCache)
      .where(whereClause)
      .groupBy(custosProtudosCache.codtbmm)
      .orderBy(desc(count())),

    // Top 20 custo estoque
    db
      .select({
        codprod: custosProtudosCache.codprod,
        descricao: custosProtudosCache.descricao,
        custoEstoque: custosProtudosCache.custoEstoque,
        tipoprod: custosProtudosCache.tipoprod,
      })
      .from(custosProtudosCache)
      .where(and(whereClause, sql`${custosProtudosCache.custoEstoque} IS NOT NULL AND ${custosProtudosCache.custoEstoque} > 0`))
      .orderBy(desc(custosProtudosCache.custoEstoque))
      .limit(20),

    // Top 20 custo fatura
    db
      .select({
        codprod: custosProtudosCache.codprod,
        descricao: custosProtudosCache.descricao,
        custoMultFat: custosProtudosCache.custoMultFat,
        tipoprod: custosProtudosCache.tipoprod,
      })
      .from(custosProtudosCache)
      .where(and(whereClause, sql`${custosProtudosCache.custoMultFat} IS NOT NULL AND ${custosProtudosCache.custoMultFat} > 0`))
      .orderBy(desc(custosProtudosCache.custoMultFat))
      .limit(20),

    // Médias
    db
      .select({
        avgCustoEstoque: sql<string>`AVG(CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6)))`,
        avgCustoFatura: sql<string>`AVG(CAST(${custosProtudosCache.custoMultFat} AS DECIMAL(18,6)))`,
        avgValorMM: sql<string>`AVG(CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)))`,
      })
      .from(custosProtudosCache)
      .where(whereClause),

    // Comparativo por tipo
    db
      .select({
        tipoprod: custosProtudosCache.tipoprod,
        avgCustoEstoque: sql<string>`AVG(CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6)))`,
        avgCustoFatura: sql<string>`AVG(CAST(${custosProtudosCache.custoMultFat} AS DECIMAL(18,6)))`,
        avgValorMM: sql<string>`AVG(CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)))`,
      })
      .from(custosProtudosCache)
      .where(whereClause)
      .groupBy(custosProtudosCache.tipoprod),
  ]);

  // Calcular totais
  let totalProdutos = 0;
  let totalMedicamentos = 0;
  let totalTaxas = 0;
  let totalOutros = 0;
  for (const t of totalResult) {
    const n = t.total;
    totalProdutos += n;
    if (t.tipoprod === "M") totalMedicamentos = n;
    if (t.tipoprod === "T") totalTaxas = n;
    if (t.tipoprod === "O") totalOutros = n;
  }

  return {
    totalProdutos,
    totalMedicamentos,
    totalTaxas,
    totalOutros,
    custoMedioEstoque: parseFloat(avgResult[0]?.avgCustoEstoque || "0"),
    custoMedioFatura: parseFloat(avgResult[0]?.avgCustoFatura || "0"),
    valorMedioMM: parseFloat(avgResult[0]?.avgValorMM || "0"),
    porTipoProduto: porTipo.map((t) => ({
      nome: TIPO_PROD_MAP[t.codigo || ""] || t.codigo || "?",
      codigo: t.codigo || "",
      total: t.total,
    })),
    porTabelaPreco: porTabela.map((t) => ({
      nome: TABELA_PRECO_MAP[t.codigo] || `Tabela ${t.codigo}`,
      codigo: t.codigo,
      total: t.total,
    })),
    topCustoEstoque: topCustoEstoque.map((d) => ({
      codprod: d.codprod,
      descricao: d.descricao || "",
      custoEstoque: parseFloat(d.custoEstoque || "0"),
      tipoprod: d.tipoprod || "",
    })),
    topCustoFatura: topCustoFatura.map((d) => ({
      codprod: d.codprod,
      descricao: d.descricao || "",
      custoMultFat: parseFloat(d.custoMultFat || "0"),
      tipoprod: d.tipoprod || "",
    })),
    comparativoCustos: comparativo.map((c) => ({
      tipo: TIPO_PROD_MAP[c.tipoprod || ""] || c.tipoprod || "?",
      custoEstoque: parseFloat(c.avgCustoEstoque || "0"),
      custoFatura: parseFloat(c.avgCustoFatura || "0"),
      valorMM: parseFloat(c.avgValorMM || "0"),
    })),
    fonte: "cache_local",
  };
}

async function buscarMetricasDoPostgresql(
  filtros?: { tipoprod?: string; codtbmm?: string }
): Promise<MetricasCustosDashboard> {
  const client = await getWarleinePool().connect();
  try {
    const tabelasCodtbmm = filtros?.codtbmm ? [filtros.codtbmm] : ["50", "04", "07", "06"];
    const params: any[] = [];
    let paramIdx = 1;

    const extraConditions: string[] = [];
    if (filtros?.tipoprod) {
      extraConditions.push(`A.tipoprod = $${paramIdx}`);
      params.push(filtros.tipoprod);
      paramIdx++;
    }
    const extraWhere = extraConditions.length > 0 ? ` AND ${extraConditions.join(" AND ")}` : "";

    const unionParts = tabelasCodtbmm.map((tbmm) => `
      SELECT A.codprod, B.codtbmm, A.descricao, A.tipoprod,
        A.custoatual AS custo_estoque,
        CASE WHEN A.tipoprod IN ('M','T','O') THEN A.custoatual / NULLIF(B.multcobr, 0) ELSE A.custoatual END AS custo_mult_fat,
        B.valormm
      FROM "PACIENTE".tabprod A
      JOIN "PACIENTE".tabmprop B ON A.codprod = B.codprod
      WHERE B.codtbmm = '${tbmm}'
        AND A.tipoprod IN ('M','T','O')
        AND A.inativo IS NULL
        ${extraWhere}
    `);

    const fullQuery = unionParts.join(" UNION ALL ");

    const [
      porTipoResult,
      porTabelaResult,
      topEstoqueResult,
      topFaturaResult,
      avgResult,
      comparativoResult,
    ] = await Promise.all([
      client.query(`SELECT tipoprod, COUNT(*) as total FROM (${fullQuery}) sub GROUP BY tipoprod ORDER BY total DESC`, params),
      client.query(`SELECT codtbmm, COUNT(*) as total FROM (${fullQuery}) sub GROUP BY codtbmm ORDER BY total DESC`, params),
      client.query(`SELECT codprod, descricao, custo_estoque, tipoprod FROM (${fullQuery}) sub WHERE custo_estoque > 0 ORDER BY custo_estoque DESC LIMIT 20`, params),
      client.query(`SELECT codprod, descricao, custo_mult_fat, tipoprod FROM (${fullQuery}) sub WHERE custo_mult_fat > 0 ORDER BY custo_mult_fat DESC LIMIT 20`, params),
      client.query(`SELECT AVG(custo_estoque) as avg_estoque, AVG(custo_mult_fat) as avg_fatura, AVG(valormm) as avg_mm FROM (${fullQuery}) sub`, params),
      client.query(`SELECT tipoprod, AVG(custo_estoque) as avg_estoque, AVG(custo_mult_fat) as avg_fatura, AVG(valormm) as avg_mm FROM (${fullQuery}) sub GROUP BY tipoprod`, params),
    ]);

    let totalProdutos = 0;
    let totalMedicamentos = 0;
    let totalTaxas = 0;
    let totalOutros = 0;
    for (const r of porTipoResult.rows) {
      const n = parseInt(r.total, 10);
      totalProdutos += n;
      if (r.tipoprod === "M") totalMedicamentos = n;
      if (r.tipoprod === "T") totalTaxas = n;
      if (r.tipoprod === "O") totalOutros = n;
    }

    return {
      totalProdutos,
      totalMedicamentos,
      totalTaxas,
      totalOutros,
      custoMedioEstoque: parseFloat(avgResult.rows[0]?.avg_estoque || "0"),
      custoMedioFatura: parseFloat(avgResult.rows[0]?.avg_fatura || "0"),
      valorMedioMM: parseFloat(avgResult.rows[0]?.avg_mm || "0"),
      porTipoProduto: porTipoResult.rows.map((r: any) => ({
        nome: TIPO_PROD_MAP[r.tipoprod] || r.tipoprod,
        codigo: r.tipoprod,
        total: parseInt(r.total, 10),
      })),
      porTabelaPreco: porTabelaResult.rows.map((r: any) => ({
        nome: TABELA_PRECO_MAP[r.codtbmm] || `Tabela ${r.codtbmm}`,
        codigo: r.codtbmm,
        total: parseInt(r.total, 10),
      })),
      topCustoEstoque: topEstoqueResult.rows.map((r: any) => ({
        codprod: r.codprod,
        descricao: r.descricao || "",
        custoEstoque: parseFloat(r.custo_estoque || "0"),
        tipoprod: r.tipoprod,
      })),
      topCustoFatura: topFaturaResult.rows.map((r: any) => ({
        codprod: r.codprod,
        descricao: r.descricao || "",
        custoMultFat: parseFloat(r.custo_mult_fat || "0"),
        tipoprod: r.tipoprod,
      })),
      comparativoCustos: comparativoResult.rows.map((r: any) => ({
        tipo: TIPO_PROD_MAP[r.tipoprod] || r.tipoprod,
        custoEstoque: parseFloat(r.avg_estoque || "0"),
        custoFatura: parseFloat(r.avg_fatura || "0"),
        valorMM: parseFloat(r.avg_mm || "0"),
      })),
      fonte: "postgresql_direto",
    };
  } finally {
    client.release();
  }
}

// ============================================================
// SINCRONIZAÇÃO: Warleine → Cache Local
// ============================================================

export async function sincronizarCustosProdutos(
  estabelecimentoId: number,
  executadoPor?: number,
  executadoPorNome?: string
): Promise<{
  sucesso: boolean;
  mensagem: string;
  totalRegistros: number;
  duracaoSegundos: number;
}> {
  const db = await getDb();
  if (!db) {
    return { sucesso: false, mensagem: "Banco de dados local não disponível", totalRegistros: 0, duracaoSegundos: 0 };
  }

  const inicio = Date.now();

  // Atualizar status para em_andamento
  await upsertSyncMeta(db, estabelecimentoId, {
    status: "em_andamento",
    executadoPor: executadoPor || null,
    executadoPorNome: executadoPorNome || null,
  });

  try {
    const client = await getWarleinePool().connect();
    let totalRegistros = 0;

    try {
      // Buscar todos os dados das 4 tabelas de preço
      const query = `
        SELECT A.codprod, B.codtbmm, A.descricao, A.tipoprod,
          A.capacidade AS capacidade_estoque,
          A.multcobr AS mult_estoque,
          B.multcobr AS mult_faturas,
          A.unidade AS unidade_estoque,
          B.unidade AS unidade_faturas,
          A.custoatual AS custo_estoque,
          CASE 
            WHEN A.tipoprod IN ('M','T','O') THEN A.custoatual / NULLIF(B.multcobr, 0)
            ELSE A.custoatual
          END AS custo_mult_fat,
          B.valormm,
          A.prevenbras,
          A.prefabsimp
        FROM "PACIENTE".tabprod A
        JOIN "PACIENTE".tabmprop B ON A.codprod = B.codprod
        WHERE B.codtbmm IN ('50', '04', '07', '06')
          AND A.tipoprod IN ('M','T','O')
          AND A.inativo IS NULL
      `;

      const result = await client.query(query);
      const rows = result.rows;
      totalRegistros = rows.length;

      // Limpar cache anterior deste estabelecimento
      await db.delete(custosProtudosCache).where(eq(custosProtudosCache.estabelecimentoId, estabelecimentoId));

      // Inserir em lotes de 500
      const batchSize = 500;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await db.insert(custosProtudosCache).values(
          batch.map((r: any) => {
            // Helper to safely convert numeric values to decimal(18,6) compatible strings
            const toDecimal = (val: any): string | null => {
              if (val == null || val === '' || val === undefined) return null;
              const num = parseFloat(String(val));
              if (isNaN(num)) return null;
              // Truncate to 6 decimal places and max 12 integer digits to fit decimal(18,6)
              return num.toFixed(6);
            };

            return {
              estabelecimentoId,
              codprod: r.codprod?.trim() || "",
              descricao: r.descricao?.trim() || null,
              tipoprod: r.tipoprod?.trim() || null,
              capacidadeEstoque: toDecimal(r.capacidade_estoque),
              multEstoque: toDecimal(r.mult_estoque),
              multFaturas: toDecimal(r.mult_faturas),
              unidadeEstoque: r.unidade_estoque?.trim() || null,
              unidadeFaturas: r.unidade_faturas?.trim() || null,
              custoEstoque: toDecimal(r.custo_estoque),
              custoMultFat: toDecimal(r.custo_mult_fat),
              valormm: toDecimal(r.valormm),
              prevenbras: toDecimal(r.prevenbras),
              prefabsimp: toDecimal(r.prefabsimp),
              codtbmm: r.codtbmm?.trim() || "",
            };
          })
        );
      }
    } finally {
      client.release();
    }

    const duracao = Math.round((Date.now() - inicio) / 1000);

    await upsertSyncMeta(db, estabelecimentoId, {
      status: "sucesso",
      ultimaSincronizacao: new Date(),
      totalRegistros,
      duracaoSegundos: duracao,
      mensagemErro: null,
    });

    return {
      sucesso: true,
      mensagem: `Sincronização concluída: ${totalRegistros.toLocaleString("pt-BR")} produtos importados em ${duracao}s`,
      totalRegistros,
      duracaoSegundos: duracao,
    };
  } catch (e) {
    const duracao = Math.round((Date.now() - inicio) / 1000);
    const errorMsg = (e as Error).message;

    await upsertSyncMeta(db, estabelecimentoId, {
      status: "erro",
      duracaoSegundos: duracao,
      mensagemErro: errorMsg,
    });

    return {
      sucesso: false,
      mensagem: `Erro na sincronização: ${errorMsg}`,
      totalRegistros: 0,
      duracaoSegundos: duracao,
    };
  }
}

// ============================================================
// STATUS DE SINCRONIZAÇÃO
// ============================================================

export async function obterStatusSincronizacaoCustos(estabelecimentoId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const meta = await db
      .select()
      .from(custosProdutosSyncMeta)
      .where(eq(custosProdutosSyncMeta.estabelecimentoId, estabelecimentoId))
      .limit(1);

    const cacheCount = await db
      .select({ total: count() })
      .from(custosProtudosCache)
      .where(eq(custosProtudosCache.estabelecimentoId, estabelecimentoId));

    const totalRegistrosCache = cacheCount[0]?.total || 0;

    if (meta.length === 0) {
      return {
        status: "nunca",
        ultimaSincronizacao: null,
        totalRegistrosCache,
        duracaoSegundos: 0,
        mensagemErro: null,
      };
    }

    const m = meta[0];
    return {
      status: m.status,
      ultimaSincronizacao: m.ultimaSincronizacao,
      totalRegistrosCache,
      duracaoSegundos: m.duracaoSegundos || 0,
      mensagemErro: m.mensagemErro,
    };
  } catch (e) {
    console.warn("[RelatorioCustos] Erro ao obter status:", (e as Error).message);
    return null;
  }
}

// ============================================================
// HELPER: Upsert sync metadata
// ============================================================

async function upsertSyncMeta(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  estabelecimentoId: number,
  data: Partial<{
    status: string;
    ultimaSincronizacao: Date | null;
    totalRegistros: number;
    duracaoSegundos: number;
    mensagemErro: string | null;
    executadoPor: number | null;
    executadoPorNome: string | null;
  }>
) {
  const existing = await db
    .select()
    .from(custosProdutosSyncMeta)
    .where(eq(custosProdutosSyncMeta.estabelecimentoId, estabelecimentoId))
    .limit(1);

  const updateData: any = { ...data, atualizadoEm: new Date() };

  if (existing.length === 0) {
    await db.insert(custosProdutosSyncMeta).values({
      estabelecimentoId,
      ...updateData,
    });
  } else {
    await db
      .update(custosProdutosSyncMeta)
      .set(updateData)
      .where(eq(custosProdutosSyncMeta.estabelecimentoId, estabelecimentoId));
  }
}


// ============================================================
// COMPARAÇÃO: CUSTO HOSPITAL vs VALOR CONVÊNIO
// ============================================================

export interface FiltroComparacao {
  tipoprod?: string;
  codtbmm?: string;
  busca?: string;
  apenasComPrejuizo?: boolean;
  limit?: number;
  offset?: number;
}

export interface ComparacaoCustoConvenio {
  itens: {
    codprod: string;
    descricao: string;
    tipoprod: string;
    tipoprodDesc: string;
    codtbmm: string;
    tabelaPrecoDesc: string;
    custoHospital: number;
    valorConvenio: number;
    margemReais: number;
    margemPercent: number;
    status: "lucro" | "prejuizo" | "neutro";
  }[];
  total: number;
  pagina: number;
  totalPaginas: number;
  resumo: {
    totalItens: number;
    totalComLucro: number;
    totalComPrejuizo: number;
    totalNeutro: number;
    margemMediaPercent: number;
    margemTotalReais: number;
    custoTotalHospital: number;
    valorTotalConvenio: number;
  };
  topPrejuizo: { codprod: string; descricao: string; tipoprod: string; codtbmm: string; tabelaPrecoDesc: string; custoHospital: number; valorConvenio: number; margemReais: number; margemPercent: number }[];
  topLucro: { codprod: string; descricao: string; tipoprod: string; codtbmm: string; tabelaPrecoDesc: string; custoHospital: number; valorConvenio: number; margemReais: number; margemPercent: number }[];
  margemPorTipo: { tipo: string; margemMedia: number; custoMedio: number; valorMedio: number; total: number }[];
  margemPorTabela: { tabela: string; codigo: string; margemMedia: number; custoMedio: number; valorMedio: number; total: number }[];
  fonte: "cache_local" | "postgresql_direto";
}

export async function buscarComparacaoCustoConvenio(
  estabelecimentoId: number,
  filtros: FiltroComparacao
): Promise<ComparacaoCustoConvenio> {
  const limit = filtros.limit || 50;
  const offset = filtros.offset || 0;

  // Tentar cache local primeiro
  try {
    const db = await getDb();
    if (db) {
      const cacheCount = await db
        .select({ total: count() })
        .from(custosProtudosCache)
        .where(eq(custosProtudosCache.estabelecimentoId, estabelecimentoId));

      if (cacheCount[0]?.total > 0) {
        return buscarComparacaoDoCache(db, estabelecimentoId, filtros, limit, offset);
      }
    }
  } catch (e) {
    console.warn("[RelatorioCustos] Cache indisponível para comparação:", (e as Error).message);
  }

  // Fallback: PostgreSQL direto
  return buscarComparacaoDoPostgresql(filtros, limit, offset);
}

async function buscarComparacaoDoCache(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  estabelecimentoId: number,
  filtros: FiltroComparacao,
  limit: number,
  offset: number
): Promise<ComparacaoCustoConvenio> {
  // Condições base: apenas itens com custo > 0 e valor convênio > 0
  const conditions: any[] = [
    eq(custosProtudosCache.estabelecimentoId, estabelecimentoId),
    sql`${custosProtudosCache.custoEstoque} IS NOT NULL`,
    sql`${custosProtudosCache.custoEstoque} > 0`,
    sql`${custosProtudosCache.valormm} IS NOT NULL`,
    sql`${custosProtudosCache.valormm} > 0`,
  ];

  if (filtros.tipoprod) {
    conditions.push(eq(custosProtudosCache.tipoprod, filtros.tipoprod));
  }
  if (filtros.codtbmm) {
    conditions.push(eq(custosProtudosCache.codtbmm, filtros.codtbmm));
  }
  if (filtros.busca) {
    conditions.push(
      sql`(${custosProtudosCache.descricao} LIKE ${"%" + filtros.busca + "%"} OR ${custosProtudosCache.codprod} LIKE ${"%" + filtros.busca + "%"})`
    );
  }
  if (filtros.apenasComPrejuizo) {
    conditions.push(sql`CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)) < CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6))`);
  }

  const whereClause = and(...conditions);

  // Buscar dados paginados
  const [totalResult, dados] = await Promise.all([
    db.select({ total: count() }).from(custosProtudosCache).where(whereClause),
    db
      .select()
      .from(custosProtudosCache)
      .where(whereClause)
      .orderBy(sql`(CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)) - CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6))) ASC`)
      .limit(limit)
      .offset(offset),
  ]);

  const total = totalResult[0]?.total || 0;

  // Calcular itens com margem
  const itens = dados.map((d) => {
    const custoHospital = parseFloat(d.custoEstoque || "0");
    const valorConvenio = parseFloat(d.valormm || "0");
    const margemReais = valorConvenio - custoHospital;
    const margemPercent = custoHospital > 0 ? ((margemReais / custoHospital) * 100) : 0;

    return {
      codprod: d.codprod,
      descricao: d.descricao || "",
      tipoprod: d.tipoprod || "",
      tipoprodDesc: TIPO_PROD_MAP[d.tipoprod || ""] || d.tipoprod || "?",
      codtbmm: d.codtbmm,
      tabelaPrecoDesc: TABELA_PRECO_MAP[d.codtbmm] || `Tabela ${d.codtbmm}`,
      custoHospital,
      valorConvenio,
      margemReais,
      margemPercent,
      status: (margemReais > 0.01 ? "lucro" : margemReais < -0.01 ? "prejuizo" : "neutro") as "lucro" | "prejuizo" | "neutro",
    };
  });

  // Resumo geral (sem paginação)
  const baseConditions: any[] = [
    eq(custosProtudosCache.estabelecimentoId, estabelecimentoId),
    sql`${custosProtudosCache.custoEstoque} IS NOT NULL`,
    sql`${custosProtudosCache.custoEstoque} > 0`,
    sql`${custosProtudosCache.valormm} IS NOT NULL`,
    sql`${custosProtudosCache.valormm} > 0`,
  ];
  if (filtros.tipoprod) baseConditions.push(eq(custosProtudosCache.tipoprod, filtros.tipoprod));
  if (filtros.codtbmm) baseConditions.push(eq(custosProtudosCache.codtbmm, filtros.codtbmm));
  if (filtros.busca) {
    baseConditions.push(
      sql`(${custosProtudosCache.descricao} LIKE ${"%" + filtros.busca + "%"} OR ${custosProtudosCache.codprod} LIKE ${"%" + filtros.busca + "%"})`
    );
  }
  const baseWhere = and(...baseConditions);

  const [resumoResult, topPrejuizoResult, topLucroResult, margemPorTipoResult, margemPorTabelaResult] = await Promise.all([
    db.select({
      totalItens: count(),
      totalComLucro: sql<number>`SUM(CASE WHEN CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)) > CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6)) + 0.01 THEN 1 ELSE 0 END)`,
      totalComPrejuizo: sql<number>`SUM(CASE WHEN CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)) < CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6)) - 0.01 THEN 1 ELSE 0 END)`,
      custoTotalHospital: sql<string>`SUM(CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6)))`,
      valorTotalConvenio: sql<string>`SUM(CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)))`,
    }).from(custosProtudosCache).where(baseWhere),

    // Top 15 com maior prejuízo
    db.select()
      .from(custosProtudosCache)
      .where(and(...baseConditions, sql`CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)) < CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6)) - 0.01`))
      .orderBy(sql`(CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)) - CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6))) ASC`)
      .limit(15),

    // Top 15 com maior lucro
    db.select()
      .from(custosProtudosCache)
      .where(and(...baseConditions, sql`CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)) > CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6)) + 0.01`))
      .orderBy(sql`(CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)) - CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6))) DESC`)
      .limit(15),

    // Margem por tipo de produto
    db.select({
      tipoprod: custosProtudosCache.tipoprod,
      total: count(),
      avgCusto: sql<string>`AVG(CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6)))`,
      avgValor: sql<string>`AVG(CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)))`,
    }).from(custosProtudosCache).where(baseWhere).groupBy(custosProtudosCache.tipoprod),

    // Margem por tabela de preço
    db.select({
      codtbmm: custosProtudosCache.codtbmm,
      total: count(),
      avgCusto: sql<string>`AVG(CAST(${custosProtudosCache.custoEstoque} AS DECIMAL(18,6)))`,
      avgValor: sql<string>`AVG(CAST(${custosProtudosCache.valormm} AS DECIMAL(18,6)))`,
    }).from(custosProtudosCache).where(baseWhere).groupBy(custosProtudosCache.codtbmm),
  ]);

  const r = resumoResult[0];
  const custoTotal = parseFloat(r?.custoTotalHospital || "0");
  const valorTotal = parseFloat(r?.valorTotalConvenio || "0");
  const margemTotal = valorTotal - custoTotal;
  const totalItens = r?.totalItens || 0;

  const mapItem = (d: any) => {
    const ch = parseFloat(d.custoEstoque || "0");
    const vc = parseFloat(d.valormm || "0");
    const mr = vc - ch;
    return {
      codprod: d.codprod,
      descricao: d.descricao || "",
      tipoprod: d.tipoprod || "",
      codtbmm: d.codtbmm,
      tabelaPrecoDesc: TABELA_PRECO_MAP[d.codtbmm] || `Tabela ${d.codtbmm}`,
      custoHospital: ch,
      valorConvenio: vc,
      margemReais: mr,
      margemPercent: ch > 0 ? (mr / ch) * 100 : 0,
    };
  };

  return {
    itens,
    total,
    pagina: Math.floor(offset / limit) + 1,
    totalPaginas: Math.ceil(total / limit),
    resumo: {
      totalItens,
      totalComLucro: Number(r?.totalComLucro || 0),
      totalComPrejuizo: Number(r?.totalComPrejuizo || 0),
      totalNeutro: totalItens - Number(r?.totalComLucro || 0) - Number(r?.totalComPrejuizo || 0),
      margemMediaPercent: custoTotal > 0 ? (margemTotal / custoTotal) * 100 : 0,
      margemTotalReais: margemTotal,
      custoTotalHospital: custoTotal,
      valorTotalConvenio: valorTotal,
    },
    topPrejuizo: topPrejuizoResult.map(mapItem),
    topLucro: topLucroResult.map(mapItem),
    margemPorTipo: margemPorTipoResult.map((t) => {
      const avgC = parseFloat(t.avgCusto || "0");
      const avgV = parseFloat(t.avgValor || "0");
      return {
        tipo: TIPO_PROD_MAP[t.tipoprod || ""] || t.tipoprod || "?",
        margemMedia: avgC > 0 ? ((avgV - avgC) / avgC) * 100 : 0,
        custoMedio: avgC,
        valorMedio: avgV,
        total: t.total,
      };
    }),
    margemPorTabela: margemPorTabelaResult.map((t) => {
      const avgC = parseFloat(t.avgCusto || "0");
      const avgV = parseFloat(t.avgValor || "0");
      return {
        tabela: TABELA_PRECO_MAP[t.codtbmm] || `Tabela ${t.codtbmm}`,
        codigo: t.codtbmm,
        margemMedia: avgC > 0 ? ((avgV - avgC) / avgC) * 100 : 0,
        custoMedio: avgC,
        valorMedio: avgV,
        total: t.total,
      };
    }),
    fonte: "cache_local",
  };
}

async function buscarComparacaoDoPostgresql(
  filtros: FiltroComparacao,
  limit: number,
  offset: number
): Promise<ComparacaoCustoConvenio> {
  const client = await getWarleinePool().connect();
  try {
    const tabelasCodtbmm = filtros.codtbmm ? [filtros.codtbmm] : ["50", "04", "07", "06"];
    const params: any[] = [];
    let paramIdx = 1;

    const extraConditions: string[] = [
      "A.custoatual IS NOT NULL",
      "A.custoatual > 0",
      "B.valormm IS NOT NULL",
      "B.valormm > 0",
    ];
    if (filtros.tipoprod) {
      extraConditions.push(`A.tipoprod = $${paramIdx}`);
      params.push(filtros.tipoprod);
      paramIdx++;
    }
    if (filtros.busca) {
      extraConditions.push(`(A.descricao ILIKE $${paramIdx} OR A.codprod ILIKE $${paramIdx})`);
      params.push(`%${filtros.busca}%`);
      paramIdx++;
    }

    const extraWhere = extraConditions.length > 0 ? ` AND ${extraConditions.join(" AND ")}` : "";

    const unionParts = tabelasCodtbmm.map((tbmm) => `
      SELECT A.codprod, B.codtbmm, A.descricao, A.tipoprod,
        A.custoatual AS custo_hospital,
        B.valormm AS valor_convenio,
        (B.valormm - A.custoatual) AS margem_reais
      FROM "PACIENTE".tabprod A
      JOIN "PACIENTE".tabmprop B ON A.codprod = B.codprod
      WHERE B.codtbmm = '${tbmm}'
        AND A.tipoprod IN ('M','T','O')
        AND A.inativo IS NULL
        ${extraWhere}
    `);

    const fullQuery = unionParts.join(" UNION ALL ");

    let filteredQuery = fullQuery;
    if (filtros.apenasComPrejuizo) {
      filteredQuery = `SELECT * FROM (${fullQuery}) sub WHERE margem_reais < -0.01`;
    }

    const [countResult, dataResult, resumoResult, topPrejResult, topLucroResult, porTipoResult, porTabelaResult] = await Promise.all([
      client.query(`SELECT COUNT(*) as total FROM (${filteredQuery}) sub2`, params),
      client.query(`SELECT * FROM (${filteredQuery}) sub2 ORDER BY margem_reais ASC LIMIT ${limit} OFFSET ${offset}`, params),
      client.query(`SELECT COUNT(*) as total, SUM(CASE WHEN margem_reais > 0.01 THEN 1 ELSE 0 END) as lucro, SUM(CASE WHEN margem_reais < -0.01 THEN 1 ELSE 0 END) as prejuizo, SUM(custo_hospital) as custo_total, SUM(valor_convenio) as valor_total FROM (${fullQuery}) sub`, params),
      client.query(`SELECT * FROM (${fullQuery}) sub WHERE margem_reais < -0.01 ORDER BY margem_reais ASC LIMIT 15`, params),
      client.query(`SELECT * FROM (${fullQuery}) sub WHERE margem_reais > 0.01 ORDER BY margem_reais DESC LIMIT 15`, params),
      client.query(`SELECT tipoprod, COUNT(*) as total, AVG(custo_hospital) as avg_custo, AVG(valor_convenio) as avg_valor FROM (${fullQuery}) sub GROUP BY tipoprod`, params),
      client.query(`SELECT codtbmm, COUNT(*) as total, AVG(custo_hospital) as avg_custo, AVG(valor_convenio) as avg_valor FROM (${fullQuery}) sub GROUP BY codtbmm`, params),
    ]);

    const total = parseInt(countResult.rows[0]?.total || "0", 10);
    const rs = resumoResult.rows[0];
    const custoTotal = parseFloat(rs?.custo_total || "0");
    const valorTotal = parseFloat(rs?.valor_total || "0");
    const margemTotal = valorTotal - custoTotal;
    const totalItens = parseInt(rs?.total || "0", 10);

    const mapRow = (r: any) => {
      const ch = parseFloat(r.custo_hospital || "0");
      const vc = parseFloat(r.valor_convenio || "0");
      const mr = vc - ch;
      return {
        codprod: r.codprod,
        descricao: r.descricao || "",
        tipoprod: r.tipoprod || "",
        tipoprodDesc: TIPO_PROD_MAP[r.tipoprod] || r.tipoprod,
        codtbmm: r.codtbmm,
        tabelaPrecoDesc: TABELA_PRECO_MAP[r.codtbmm] || `Tabela ${r.codtbmm}`,
        custoHospital: ch,
        valorConvenio: vc,
        margemReais: mr,
        margemPercent: ch > 0 ? (mr / ch) * 100 : 0,
        status: (mr > 0.01 ? "lucro" : mr < -0.01 ? "prejuizo" : "neutro") as "lucro" | "prejuizo" | "neutro",
      };
    };

    return {
      itens: dataResult.rows.map(mapRow),
      total,
      pagina: Math.floor(offset / limit) + 1,
      totalPaginas: Math.ceil(total / limit),
      resumo: {
        totalItens,
        totalComLucro: parseInt(rs?.lucro || "0", 10),
        totalComPrejuizo: parseInt(rs?.prejuizo || "0", 10),
        totalNeutro: totalItens - parseInt(rs?.lucro || "0", 10) - parseInt(rs?.prejuizo || "0", 10),
        margemMediaPercent: custoTotal > 0 ? (margemTotal / custoTotal) * 100 : 0,
        margemTotalReais: margemTotal,
        custoTotalHospital: custoTotal,
        valorTotalConvenio: valorTotal,
      },
      topPrejuizo: topPrejResult.rows.map((r: any) => {
        const ch = parseFloat(r.custo_hospital || "0");
        const vc = parseFloat(r.valor_convenio || "0");
        const mr = vc - ch;
        return { codprod: r.codprod, descricao: r.descricao || "", tipoprod: r.tipoprod, codtbmm: r.codtbmm, tabelaPrecoDesc: TABELA_PRECO_MAP[r.codtbmm] || `Tabela ${r.codtbmm}`, custoHospital: ch, valorConvenio: vc, margemReais: mr, margemPercent: ch > 0 ? (mr / ch) * 100 : 0 };
      }),
      topLucro: topLucroResult.rows.map((r: any) => {
        const ch = parseFloat(r.custo_hospital || "0");
        const vc = parseFloat(r.valor_convenio || "0");
        const mr = vc - ch;
        return { codprod: r.codprod, descricao: r.descricao || "", tipoprod: r.tipoprod, codtbmm: r.codtbmm, tabelaPrecoDesc: TABELA_PRECO_MAP[r.codtbmm] || `Tabela ${r.codtbmm}`, custoHospital: ch, valorConvenio: vc, margemReais: mr, margemPercent: ch > 0 ? (mr / ch) * 100 : 0 };
      }),
      margemPorTipo: porTipoResult.rows.map((r: any) => {
        const avgC = parseFloat(r.avg_custo || "0");
        const avgV = parseFloat(r.avg_valor || "0");
        return { tipo: TIPO_PROD_MAP[r.tipoprod] || r.tipoprod, margemMedia: avgC > 0 ? ((avgV - avgC) / avgC) * 100 : 0, custoMedio: avgC, valorMedio: avgV, total: parseInt(r.total, 10) };
      }),
      margemPorTabela: porTabelaResult.rows.map((r: any) => {
        const avgC = parseFloat(r.avg_custo || "0");
        const avgV = parseFloat(r.avg_valor || "0");
        return { tabela: TABELA_PRECO_MAP[r.codtbmm] || `Tabela ${r.codtbmm}`, codigo: r.codtbmm, margemMedia: avgC > 0 ? ((avgV - avgC) / avgC) * 100 : 0, custoMedio: avgC, valorMedio: avgV, total: parseInt(r.total, 10) };
      }),
      fonte: "postgresql_direto",
    };
  } finally {
    client.release();
  }
}


// ============================================================
// CUSTOS POR CONVÊNIO - Dados diretos do PostgreSQL Warleine
// Tabelas: lancamen + contas + cadplaco + tabprod
// ============================================================

export interface FiltroCustoPorConvenio {
  convenio?: string;
  tipoItem?: string; // P = Produto, S = Serviço
  competencia?: string; // formato YYYY-MM
  busca?: string;
}

export interface ItemCustoConvenio {
  codprod: string;
  descricao: string;
  tipoItem: string; // P ou S
  custoEstoque: number; // custoatual da tabprod
  convenios: {
    convenio: string;
    codplaco: string;
    quantidade: number;
    valorCobrado: number; // vltotreais
    vlcusto: number; // vlcusto do lancamen
    custoTotal: number; // custoEstoque * quantidade
    margem: number; // valorCobrado - custoTotal
    resultado: "lucro" | "prejuizo" | "empate";
  }[];
}

export interface ResumoConvenio {
  convenio: string;
  codplaco: string;
  totalLancamentos: number;
  totalFaturado: number;
  totalCusto: number;
  margem: number;
  margemPercent: number;
  resultado: "lucro" | "prejuizo" | "empate";
}

export interface CustoPorConvenioResult {
  // Tabela principal: cada item com valor por convênio
  itens: ItemCustoConvenio[];
  totalItens: number;
  // Resumo por convênio
  resumoPorConvenio: ResumoConvenio[];
  // KPIs simples
  kpis: {
    totalConvenios: number;
    totalItensAnalisados: number;
    totalItensSemCusto: number;
    valorFaturadoTotal: number;
    custoTotal: number;
    margemTotal: number;
    margemMediaPercent: number;
  };
  // Top itens com maior prejuízo
  topItensPrejuizo: {
    codprod: string;
    descricao: string;
    convenio: string;
    quantidade: number;
    valorCobrado: number;
    custoTotal: number;
    margem: number;
  }[];
  // Top itens com maior lucro
  topItensLucro: {
    codprod: string;
    descricao: string;
    convenio: string;
    quantidade: number;
    valorCobrado: number;
    custoTotal: number;
    margem: number;
  }[];
  // Listas de filtros
  conveniosDisponiveis: { codplaco: string; nome: string }[];
  competenciasDisponiveis: string[];
  fonte: string;
}

export async function buscarCustosPorConvenio(
  _estabelecimentoId: number,
  filtros: FiltroCustoPorConvenio
): Promise<CustoPorConvenioResult> {
  const pool = getWarleinePool();
  const client = await pool.connect();

  try {
    await client.query("SET statement_timeout = '120s'");

    // ---- Filtros dinâmicos ----
    const conditions: string[] = [
      `L.vltotreais::numeric > 0`,
    ];
    const params: any[] = [];
    let paramIdx = 1;

    // Filtro de período: default últimos 12 meses
    if (filtros.competencia) {
      conditions.push(`TO_CHAR(L.data, 'YYYY-MM') = $${paramIdx}`);
      params.push(filtros.competencia);
      paramIdx++;
    } else {
      conditions.push(`L.data >= NOW() - INTERVAL '12 months'`);
    }

    if (filtros.convenio) {
      conditions.push(`CP.codplaco = $${paramIdx}`);
      params.push(filtros.convenio);
      paramIdx++;
    }

    if (filtros.tipoItem) {
      conditions.push(`L.tipoitem = $${paramIdx}`);
      params.push(filtros.tipoItem);
      paramIdx++;
    }

    if (filtros.busca) {
      conditions.push(`(L.descricao ILIKE $${paramIdx} OR L.codprod ILIKE $${paramIdx})`);
      params.push(`%${filtros.busca}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    // ---- 1. Buscar convênios disponíveis ----
    const conveniosResult = await client.query(
      `SELECT codplaco, nomeplaco FROM "PACIENTE".cadplaco WHERE inativo IS NULL ORDER BY nomeplaco`
    );
    const conveniosDisponiveis = conveniosResult.rows.map((r: any) => ({
      codplaco: r.codplaco,
      nome: r.nomeplaco,
    }));

    // ---- 2. Buscar competências disponíveis ----
    const compResult = await client.query(
      `SELECT DISTINCT TO_CHAR(L.data, 'YYYY-MM') as comp
       FROM "PACIENTE".lancamen L
       WHERE L.data >= NOW() - INTERVAL '24 months'
       ORDER BY comp DESC`
    );
    const competenciasDisponiveis = compResult.rows.map((r: any) => r.comp);

    // ---- 3. Query principal: itens agrupados por produto + convênio ----
    const mainQuery = `
      SELECT
        TRIM(L.codprod) as codprod,
        L.descricao,
        L.tipoitem,
        CP.codplaco,
        CP.nomeplaco as convenio,
        SUM(L.quantidade::numeric) as total_quantidade,
        SUM(L.vltotreais::numeric) as total_cobrado,
        SUM(L.vlcusto::numeric) as total_vlcusto,
        TP.custoatual::numeric as custo_estoque_unitario,
        COUNT(*) as num_lancamentos
      FROM "PACIENTE".lancamen L
      JOIN "PACIENTE".contas C ON L.numconta = C.numconta
      LEFT JOIN "PACIENTE".cadplaco CP ON C.codplaco = CP.codplaco
      LEFT JOIN "PACIENTE".tabprod TP ON TRIM(L.codprod) = TRIM(TP.codprod)
      WHERE ${whereClause}
        AND L.codprod IS NOT NULL
        AND TRIM(L.codprod) != ''
      GROUP BY TRIM(L.codprod), L.descricao, L.tipoitem, CP.codplaco, CP.nomeplaco, TP.custoatual
      ORDER BY total_cobrado DESC
    `;
    const mainResult = await client.query(mainQuery, params);

    // ---- 4. Query de resumo por convênio ----
    const resumoQuery = `
      SELECT
        CP.codplaco,
        CP.nomeplaco as convenio,
        COUNT(*) as total_lancamentos,
        SUM(L.vltotreais::numeric) as total_faturado,
        SUM(L.vlcusto::numeric) as total_vlcusto,
        SUM(COALESCE(TP.custoatual::numeric, 0) * L.quantidade::numeric) as total_custo_estoque
      FROM "PACIENTE".lancamen L
      JOIN "PACIENTE".contas C ON L.numconta = C.numconta
      LEFT JOIN "PACIENTE".cadplaco CP ON C.codplaco = CP.codplaco
      LEFT JOIN "PACIENTE".tabprod TP ON TRIM(L.codprod) = TRIM(TP.codprod)
      WHERE ${whereClause}
      GROUP BY CP.codplaco, CP.nomeplaco
      ORDER BY total_faturado DESC
    `;
    const resumoResult = await client.query(resumoQuery, params);

    // ---- Processar dados ----

    // Agrupar itens por codprod (cada item mostra valor por convênio)
    const itensMap = new Map<string, ItemCustoConvenio>();
    let totalItensSemCusto = 0;
    let valorFaturadoTotal = 0;
    let custoTotalGeral = 0;

    for (const row of mainResult.rows) {
      const codprod = (row.codprod || "").trim();
      const descricao = (row.descricao || "").trim();
      const tipoItem = row.tipoitem || "P";
      const convenio = row.convenio || "Sem Convênio";
      const codplaco = row.codplaco || "";
      const quantidade = parseFloat(row.total_quantidade || "0");
      const valorCobrado = parseFloat(row.total_cobrado || "0");
      const vlcusto = parseFloat(row.total_vlcusto || "0");
      const custoEstoqueUnit = parseFloat(row.custo_estoque_unitario || "0");
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
        resultado: margem > 0.01 ? "lucro" : margem < -0.01 ? "prejuizo" : "empate",
      });
    }

    const itens = Array.from(itensMap.values())
      .sort((a, b) => {
        const totalA = a.convenios.reduce((s, c) => s + c.valorCobrado, 0);
        const totalB = b.convenios.reduce((s, c) => s + c.valorCobrado, 0);
        return totalB - totalA;
      })
      .slice(0, 200); // Limitar a 200 itens para performance

    // Resumo por convênio
    const resumoPorConvenio: ResumoConvenio[] = resumoResult.rows.map((r: any) => {
      const totalFaturado = parseFloat(r.total_faturado || "0");
      const totalCustoEstoque = parseFloat(r.total_custo_estoque || "0");
      const totalVlcusto = parseFloat(r.total_vlcusto || "0");
      // Usar custo de estoque quando disponível, senão vlcusto do lançamento
      const totalCusto = totalCustoEstoque > 0 ? totalCustoEstoque : totalVlcusto;
      const margem = totalFaturado - totalCusto;
      return {
        convenio: r.convenio || "Sem Convênio",
        codplaco: r.codplaco || "",
        totalLancamentos: parseInt(r.total_lancamentos || "0"),
        totalFaturado: Math.round(totalFaturado * 100) / 100,
        totalCusto: Math.round(totalCusto * 100) / 100,
        margem: Math.round(margem * 100) / 100,
        margemPercent: totalCusto > 0 ? Math.round((margem / totalCusto) * 10000) / 100 : 0,
        resultado: margem > 0.01 ? "lucro" as const : margem < -0.01 ? "prejuizo" as const : "empate" as const,
      };
    });

    // Top 20 itens com maior prejuízo por convênio
    const todosItensConvenio: { codprod: string; descricao: string; convenio: string; quantidade: number; valorCobrado: number; custoTotal: number; margem: number }[] = [];
    for (const item of itensMap.values()) {
      for (const conv of item.convenios) {
        todosItensConvenio.push({
          codprod: item.codprod,
          descricao: item.descricao,
          convenio: conv.convenio,
          quantidade: conv.quantidade,
          valorCobrado: conv.valorCobrado,
          custoTotal: conv.custoTotal,
          margem: conv.margem,
        });
      }
    }

    const topItensPrejuizo = todosItensConvenio
      .filter((i) => i.margem < -0.01)
      .sort((a, b) => a.margem - b.margem)
      .slice(0, 20);

    const topItensLucro = todosItensConvenio
      .filter((i) => i.margem > 0.01)
      .sort((a, b) => b.margem - a.margem)
      .slice(0, 20);

    const margemTotal = valorFaturadoTotal - custoTotalGeral;

    return {
      itens,
      totalItens: itensMap.size,
      resumoPorConvenio,
      kpis: {
        totalConvenios: resumoPorConvenio.length,
        totalItensAnalisados: mainResult.rows.length,
        totalItensSemCusto,
        valorFaturadoTotal: Math.round(valorFaturadoTotal * 100) / 100,
        custoTotal: Math.round(custoTotalGeral * 100) / 100,
        margemTotal: Math.round(margemTotal * 100) / 100,
        margemMediaPercent: custoTotalGeral > 0
          ? Math.round((margemTotal / custoTotalGeral) * 10000) / 100
          : 0,
      },
      topItensPrejuizo,
      topItensLucro,
      conveniosDisponiveis,
      competenciasDisponiveis,
      fonte: "postgresql_warleine_direto",
    };
  } finally {
    client.release();
  }
}
