/**
 * Serviço de Relatório de Faturamento
 * Consulta a tabela integ_faturado para gerar indicadores:
 * - Acumulado Ano Atual vs Ano Anterior
 * - Faturamento por Setor (nomecc)
 * - Faturamento por Mês (mesprod)
 * - Faturamento por Tipo de Atendimento (tipoatend)
 * - Faturamento por Convênio (nomeconv)
 * - Tabela comparativa mês a mês (Mês, Faturado Atual, Faturado Anterior, Qtd Contas)
 */
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { buscarTotaisFaturamentoExterno, buscarTotaisPorConvenioExterno } from "./faturamentoExterno";

// ============================================================
// INTERFACES
// ============================================================

export interface FiltroRelatorioFaturamento {
  estabelecimentoId: number;
  anoAtual?: number;
  anoAnterior?: number;
}

export interface AcumuladoAnual {
  anoAtual: number;
  anoAnterior: number;
  totalFaturadoAtual: number;
  totalFaturadoAnterior: number;
  variacaoPercentual: number;
  qtdContasAtual: number;
  qtdContasAnterior: number;
}

export interface FaturamentoPorSetor {
  setor: string;
  totalFaturado: number;
  qtdContas: number;
  percentual: number;
}

export interface FaturamentoPorMes {
  mes: string;        // "2025/01"
  mesFormatado: string; // "Jan/2025"
  totalFaturado: number;
  qtdContas: number;
}

export interface FaturamentoPorTipoAtendimento {
  tipo: string;
  tipoDescricao: string;
  totalFaturado: number;
  qtdContas: number;
  percentual: number;
}

export interface FaturamentoPorConvenio {
  convenio: string;
  totalFaturado: number;
  qtdContas: number;
  percentual: number;
}

export interface TabelaComparativaMes {
  mes: string;        // "01", "02", etc.
  mesNome: string;    // "Janeiro", "Fevereiro", etc.
  faturadoAtual: number;
  faturadoAnterior: number;
  qtdContasAtual: number;
  qtdContasAnterior: number;
  variacao: number;   // percentual
}

export interface RelatorioFaturamentoResult {
  acumulado: AcumuladoAnual;
  porSetor: FaturamentoPorSetor[];
  porMes: FaturamentoPorMes[];
  porTipoAtendimento: FaturamentoPorTipoAtendimento[];
  porConvenio: FaturamentoPorConvenio[];
  tabelaComparativa: TabelaComparativaMes[];
}

// ============================================================
// HELPERS
// ============================================================

const MESES_NOMES: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

const MESES_ABREV: Record<string, string> = {
  "01": "Jan",
  "02": "Fev",
  "03": "Mar",
  "04": "Abr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Set",
  "10": "Out",
  "11": "Nov",
  "12": "Dez",
};

const TIPO_ATENDIMENTO_DESC: Record<string, string> = {
  "I": "Internação",
  "A": "Ambulatorial",
  "U": "Urgência/Emergência",
  "E": "Exame",
  "C": "Consulta",
  "P": "Pronto Socorro",
};

