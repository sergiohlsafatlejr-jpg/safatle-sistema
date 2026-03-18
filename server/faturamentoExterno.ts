/**
 * Serviço de Faturamento Externo
 * Gerencia importação de planilhas Excel com dados de faturamento/recebimento
 * de estabelecimentos que não possuem integração direta com banco de dados.
 * Os dados importados são integrados ao Relatório de Faturamento.
 */
import { getDb } from "./db";
import { sql } from "drizzle-orm";

// ============================================================
// INTERFACES
// ============================================================

export interface FaturamentoExternoRow {
  id: number;
  estabelecimentoId: number;
  convenio: string;
  mesAno: string; // "YYYY/MM"
  valorFaturado: number;
  valorRecebido: number;
  arquivoOrigem: string | null;
  importadoPorNome: string | null;
  criadoEm: Date | null;
}

export interface ImportacaoExcelRow {
  convenio: string;
  mesAno: string; // "YYYY/MM"
  valorFaturado: number;
  valorRecebido: number;
}

export interface ImportacaoResult {
  totalLinhas: number;
  inseridos: number;
  atualizados: number;
  erros: string[];
}

// ============================================================
// LISTAR DADOS IMPORTADOS
// ============================================================

export async function listarFaturamentoExterno(
  estabelecimentoId: number,
  ano?: number
): Promise<FaturamentoExternoRow[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const anoFiltro = ano || new Date().getFullYear();
  const prefixo = `${anoFiltro}/`;

  const [rows] = await db.execute(
    sql.raw(`
      SELECT id, estabelecimento_id, convenio, mes_ano, 
             valor_faturado, valor_recebido, arquivo_origem,
             importado_por_nome, criado_em
      FROM faturamento_externo
      WHERE estabelecimento_id = ${estabelecimentoId}
        AND mes_ano LIKE '${prefixo}%'
      ORDER BY mes_ano ASC, convenio ASC
    `)
  );

  return (rows as unknown as any[]).map((r: any) => ({
    id: r.id,
    estabelecimentoId: r.estabelecimento_id,
    convenio: r.convenio,
    mesAno: r.mes_ano,
    valorFaturado: parseFloat(r.valor_faturado) || 0,
    valorRecebido: parseFloat(r.valor_recebido) || 0,
    arquivoOrigem: r.arquivo_origem,
    importadoPorNome: r.importado_por_nome,
    criadoEm: r.criado_em,
  }));
}

// ============================================================
// LISTAR CONVÊNIOS EXTERNOS
// ============================================================

export async function listarConveniosExternos(
  estabelecimentoId: number
): Promise<string[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const [rows] = await db.execute(
    sql.raw(`
      SELECT DISTINCT convenio
      FROM faturamento_externo
      WHERE estabelecimento_id = ${estabelecimentoId}
      ORDER BY convenio ASC
    `)
  );

  return (rows as unknown as any[]).map((r: any) => String(r.convenio));
}

// ============================================================
// IMPORTAR DADOS DO EXCEL
// ============================================================

