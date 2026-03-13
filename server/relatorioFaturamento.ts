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

  return {
    acumulado: {
      anoAtual,
      anoAnterior,
      totalFaturadoAtual: totalAtual,
      totalFaturadoAnterior: totalAnterior,
      variacaoPercentual,
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