function parseValor(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  const str = String(val).replace(/[^\d.,\-]/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// ============================================================
// QUERIES
// ============================================================

// ============================================================
// LISTAR CONVÊNIOS DISPONÍVEIS
// ============================================================

export async function listarConveniosDisponiveis(
  estabelecimentoId: number
): Promise<string[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const [rows] = await db.execute(
    sql.raw(`
      SELECT DISTINCT COALESCE(TRIM(nomeconv), 'Não informado') as convenio
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabelecimentoId}
        AND nomeconv IS NOT NULL
        AND TRIM(nomeconv) != ''
      ORDER BY convenio ASC
    `)
  );

  const convenios = (rows as unknown as any[]).map((r: any) => String(r.convenio || "").trim()).filter(Boolean);

  // Incluir convênios de faturamento externo
  try {
    const extConvenios = await listarConveniosExternosInterno(estabelecimentoId);
    for (const c of extConvenios) {
      if (!convenios.includes(c)) convenios.push(c);
    }
    convenios.sort();
  } catch { /* sem dados externos */ }

  return convenios;
}

async function listarConveniosExternosInterno(estabelecimentoId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const [rows] = await db.execute(
    sql.raw(`
      SELECT DISTINCT convenio
      FROM faturamento_externo
      WHERE estabelecimento_id = ${estabelecimentoId}
      ORDER BY convenio ASC
    `)
  );
  return (rows as unknown as any[]).map((r: any) => String(r.convenio || "").trim()).filter(Boolean);
}

// ============================================================
// TABELA COMPARATIVA POR CONVÊNIO
// ============================================================

export interface FiltroTabelaPorConvenio {
  estabelecimentoId: number;
  anoAtual: number;
  anoAnterior: number;
  convenio: string;
}

export interface TabelaConvenioResult {
  convenio: string;
  anoAtual: number;
  anoAnterior: number;
  totalFaturadoAtual: number;
  totalFaturadoAnterior: number;
  variacaoPercentual: number;
  qtdContasAtual: number;
  qtdContasAnterior: number;
  tabelaComparativa: TabelaComparativaMes[];
}

export async function buscarTabelaPorConvenio(
  filtro: FiltroTabelaPorConvenio
): Promise<TabelaConvenioResult> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const { estabelecimentoId: estabId, anoAtual, anoAnterior, convenio } = filtro;
  const prefixoAtual = `${anoAtual}/`;
  const prefixoAnterior = `${anoAnterior}/`;
  const convenioEscaped = convenio.replace(/'/g, "''");

  // Acumulado ano atual por convênio
  const [acumAtualRows] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAtual}%'
        AND COALESCE(TRIM(nomeconv), 'Não informado') = '${convenioEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
    `)
  );

  // Acumulado ano anterior por convênio
  const [acumAnteriorRows] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAnterior}%'
        AND COALESCE(TRIM(nomeconv), 'Não informado') = '${convenioEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
    `)
  );

  const totalAtual = parseValor((acumAtualRows as any)[0]?.total_faturado);
  const totalAnterior = parseValor((acumAnteriorRows as any)[0]?.total_faturado);
  const qtdContasAtual = Number((acumAtualRows as any)[0]?.qtd_contas) || 0;
  const qtdContasAnterior = Number((acumAnteriorRows as any)[0]?.qtd_contas) || 0;
  const variacaoPercentual = totalAnterior > 0
    ? Math.round(((totalAtual - totalAnterior) / totalAnterior) * 10000) / 100
    : (totalAtual > 0 ? 100 : 0);

  // Mês a mês - ano atual
  const [mesAtualRows] = await db.execute(
    sql.raw(`
      SELECT 
        SUBSTRING(mesprod, 6, 2) as mes_num,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAtual}%'
        AND COALESCE(TRIM(nomeconv), 'Não informado') = '${convenioEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY SUBSTRING(mesprod, 6, 2)
      ORDER BY mes_num ASC
    `)
  );

  // Mês a mês - ano anterior
  const [mesAnteriorRows] = await db.execute(
    sql.raw(`
      SELECT 
        SUBSTRING(mesprod, 6, 2) as mes_num,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAnterior}%'
        AND COALESCE(TRIM(nomeconv), 'Não informado') = '${convenioEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY SUBSTRING(mesprod, 6, 2)
      ORDER BY mes_num ASC
    `)
  );

  // Montar mapa por mês
  const mapAtual = new Map<string, { faturado: number; contas: number }>();
  for (const r of mesAtualRows as unknown as any[]) {
    const mesNum = String(r.mes_num || "").trim().padStart(2, "0");
    mapAtual.set(mesNum, {
      faturado: parseValor(r.total_faturado),
      contas: Number(r.qtd_contas) || 0,
    });
  }

  const mapAnterior = new Map<string, { faturado: number; contas: number }>();
  for (const r of mesAnteriorRows as unknown as any[]) {
    const mesNum = String(r.mes_num || "").trim().padStart(2, "0");
    mapAnterior.set(mesNum, {
      faturado: parseValor(r.total_faturado),
      contas: Number(r.qtd_contas) || 0,
    });
  }

  const tabelaComparativa: TabelaComparativaMes[] = [];
  for (let i = 1; i <= 12; i++) {
    const mesKey = String(i).padStart(2, "0");
    const atual = mapAtual.get(mesKey) || { faturado: 0, contas: 0 };
    const anterior = mapAnterior.get(mesKey) || { faturado: 0, contas: 0 };
    const variacao = anterior.faturado > 0
      ? Math.round(((atual.faturado - anterior.faturado) / anterior.faturado) * 10000) / 100
      : (atual.faturado > 0 ? 100 : 0);

    tabelaComparativa.push({
      mes: mesKey,
      mesNome: MESES_NOMES[mesKey] || mesKey,
      faturadoAtual: atual.faturado,
      faturadoAnterior: anterior.faturado,
      qtdContasAtual: atual.contas,
      qtdContasAnterior: anterior.contas,
      variacao,
    });
  }

  return {
    convenio,
    anoAtual,
    anoAnterior,
    totalFaturadoAtual: totalAtual,
    totalFaturadoAnterior: totalAnterior,
    variacaoPercentual,
    qtdContasAtual,
    qtdContasAnterior,
    tabelaComparativa,
  };
}