export async function importarFaturamentoExterno(
  estabelecimentoId: number,
  dados: ImportacaoExcelRow[],
  arquivoOrigem: string,
  userId: number,
  userName: string
): Promise<ImportacaoResult> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const result: ImportacaoResult = {
    totalLinhas: dados.length,
    inseridos: 0,
    atualizados: 0,
    erros: [],
  };

  for (const row of dados) {
    try {
      const convenioEscaped = row.convenio.replace(/'/g, "''").trim();
      const mesAno = row.mesAno.trim();
      const valorFaturado = isNaN(row.valorFaturado) ? 0 : row.valorFaturado;
      const valorRecebido = isNaN(row.valorRecebido) ? 0 : row.valorRecebido;
      const arquivoEscaped = (arquivoOrigem || "").replace(/'/g, "''");
      const userNameEscaped = (userName || "").replace(/'/g, "''");

      // Verificar se já existe registro para esse convênio/mês
      const [existing] = await db.execute(
        sql.raw(`
          SELECT id FROM faturamento_externo
          WHERE estabelecimento_id = ${estabelecimentoId}
            AND convenio = '${convenioEscaped}'
            AND mes_ano = '${mesAno}'
          LIMIT 1
        `)
      );

      const existingRows = existing as unknown as any[];
      if (existingRows.length > 0) {
        // Atualizar registro existente
        await db.execute(
          sql.raw(`
            UPDATE faturamento_externo
            SET valor_faturado = ${valorFaturado},
                valor_recebido = ${valorRecebido},
                arquivo_origem = '${arquivoEscaped}',
                importado_por = ${userId},
                importado_por_nome = '${userNameEscaped}',
                atualizado_em = NOW()
            WHERE id = ${existingRows[0].id}
          `)
        );
        result.atualizados++;
      } else {
        // Inserir novo registro
        await db.execute(
          sql.raw(`
            INSERT INTO faturamento_externo 
              (estabelecimento_id, convenio, mes_ano, valor_faturado, valor_recebido, 
               arquivo_origem, importado_por, importado_por_nome)
            VALUES 
              (${estabelecimentoId}, '${convenioEscaped}', '${mesAno}', 
               ${valorFaturado}, ${valorRecebido}, 
               '${arquivoEscaped}', ${userId}, '${userNameEscaped}')
          `)
        );
        result.inseridos++;
      }
    } catch (err: any) {
      result.erros.push(`Linha ${row.convenio}/${row.mesAno}: ${err.message?.substring(0, 200)}`);
    }
  }

  return result;
}

// ============================================================
// EXCLUIR DADOS IMPORTADOS
// ============================================================

export async function excluirFaturamentoExterno(
  id: number,
  estabelecimentoId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  await db.execute(
    sql.raw(`
      DELETE FROM faturamento_externo
      WHERE id = ${id} AND estabelecimento_id = ${estabelecimentoId}
    `)
  );
  return true;
}

// ============================================================
// BUSCAR TOTAIS POR MÊS (para integração com Relatório de Faturamento)
// ============================================================

export async function buscarTotaisFaturamentoExterno(
  estabelecimentoId: number,
  ano: number
): Promise<{ mesAno: string; mesNum: string; totalFaturado: number; totalRecebido: number; convenios: number }[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const prefixo = `${ano}/`;

  const [rows] = await db.execute(
    sql.raw(`
      SELECT 
        mes_ano,
        SUBSTRING(mes_ano, 6, 2) as mes_num,
        SUM(valor_faturado) as total_faturado,
        SUM(valor_recebido) as total_recebido,
        COUNT(DISTINCT convenio) as convenios
      FROM faturamento_externo
      WHERE estabelecimento_id = ${estabelecimentoId}
        AND mes_ano LIKE '${prefixo}%'
      GROUP BY mes_ano
      ORDER BY mes_ano ASC
    `)
  );

  return (rows as unknown as any[]).map((r: any) => ({
    mesAno: r.mes_ano,
    mesNum: String(r.mes_num || "").trim().padStart(2, "0"),
    totalFaturado: parseFloat(r.total_faturado) || 0,
    totalRecebido: parseFloat(r.total_recebido) || 0,
    convenios: Number(r.convenios) || 0,
  }));
}

// ============================================================
// BUSCAR TOTAIS POR CONVÊNIO (para integração com Relatório de Faturamento)
// ============================================================

export async function buscarTotaisPorConvenioExterno(
  estabelecimentoId: number,
  ano: number
): Promise<{ convenio: string; totalFaturado: number; totalRecebido: number }[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const prefixo = `${ano}/`;

  const [rows] = await db.execute(
    sql.raw(`
      SELECT 
        convenio,
        SUM(valor_faturado) as total_faturado,
        SUM(valor_recebido) as total_recebido
      FROM faturamento_externo
      WHERE estabelecimento_id = ${estabelecimentoId}
        AND mes_ano LIKE '${prefixo}%'
      GROUP BY convenio
      ORDER BY total_faturado DESC
    `)
  );

  return (rows as unknown as any[]).map((r: any) => ({
    convenio: r.convenio,
    totalFaturado: parseFloat(r.total_faturado) || 0,
    totalRecebido: parseFloat(r.total_recebido) || 0,
  }));
}