// ============================================================
// DETALHAMENTO POR CONVÊNIO DENTRO DE UM MÊS
// ============================================================

export interface FiltroDetalheMesConvenio {
  estabelecimentoId: number;
  anoAtual: number;
  anoAnterior: number;
  mes: string; // "01", "02", etc.
}

export interface DetalheConvenioMes {
  convenio: string;
  faturadoAtual: number;
  faturadoAnterior: number;
  variacao: number;
  qtdContasAtual: number;
  qtdContasAnterior: number;
}

export interface DetalheMesConvenioResult {
  mes: string;
  mesNome: string;
  convenios: DetalheConvenioMes[];
}

export async function buscarDetalheMesConvenio(
  filtro: FiltroDetalheMesConvenio
): Promise<DetalheMesConvenioResult> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const { estabelecimentoId: estabId, anoAtual, anoAnterior, mes } = filtro;
  const mespadded = mes.padStart(2, "0");
  const mesprodAtual = `${anoAtual}/${mespadded}`;
  const mesprodAnterior = `${anoAnterior}/${mespadded}`;

  // Buscar por convênio no mês atual
  const [rowsAtual] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(TRIM(nomeconv), 'Não informado') as convenio,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND TRIM(mesprod) = '${mesprodAtual}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY COALESCE(TRIM(nomeconv), 'Não informado')
      ORDER BY total_faturado DESC
    `)
  );

  // Buscar por convênio no mês anterior
  const [rowsAnterior] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(TRIM(nomeconv), 'Não informado') as convenio,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND TRIM(mesprod) = '${mesprodAnterior}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY COALESCE(TRIM(nomeconv), 'Não informado')
      ORDER BY total_faturado DESC
    `)
  );

  // Montar mapa de convênios
  const mapAtual = new Map<string, { faturado: number; contas: number }>();
  for (const r of rowsAtual as unknown as any[]) {
    mapAtual.set(String(r.convenio || "").trim(), {
      faturado: parseValor(r.total_faturado),
      contas: Number(r.qtd_contas) || 0,
    });
  }

  const mapAnterior = new Map<string, { faturado: number; contas: number }>();
  for (const r of rowsAnterior as unknown as any[]) {
    mapAnterior.set(String(r.convenio || "").trim(), {
      faturado: parseValor(r.total_faturado),
      contas: Number(r.qtd_contas) || 0,
    });
  }

  // Incluir dados de faturamento externo no detalhe por convênio/mês
  try {
    const [extAtualRows] = await db.execute(
      sql.raw(`
        SELECT convenio, valor_faturado
        FROM faturamento_externo
        WHERE estabelecimento_id = ${estabId}
          AND mes_ano = '${mesprodAtual}'
      `)
    );
    for (const r of extAtualRows as unknown as any[]) {
      const conv = String(r.convenio || "").trim();
      const val = parseFloat(r.valor_faturado) || 0;
      const existing = mapAtual.get(conv);
      if (existing) {
        existing.faturado += val;
      } else {
        mapAtual.set(conv, { faturado: val, contas: 0 });
      }
    }
    const [extAnteriorRows] = await db.execute(
      sql.raw(`
        SELECT convenio, valor_faturado
        FROM faturamento_externo
        WHERE estabelecimento_id = ${estabId}
          AND mes_ano = '${mesprodAnterior}'
      `)
    );
    for (const r of extAnteriorRows as unknown as any[]) {
      const conv = String(r.convenio || "").trim();
      const val = parseFloat(r.valor_faturado) || 0;
      const existing = mapAnterior.get(conv);
      if (existing) {
        existing.faturado += val;
      } else {
        mapAnterior.set(conv, { faturado: val, contas: 0 });
      }
    }
  } catch { /* sem dados externos */ }

  // Unir todos os convênios
  const todosConvenios = new Set<string>();
  for (const k of mapAtual.keys()) todosConvenios.add(k);
  for (const k of mapAnterior.keys()) todosConvenios.add(k);

  const convenios: DetalheConvenioMes[] = [];
  for (const conv of todosConvenios) {
    const atual = mapAtual.get(conv) || { faturado: 0, contas: 0 };
    const anterior = mapAnterior.get(conv) || { faturado: 0, contas: 0 };
    const variacao = anterior.faturado > 0
      ? Math.round(((atual.faturado - anterior.faturado) / anterior.faturado) * 10000) / 100
      : (atual.faturado > 0 ? 100 : -100);

    convenios.push({
      convenio: conv,
      faturadoAtual: atual.faturado,
      faturadoAnterior: anterior.faturado,
      variacao,
      qtdContasAtual: atual.contas,
      qtdContasAnterior: anterior.contas,
    });
  }

  // Ordenar por faturado atual (maior primeiro)
  convenios.sort((a, b) => b.faturadoAtual - a.faturadoAtual);

  return {
    mes: mespadded,
    mesNome: MESES_NOMES[mespadded] || mespadded,
    convenios,
  };
}

// ============================================================
// TABELA COMPARATIVA POR SETOR
// ============================================================

export interface FiltroTabelaPorSetor {
  estabelecimentoId: number;
  anoAtual: number;
  anoAnterior: number;
  setor: string;
}

export interface TabelaSetorResult {
  setor: string;
  anoAtual: number;
  anoAnterior: number;
  totalFaturadoAtual: number;
  totalFaturadoAnterior: number;
  variacaoPercentual: number;
  qtdContasAtual: number;
  qtdContasAnterior: number;
  tabelaComparativa: TabelaComparativaMes[];
}

export async function buscarTabelaPorSetor(
  filtro: FiltroTabelaPorSetor
): Promise<TabelaSetorResult> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const { estabelecimentoId: estabId, anoAtual, anoAnterior, setor } = filtro;
  const prefixoAtual = `${anoAtual}/`;
  const prefixoAnterior = `${anoAnterior}/`;
  const setorEscaped = setor.replace(/'/g, "''");

  const [acumAtualRows] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAtual}%'
        AND COALESCE(TRIM(nomecc), 'Não informado') = '${setorEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
    `)
  );

  const [acumAnteriorRows] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAnterior}%'
        AND COALESCE(TRIM(nomecc), 'Não informado') = '${setorEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
    `)
  );

  const totalAtual = parseValor((acumAtualRows as any)[0]?.total_faturado);
  const totalAnterior = parseValor((acumAnteriorRows as any)[0]?.total_faturado);
  const qtdContasAtual = Number((acumAtualRows as any)[0]?.qtd_contas) || 0;
  const qtdContasAnterior = Number((acumAnteriorRows as any)[0]?.qtd_contas) || 0;
  const variacaoPercentual = totalAnterior > 0
    ? Math.round(((totalAtual - totalAnterior) / totalAnterior) * 10000) / 100
    : (totalAtual > 0 ? 100 : 0);

  const [mesAtualRows] = await db.execute(
    sql.raw(`
      SELECT 
        SUBSTRING(mesprod, 6, 2) as mes_num,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAtual}%'
        AND COALESCE(TRIM(nomecc), 'Não informado') = '${setorEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY SUBSTRING(mesprod, 6, 2)
      ORDER BY mes_num ASC
    `)
  );

  const [mesAnteriorRows] = await db.execute(
    sql.raw(`
      SELECT 
        SUBSTRING(mesprod, 6, 2) as mes_num,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAnterior}%'
        AND COALESCE(TRIM(nomecc), 'Não informado') = '${setorEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY SUBSTRING(mesprod, 6, 2)
      ORDER BY mes_num ASC
    `)
  );

  const mapAtual = new Map<string, { faturado: number; contas: number }>();
  for (const r of mesAtualRows as unknown as any[]) {
    const mesNum = String(r.mes_num || "").trim().padStart(2, "0");
    mapAtual.set(mesNum, { faturado: parseValor(r.total_faturado), contas: Number(r.qtd_contas) || 0 });
  }

  const mapAnterior = new Map<string, { faturado: number; contas: number }>();
  for (const r of mesAnteriorRows as unknown as any[]) {
    const mesNum = String(r.mes_num || "").trim().padStart(2, "0");
    mapAnterior.set(mesNum, { faturado: parseValor(r.total_faturado), contas: Number(r.qtd_contas) || 0 });
  }

  const tabelaComparativa: TabelaComparativaMes[] = [];
  for (let i = 1; i <= 12; i++) {
    const mesKey = String(i).padStart(2, "0");
    const atual = mapAtual.get(mesKey) || { faturado: 0, contas: 0 };
    const anterior = mapAnterior.get(mesKey) || { faturado: 0, contas: 0 };
    const variacao = anterior.faturado > 0
      ? Math.round(((atual.faturado - anterior.faturado) / anterior.faturado) * 10000) / 100
      : (atual.faturado > 0 ? 100 : 0);
    tabelaComparativa.push({
      mes: mesKey, mesNome: MESES_NOMES[mesKey] || mesKey,
      faturadoAtual: atual.faturado, faturadoAnterior: anterior.faturado,
      qtdContasAtual: atual.contas, qtdContasAnterior: anterior.contas, variacao,
    });
  }

  return { setor, anoAtual, anoAnterior, totalFaturadoAtual: totalAtual, totalFaturadoAnterior: totalAnterior, variacaoPercentual, qtdContasAtual, qtdContasAnterior, tabelaComparativa };
}

// ============================================================
// TABELA COMPARATIVA POR TIPO DE ATENDIMENTO
// ============================================================

export interface FiltroTabelaPorTipo {
  estabelecimentoId: number;
  anoAtual: number;
  anoAnterior: number;
  tipoAtendimento: string;
}

export interface TabelaTipoResult {
  tipoAtendimento: string;
  tipoDescricao: string;
  anoAtual: number;
  anoAnterior: number;
  totalFaturadoAtual: number;
  totalFaturadoAnterior: number;
  variacaoPercentual: number;
  qtdContasAtual: number;
  qtdContasAnterior: number;
  tabelaComparativa: TabelaComparativaMes[];
}

export async function buscarTabelaPorTipoAtendimento(
  filtro: FiltroTabelaPorTipo
): Promise<TabelaTipoResult> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const { estabelecimentoId: estabId, anoAtual, anoAnterior, tipoAtendimento } = filtro;
  const prefixoAtual = `${anoAtual}/`;
  const prefixoAnterior = `${anoAnterior}/`;
  const tipoEscaped = tipoAtendimento.replace(/'/g, "''");

  const tipoDescricao = TIPO_ATENDIMENTO_DESC[tipoAtendimento] || tipoAtendimento;

  const [acumAtualRows] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAtual}%'
        AND COALESCE(TRIM(tipoatend), 'N/I') = '${tipoEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
    `)
  );

  const [acumAnteriorRows] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAnterior}%'
        AND COALESCE(TRIM(tipoatend), 'N/I') = '${tipoEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
    `)
  );

  const totalAtual = parseValor((acumAtualRows as any)[0]?.total_faturado);
  const totalAnterior = parseValor((acumAnteriorRows as any)[0]?.total_faturado);
  const qtdContasAtual = Number((acumAtualRows as any)[0]?.qtd_contas) || 0;
  const qtdContasAnterior = Number((acumAnteriorRows as any)[0]?.qtd_contas) || 0;
  const variacaoPercentual = totalAnterior > 0
    ? Math.round(((totalAtual - totalAnterior) / totalAnterior) * 10000) / 100
    : (totalAtual > 0 ? 100 : 0);

  const [mesAtualRows] = await db.execute(
    sql.raw(`
      SELECT 
        SUBSTRING(mesprod, 6, 2) as mes_num,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAtual}%'
        AND COALESCE(TRIM(tipoatend), 'N/I') = '${tipoEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY SUBSTRING(mesprod, 6, 2)
      ORDER BY mes_num ASC
    `)
  );

  const [mesAnteriorRows] = await db.execute(
    sql.raw(`
      SELECT 
        SUBSTRING(mesprod, 6, 2) as mes_num,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAnterior}%'
        AND COALESCE(TRIM(tipoatend), 'N/I') = '${tipoEscaped}'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY SUBSTRING(mesprod, 6, 2)
      ORDER BY mes_num ASC
    `)
  );

  const mapAtual = new Map<string, { faturado: number; contas: number }>();
  for (const r of mesAtualRows as unknown as any[]) {
    const mesNum = String(r.mes_num || "").trim().padStart(2, "0");
    mapAtual.set(mesNum, { faturado: parseValor(r.total_faturado), contas: Number(r.qtd_contas) || 0 });
  }

  const mapAnterior = new Map<string, { faturado: number; contas: number }>();
  for (const r of mesAnteriorRows as unknown as any[]) {
    const mesNum = String(r.mes_num || "").trim().padStart(2, "0");
    mapAnterior.set(mesNum, { faturado: parseValor(r.total_faturado), contas: Number(r.qtd_contas) || 0 });
  }

  const tabelaComparativa: TabelaComparativaMes[] = [];
  for (let i = 1; i <= 12; i++) {
    const mesKey = String(i).padStart(2, "0");
    const atual = mapAtual.get(mesKey) || { faturado: 0, contas: 0 };
    const anterior = mapAnterior.get(mesKey) || { faturado: 0, contas: 0 };
    const variacao = anterior.faturado > 0
      ? Math.round(((atual.faturado - anterior.faturado) / anterior.faturado) * 10000) / 100
      : (atual.faturado > 0 ? 100 : 0);
    tabelaComparativa.push({
      mes: mesKey, mesNome: MESES_NOMES[mesKey] || mesKey,
      faturadoAtual: atual.faturado, faturadoAnterior: anterior.faturado,
      qtdContasAtual: atual.contas, qtdContasAnterior: anterior.contas, variacao,
    });
  }

  return { tipoAtendimento, tipoDescricao, anoAtual, anoAnterior, totalFaturadoAtual: totalAtual, totalFaturadoAnterior: totalAnterior, variacaoPercentual, qtdContasAtual, qtdContasAnterior, tabelaComparativa };
}

// ============================================================
// RELATÓRIO GERAL
// ============================================================

export async function buscarRelatorioFaturamento(
  filtro: FiltroRelatorioFaturamento
): Promise<RelatorioFaturamentoResult> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const anoAtual = filtro.anoAtual || new Date().getFullYear();
  const anoAnterior = filtro.anoAnterior || anoAtual - 1;
  const estabId = filtro.estabelecimentoId;

  // Prefixo do mesprod para cada ano (ex: "2025/", "2024/")
  const prefixoAtual = `${anoAtual}/`;
  const prefixoAnterior = `${anoAnterior}/`;

  // ===== 1. ACUMULADO ANO ATUAL =====
  const [acumAtualRows] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAtual}%'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
    `)
  );

  // ===== 2. ACUMULADO ANO ANTERIOR =====
  const [acumAnteriorRows] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAnterior}%'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
    `)
  );

  const totalAtual = parseValor((acumAtualRows as any)[0]?.total_faturado);
  const totalAnterior = parseValor((acumAnteriorRows as any)[0]?.total_faturado);
  const qtdContasAtual = Number((acumAtualRows as any)[0]?.qtd_contas) || 0;
  const qtdContasAnterior = Number((acumAnteriorRows as any)[0]?.qtd_contas) || 0;
  const variacaoPercentual = totalAnterior > 0
    ? Math.round(((totalAtual - totalAnterior) / totalAnterior) * 10000) / 100
    : 0;

  // ===== 3. POR SETOR (ano atual) =====
  const [setorRows] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(TRIM(nomecc), 'Não informado') as setor,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAtual}%'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY COALESCE(TRIM(nomecc), 'Não informado')
      ORDER BY total_faturado DESC
      LIMIT 20
    `)
  );

  const porSetor: FaturamentoPorSetor[] = (setorRows as unknown as any[]).map((r: any) => {
    const val = parseValor(r.total_faturado);
    return {
      setor: r.setor || "Não informado",
      totalFaturado: val,
      qtdContas: Number(r.qtd_contas) || 0,
      percentual: totalAtual > 0 ? Math.round((val / totalAtual) * 10000) / 100 : 0,
    };
  });

  // ===== 4. POR MÊS (ambos os anos para gráfico) =====
  const [mesRows] = await db.execute(
    sql.raw(`
      SELECT 
        mesprod as mes,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND (mesprod LIKE '${prefixoAtual}%' OR mesprod LIKE '${prefixoAnterior}%')
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY mesprod
      ORDER BY mesprod ASC
    `)
  );

  const porMes: FaturamentoPorMes[] = (mesRows as unknown as any[]).map((r: any) => {
    const mesStr = String(r.mes || "").trim();
    // mesprod format: "2025/01" or "2025/01 "
    const parts = mesStr.split("/");
    const ano = parts[0] || "";
    const mesNum = (parts[1] || "").trim().padStart(2, "0");
    const abrev = MESES_ABREV[mesNum] || mesNum;
    return {
      mes: mesStr,
      mesFormatado: `${abrev}/${ano}`,
      totalFaturado: parseValor(r.total_faturado),
      qtdContas: Number(r.qtd_contas) || 0,
    };
  });

  // ===== 5. POR TIPO DE ATENDIMENTO (ano atual) =====
  const [tipoRows] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(TRIM(tipoatend), 'N/I') as tipo,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAtual}%'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY COALESCE(TRIM(tipoatend), 'N/I')
      ORDER BY total_faturado DESC
    `)
  );

  const porTipoAtendimento: FaturamentoPorTipoAtendimento[] = (tipoRows as unknown as any[]).map((r: any) => {
    const val = parseValor(r.total_faturado);
    const tipo = String(r.tipo || "N/I").trim();
    return {
      tipo,
      tipoDescricao: TIPO_ATENDIMENTO_DESC[tipo] || tipo,
      totalFaturado: val,
      qtdContas: Number(r.qtd_contas) || 0,
      percentual: totalAtual > 0 ? Math.round((val / totalAtual) * 10000) / 100 : 0,
    };
  });

  // ===== 6. POR CONVÊNIO (ano atual, top 15) =====
  const [convRows] = await db.execute(
    sql.raw(`
      SELECT 
        COALESCE(TRIM(nomeconv), 'Não informado') as convenio,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAtual}%'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY COALESCE(TRIM(nomeconv), 'Não informado')
      ORDER BY total_faturado DESC
      LIMIT 15
    `)
  );

  const porConvenio: FaturamentoPorConvenio[] = (convRows as unknown as any[]).map((r: any) => {
    const val = parseValor(r.total_faturado);
    return {
      convenio: r.convenio || "Não informado",
      totalFaturado: val,
      qtdContas: Number(r.qtd_contas) || 0,
      percentual: totalAtual > 0 ? Math.round((val / totalAtual) * 10000) / 100 : 0,
    };
  });

  // ===== 6.5 INCLUIR CONVÊNIOS EXTERNOS (faturamento_externo) =====
  let externoConveniosAtual: { convenio: string; totalFaturado: number; totalRecebido: number }[] = [];
  try {
    externoConveniosAtual = await buscarTotaisPorConvenioExterno(estabId, anoAtual);
  } catch { /* sem dados externos */ }

  for (const ext of externoConveniosAtual) {
    const existing = porConvenio.find(c => c.convenio === ext.convenio);
    if (existing) {
      existing.totalFaturado += ext.totalFaturado;
    } else {
      porConvenio.push({
        convenio: ext.convenio,
        totalFaturado: ext.totalFaturado,
        qtdContas: 0,
        percentual: 0,
      });
    }
  }

  // ===== 7. TABELA COMPARATIVA MÊS A MÊS =====
  // Ano atual
  const [mesAtualRows] = await db.execute(
    sql.raw(`
      SELECT 
        SUBSTRING(mesprod, 6, 2) as mes_num,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAtual}%'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY SUBSTRING(mesprod, 6, 2)
      ORDER BY mes_num ASC
    `)
  );

  // Ano anterior
  const [mesAnteriorRows] = await db.execute(
    sql.raw(`
      SELECT 
        SUBSTRING(mesprod, 6, 2) as mes_num,
        COALESCE(SUM(CAST(REPLACE(REPLACE(vl_faturado, ',', '.'), ' ', '') AS DECIMAL(14,2))), 0) as total_faturado,
        COUNT(DISTINCT numconta) as qtd_contas
      FROM integ_faturado
      WHERE estabelecimento_id = ${estabId}
        AND mesprod LIKE '${prefixoAnterior}%'
        AND vl_faturado IS NOT NULL
        AND vl_faturado != ''
      GROUP BY SUBSTRING(mesprod, 6, 2)
      ORDER BY mes_num ASC
    `)
  );

  // Montar mapa por mês
  const mapAtual = new Map<string, { faturado: number; contas: number }>();
  for (const r of mesAtualRows as unknown as any[]) {
    const mesNum = String(r.mes_num || "").trim().padStart(2, "0");
    mapAtual.set(mesNum, {
      faturado: parseValor(r.total_faturado),
      contas: Number(r.qtd_contas) || 0,
    });
  }

  const mapAnterior = new Map<string, { faturado: number; contas: number }>();
  for (const r of mesAnteriorRows as unknown as any[]) {
    const mesNum = String(r.mes_num || "").trim().padStart(2, "0");
    mapAnterior.set(mesNum, {
      faturado: parseValor(r.total_faturado),
      contas: Number(r.qtd_contas) || 0,
    });
  }

  // ===== 7.5 INCLUIR DADOS EXTERNOS NA TABELA COMPARATIVA =====
  let externoMesesAtual: { mesAno: string; mesNum: string; totalFaturado: number; totalRecebido: number; convenios: number }[] = [];
  let externoMesesAnterior: { mesAno: string; mesNum: string; totalFaturado: number; totalRecebido: number; convenios: number }[] = [];
  try {
    externoMesesAtual = await buscarTotaisFaturamentoExterno(estabId, anoAtual);
    externoMesesAnterior = await buscarTotaisFaturamentoExterno(estabId, anoAnterior);
  } catch { /* sem dados externos */ }

  for (const ext of externoMesesAtual) {
    const mesNum = ext.mesNum;
    const existing = mapAtual.get(mesNum);
    if (existing) {
      existing.faturado += ext.totalFaturado;
    } else {
      mapAtual.set(mesNum, { faturado: ext.totalFaturado, contas: 0 });
    }
  }

  for (const ext of externoMesesAnterior) {
    const mesNum = ext.mesNum;
    const existing = mapAnterior.get(mesNum);
    if (existing) {
      existing.faturado += ext.totalFaturado;
    } else {
      mapAnterior.set(mesNum, { faturado: ext.totalFaturado, contas: 0 });
    }
  }

  // Gerar tabela para todos os 12 meses
  const tabelaComparativa: TabelaComparativaMes[] = [];
  for (let i = 1; i <= 12; i++) {
    const mesKey = String(i).padStart(2, "0");
    const atual = mapAtual.get(mesKey) || { faturado: 0, contas: 0 };
    const anterior = mapAnterior.get(mesKey) || { faturado: 0, contas: 0 };
    const variacao = anterior.faturado > 0
      ? Math.round(((atual.faturado - anterior.faturado) / anterior.faturado) * 10000) / 100
      : 0;

    tabelaComparativa.push({
      mes: mesKey,
      mesNome: MESES_NOMES[mesKey] || mesKey,
      faturadoAtual: atual.faturado,
      faturadoAnterior: anterior.faturado,
      qtdContasAtual: atual.contas,
      qtdContasAnterior: anterior.contas,
      variacao,
    });
  }

  // Recalcular totais incluindo dados externos
  const totalExternoAtual = externoMesesAtual.reduce((acc, e) => acc + e.totalFaturado, 0);
  const totalExternoAnterior = externoMesesAnterior.reduce((acc, e) => acc + e.totalFaturado, 0);
  const totalFinalAtual = totalAtual + totalExternoAtual;
  const totalFinalAnterior = totalAnterior + totalExternoAnterior;
  const variacaoFinal = totalFinalAnterior > 0
    ? Math.round(((totalFinalAtual - totalFinalAnterior) / totalFinalAnterior) * 10000) / 100
    : (totalFinalAtual > 0 ? 100 : 0);

  // Recalcular percentuais de convênio com total atualizado
  for (const c of porConvenio) {
    c.percentual = totalFinalAtual > 0 ? Math.round((c.totalFaturado / totalFinalAtual) * 10000) / 100 : 0;
  }
  // Re-sort por faturado
  porConvenio.sort((a, b) => b.totalFaturado - a.totalFaturado);

  // Recalcular percentuais de setor com total atualizado
  for (const s of porSetor) {
    s.percentual = totalFinalAtual > 0 ? Math.round((s.totalFaturado / totalFinalAtual) * 10000) / 100 : 0;
  }

  return {
    acumulado: {
      anoAtual,
      anoAnterior,
      totalFaturadoAtual: totalFinalAtual,
      totalFaturadoAnterior: totalFinalAnterior,
      variacaoPercentual: variacaoFinal,
      qtdContasAtual,
      qtdContasAnterior,
    },
    porSetor,
    porMes,
    porTipoAtendimento,
    porConvenio,
    tabelaComparativa,
  };
}
