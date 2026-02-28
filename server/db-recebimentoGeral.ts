import { getDb } from "./db";
import { recebimentoGeral } from "../drizzle/schema";
import { eq, sql, and } from "drizzle-orm";

/**
 * Mapeamento de campos: integ_faturado_x_recebido -> recebimento_geral
 */
const FIELD_MAPPING = {
  _sincronizado_em: "sincronizado",
  _atualizado_em: "atualizado",
  estabelecimento_id: "estabelecimentoId",
  nomeconv: "convenio",
  codconv: "codigoConvenio",
  mesprod: "mesProducao",
  numfatura: "fatura",
  codrecur: "codigoRecurso",
  tipoproc: "tipoProcedimento",
  protocolo: "protocolo",
  numconta: "numeroConta",
  guiacobra: "guiaCobranca",
  aihguia: "guiaOperadora",
  descricao: "descricaoItem",
  matricula: "carteirinha",
  data: "dataConta",
  dataint: "dataInternacao",
  datasai: "dataSaida",
  codproprio: "codigoSistema",
  procdisco: "tipoDescricao",
  codgrufi: "tipoDescricao", // fallback se procdisco estiver vazio
  funcaotiss: "funcaoTiss",
  receber: "receberHospital",
  codcc: "codigoSetor",
  nomecc: "nomeSetor",
  prestexe: "prestadorExecutante",
  nomeprest: "nomePrestador",
  quantidade: "quantidadeItem",
  vl_unitario: "vlUnitario",
  vl_faturado: "vlFaturado",
  vl_recebido: "vlRecebido",
  vl_receb_a_maior: "vlRecebAMaior",
  vl_total_recebido: "vlTotalRecebido",
  vl_aberto: "vlAberto",
  vl_glosas: "vlGlosas",
  gl_recurso: "vlRecurso",
  gl_aceita: "glAceita",
  gl_analise: "glAnalise",
  gl_recuperada: "glRecuperado",
  codtiss: "codigoTiss",
  descmotivo: "descricaoMotivo",
  complrecur: "complementoRecurso",
  tipoatend: "tipoAtendimento",
} as const;

/**
 * Converte um valor string para decimal, retornando null se inválido
 */
function toDecimal(value: any): string | null {
  if (value === null || value === undefined || value === "" || value === "null") return null;
  const num = parseFloat(String(value).replace(",", "."));
  return isNaN(num) ? null : num.toFixed(2);
}

/**
 * Converte um valor string para decimal com 4 casas (para quantidade)
 */
function toDecimal4(value: any): string | null {
  if (value === null || value === undefined || value === "" || value === "null") return null;
  const num = parseFloat(String(value).replace(",", "."));
  return isNaN(num) ? null : num.toFixed(4);
}

/**
 * Formata data para string no formato DD/MM/YYYY
 */
function formatDate(value: any): string | null {
  if (!value || value === "null") return null;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(value);
  }
}

/**
 * Transforma um registro da integ_faturado_x_recebido para o formato da recebimento_geral
 */
function transformRecord(row: any): any {
  return {
    sincronizado: row._sincronizado_em ? new Date(row._sincronizado_em) : null,
    atualizado: row._atualizado_em ? new Date(row._atualizado_em) : null,
    estabelecimentoId: row.estabelecimento_id || 0,
    convenioId: null, // Será preenchido por lookup futuro se necessário
    convenio: row.nomeconv?.trim() || null,
    mesProducao: row.mesprod?.trim() || null,
    fatura: row.numfatura?.trim() || null,
    codigoRecurso: row.codrecur?.trim() || null,
    tipoProcedimento: row.tipoproc?.trim() || null,
    protocolo: row.protocolo?.trim() || null,
    numeroConta: row.numconta?.trim() || null,
    guiaCobranca: row.guiacobra?.trim() || null,
    guiaOperadora: row.aihguia?.trim() || null,
    descricaoItem: row.descricao?.trim() || null,
    carteirinha: row.matricula?.trim() || null,
    dataConta: formatDate(row.data),
    dataInternacao: formatDate(row.dataint),
    dataSaida: row.datasai?.trim() || null,
    codigoConvenio: row.codconv?.trim() || null,
    codigoSistema: row.codproprio?.trim() || null,
    tipoDescricao: row.procdisco?.trim() || row.codgrufi?.trim() || null,
    funcaoTiss: row.funcaotiss?.trim() || null,
    receberHospital: row.receber?.trim()?.toUpperCase() === "S" ? "S" : "N",
    codigoSetor: row.codcc?.trim() || null,
    nomeSetor: row.nomecc?.trim() || null,
    prestadorExecutante: row.prestexe?.trim() || null,
    nomePrestador: row.nomeprest?.trim() || null,
    quantidadeItem: toDecimal4(row.quantidade),
    vlUnitario: toDecimal(row.vl_unitario),
    vlFaturado: toDecimal(row.vl_faturado),
    vlRecebido: toDecimal(row.vl_recebido),
    vlRecebAMaior: toDecimal(row.vl_receb_a_maior),
    vlTotalRecebido: toDecimal(row.vl_total_recebido),
    vlAberto: toDecimal(row.vl_aberto),
    vlGlosas: toDecimal(row.vl_glosas),
    vlRecurso: toDecimal(row.gl_recurso),
    glAceita: toDecimal(row.gl_aceita),
    glAnalise: toDecimal(row.gl_analise),
    glRecuperado: toDecimal(row.gl_recuperada),
    codigoTiss: row.codtiss?.trim() || null,
    descricaoMotivo: row.descmotivo?.trim() || null,
    complementoRecurso: row.complrecur?.trim() || null,
    tipoAtendimento: row.tipoatend?.trim() || null,
  };
}

/**
 * Importa dados da tabela integ_faturado_x_recebido para recebimento_geral
 * @param estabelecimentoId - ID do estabelecimento para filtrar (opcional, importa todos se não informado)
 * @param limparAntes - Se true, limpa os dados existentes antes de importar
 * @param onProgress - Callback de progresso (registros processados, total)
 * @returns Resultado da importação
 */
export async function importarIntegFaturadoRecebido(
  estabelecimentoId?: number,
  limparAntes: boolean = false,
  onProgress?: (processados: number, total: number) => void
): Promise<{
  success: boolean;
  totalOrigem: number;
  totalImportados: number;
  totalErros: number;
  erros: string[];
  tempoMs: number;
}> {
  const inicio = Date.now();
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      totalOrigem: 0,
      totalImportados: 0,
      totalErros: 0,
      erros: ["Conexão com banco de dados não disponível"],
      tempoMs: Date.now() - inicio,
    };
  }

  const erros: string[] = [];
  let totalImportados = 0;

  try {
    // 1. Contar registros na origem
    const whereClause = estabelecimentoId
      ? `WHERE estabelecimento_id = ${estabelecimentoId}`
      : "";
    
    const [countResult] = await db.execute(
      sql.raw(`SELECT COUNT(*) as total FROM integ_faturado_x_recebido ${whereClause}`)
    );
    const totalOrigem = (countResult as any)[0]?.total || 0;

    if (totalOrigem === 0) {
      return {
        success: true,
        totalOrigem: 0,
        totalImportados: 0,
        totalErros: 0,
        erros: [],
        tempoMs: Date.now() - inicio,
      };
    }

    // 2. Limpar dados existentes se solicitado
    if (limparAntes) {
      if (estabelecimentoId) {
        await db.delete(recebimentoGeral).where(
          eq(recebimentoGeral.estabelecimentoId, estabelecimentoId)
        );
      } else {
        await db.delete(recebimentoGeral);
      }
      console.log(`[ImportRecebGeral] Dados existentes limpos${estabelecimentoId ? ` para estabelecimento ${estabelecimentoId}` : ""}`);
    }

    // 3. Carregar mapeamentos de convênios para resolver convenioId
    const [mapeamentoRows] = await db.execute(
      sql.raw(
        `SELECT nome_origem, convenio_id FROM convenio_mapeamento WHERE ativo = 'sim'${estabelecimentoId ? ` AND estabelecimento_id = ${estabelecimentoId}` : ''}`
      )
    );
    const mapeamentoConvenios = new Map<string, number>();
    for (const m of (mapeamentoRows as unknown as any[])) {
      mapeamentoConvenios.set((m.nome_origem || '').toLowerCase().trim(), m.convenio_id);
    }
    console.log(`[ImportRecebGeral] ${mapeamentoConvenios.size} mapeamentos de convênios carregados`);

    // 4. Importar em lotes de 500 registros
    const BATCH_SIZE = 500;
    let offset = 0;

    while (offset < totalOrigem) {
      const [rows] = await db.execute(
        sql.raw(
          `SELECT * FROM integ_faturado_x_recebido ${whereClause} ORDER BY _id ASC LIMIT ${BATCH_SIZE} OFFSET ${offset}`
        )
      );

      const registros = rows as unknown as any[];
      if (registros.length === 0) break;

      // Transformar e inserir em lote
      const batch = [];
      for (const row of registros) {
        try {
          const transformed = transformRecord(row);
          // Resolver convenioId pelo mapeamento
          const nomeConv = (row.nomeconv || '').toLowerCase().trim();
          if (nomeConv && mapeamentoConvenios.has(nomeConv)) {
            transformed.convenioId = mapeamentoConvenios.get(nomeConv)!;
          }
          batch.push(transformed);
        } catch (err) {
          erros.push(`Erro ao transformar registro _id=${row._id}: ${err}`);
        }
      }

      if (batch.length > 0) {
        try {
          // Inserir em sub-lotes de 100 para evitar query muito grande
          const SUB_BATCH = 100;
          for (let i = 0; i < batch.length; i += SUB_BATCH) {
            const subBatch = batch.slice(i, i + SUB_BATCH);
            await db.insert(recebimentoGeral).values(subBatch);
            totalImportados += subBatch.length;
          }
        } catch (insertErr) {
          erros.push(`Erro ao inserir lote offset=${offset}: ${insertErr}`);
          // Tentar inserir um a um para não perder tudo
          for (const record of batch) {
            try {
              await db.insert(recebimentoGeral).values(record);
              totalImportados++;
            } catch (singleErr) {
              erros.push(`Erro ao inserir registro individual: ${singleErr}`);
            }
          }
        }
      }

      offset += BATCH_SIZE;

      // Callback de progresso
      if (onProgress) {
        onProgress(Math.min(offset, totalOrigem), totalOrigem);
      }
    }

    console.log(
      `[ImportRecebGeral] Importação concluída: ${totalImportados}/${totalOrigem} registros em ${Date.now() - inicio}ms`
    );

    return {
      success: true,
      totalOrigem,
      totalImportados,
      totalErros: erros.length,
      erros: erros.slice(0, 50), // Limitar a 50 erros no retorno
      tempoMs: Date.now() - inicio,
    };
  } catch (error) {
    console.error("[ImportRecebGeral] Erro geral:", error);
    return {
      success: false,
      totalOrigem: 0,
      totalImportados,
      totalErros: erros.length + 1,
      erros: [...erros, `Erro geral: ${error}`],
      tempoMs: Date.now() - inicio,
    };
  }
}

/**
 * Conta registros na recebimento_geral por estabelecimento
 */
export async function contarRecebimentoGeral(estabelecimentoId?: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const whereClause = estabelecimentoId
    ? `WHERE estabelecimentoId = ${estabelecimentoId}`
    : "";
  
  const [result] = await db.execute(
    sql.raw(`SELECT COUNT(*) as total FROM recebimento_geral ${whereClause}`)
  );
  return (result as any)[0]?.total || 0;
}

/**
 * Lista registros da recebimento_geral com paginação e filtros
 */
export async function listarRecebimentoGeral(params: {
  estabelecimentoId: number;
  convenio?: string;
  mesProducao?: string;
  protocolo?: string;
  numeroConta?: string;
  receberHospital?: string; // 'S' = Hospital, 'N' = Terceiros, undefined = Todos
  page?: number;
  pageSize?: number;
}): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  if (!db) return { data: [], total: 0, page: 1, pageSize: 50 };

  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [`estabelecimentoId = ${params.estabelecimentoId}`];
  
  if (params.convenio) {
    conditions.push(`convenio LIKE '%${params.convenio.replace(/'/g, "''")}%'`);
  }
  if (params.mesProducao) {
    conditions.push(`mes_producao = '${params.mesProducao.replace(/'/g, "''")}'`);
  }
  if (params.protocolo) {
    conditions.push(`protocolo = '${params.protocolo.replace(/'/g, "''")}'`);
  }
  if (params.numeroConta) {
    conditions.push(`numero_conta = '${params.numeroConta.replace(/'/g, "''")}'`);
  }
  if (params.receberHospital === 'S' || params.receberHospital === 'N') {
    conditions.push(`receber_hospital = '${params.receberHospital}'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countResult] = await db.execute(
    sql.raw(`SELECT COUNT(*) as total FROM recebimento_geral ${whereClause}`)
  );
  const total = (countResult as any)[0]?.total || 0;

  const [rows] = await db.execute(
    sql.raw(
      `SELECT * FROM recebimento_geral ${whereClause} ORDER BY id DESC LIMIT ${pageSize} OFFSET ${offset}`
    )
  );

  return {
    data: rows as unknown as any[],
    total,
    page,
    pageSize,
  };
}

/**
 * Resumo/estatísticas da recebimento_geral por estabelecimento
 */
export async function resumoRecebimentoGeral(estabelecimentoId: number, receberHospital?: string): Promise<{
  totalRegistros: number;
  totalFaturado: number;
  totalRecebido: number;
  totalGlosas: number;
  totalAberto: number;
  totalRecurso: number;
  totalRecuperado: number;
  convenios: { convenio: string; total: number; faturado: number; recebido: number; glosas: number }[];
  meses: { mes: string; total: number; faturado: number; recebido: number; glosas: number }[];
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalRegistros: 0,
      totalFaturado: 0,
      totalRecebido: 0,
      totalGlosas: 0,
      totalAberto: 0,
      totalRecurso: 0,
      totalRecuperado: 0,
      convenios: [],
      meses: [],
    };
  }

  // Filtro A Receber
  const receberFilter = (receberHospital === 'S' || receberHospital === 'N') ? ` AND receber_hospital = '${receberHospital}'` : '';

  // Totais gerais
  const [totais] = await db.execute(sql.raw(`
    SELECT 
      COUNT(*) as totalRegistros,
      COALESCE(SUM(CAST(vl_faturado AS DECIMAL(15,2))), 0) as totalFaturado,
      COALESCE(SUM(CAST(vl_recebido AS DECIMAL(15,2))), 0) as totalRecebido,
      COALESCE(SUM(CAST(vl_glosas AS DECIMAL(15,2))), 0) as totalGlosas,
      COALESCE(SUM(CAST(vl_aberto AS DECIMAL(15,2))), 0) as totalAberto,
      COALESCE(SUM(CAST(vl_recurso AS DECIMAL(15,2))), 0) as totalRecurso,
      COALESCE(SUM(CAST(gl_recuperado AS DECIMAL(15,2))), 0) as totalRecuperado
    FROM recebimento_geral
    WHERE estabelecimentoId = ${estabelecimentoId}${receberFilter}
  `));

  const t = (totais as any)[0] || {};

  // Por convênio
  const [convenios] = await db.execute(sql.raw(`
    SELECT 
      convenio,
      COUNT(*) as total,
      COALESCE(SUM(CAST(vl_faturado AS DECIMAL(15,2))), 0) as faturado,
      COALESCE(SUM(CAST(vl_recebido AS DECIMAL(15,2))), 0) as recebido,
      COALESCE(SUM(CAST(vl_glosas AS DECIMAL(15,2))), 0) as glosas
    FROM recebimento_geral
    WHERE estabelecimentoId = ${estabelecimentoId}${receberFilter}
    GROUP BY convenio
    ORDER BY faturado DESC
  `));

  // Por mês
  const [meses] = await db.execute(sql.raw(`
    SELECT 
      mes_producao as mes,
      COUNT(*) as total,
      COALESCE(SUM(CAST(vl_faturado AS DECIMAL(15,2))), 0) as faturado,
      COALESCE(SUM(CAST(vl_recebido AS DECIMAL(15,2))), 0) as recebido,
      COALESCE(SUM(CAST(vl_glosas AS DECIMAL(15,2))), 0) as glosas
    FROM recebimento_geral
    WHERE estabelecimentoId = ${estabelecimentoId}${receberFilter}
    GROUP BY mes_producao
    ORDER BY mes_producao DESC
  `));

  return {
    totalRegistros: Number(t.totalRegistros) || 0,
    totalFaturado: Number(t.totalFaturado) || 0,
    totalRecebido: Number(t.totalRecebido) || 0,
    totalGlosas: Number(t.totalGlosas) || 0,
    totalAberto: Number(t.totalAberto) || 0,
    totalRecurso: Number(t.totalRecurso) || 0,
    totalRecuperado: Number(t.totalRecuperado) || 0,
    convenios: (convenios as unknown as any[]).map((c) => ({
      convenio: c.convenio || "Sem convênio",
      total: Number(c.total) || 0,
      faturado: Number(c.faturado) || 0,
      recebido: Number(c.recebido) || 0,
      glosas: Number(c.glosas) || 0,
    })),
    meses: (meses as unknown as any[]).map((m) => ({
      mes: m.mes || "Sem mês",
      total: Number(m.total) || 0,
      faturado: Number(m.faturado) || 0,
      recebido: Number(m.recebido) || 0,
      glosas: Number(m.glosas) || 0,
    })),
  };
}

/**
 * Dados agregados de recebimento para o Relatório BI
 * Retorna métricas, breakdowns por convênio, tipo, setor, mês e top itens em aberto
 */
export async function dadosRecebimentoBI(params: {
  estabelecimentoId: number;
  mesProducao?: string;
  convenio?: string;
  setor?: string;
  receberHospital?: string; // 'S' = Hospital, 'N' = Terceiros, undefined = Todos
}): Promise<{
  resumo: {
    totalFaturado: number;
    totalRecebido: number;
    totalGlosas: number;
    totalAberto: number;
    totalRecurso: number;
    totalRecuperado: number;
    totalRecebAMaior: number;
    totalItens: number;
    taxaRecebimento: number;
  };
  porConvenio: { chave: string; faturado: number; recebido: number; glosas: number; aberto: number; recurso: number; recuperado: number; itens: number }[];
  porMes: { chave: string; faturado: number; recebido: number; glosas: number; aberto: number }[];
  porSetor: { chave: string; faturado: number; recebido: number; glosas: number; aberto: number; itens: number }[];
  porTipo: { chave: string; faturado: number; recebido: number; glosas: number; aberto: number; itens: number }[];
  topAberto: { convenio: string; numeroConta: string; protocolo: string; faturado: number; recebido: number; aberto: number; mesProducao: string }[];
}> {
  const db = await getDb();
  const emptyResult = {
    resumo: { totalFaturado: 0, totalRecebido: 0, totalGlosas: 0, totalAberto: 0, totalRecurso: 0, totalRecuperado: 0, totalRecebAMaior: 0, totalItens: 0, taxaRecebimento: 0 },
    porConvenio: [],
    porMes: [],
    porSetor: [],
    porTipo: [],
    topAberto: [],
  };
  if (!db) return emptyResult;

  // Construir WHERE
  const conditions: string[] = [`estabelecimentoId = ${params.estabelecimentoId}`];
  if (params.mesProducao) conditions.push(`mes_producao = '${params.mesProducao.replace(/'/g, "''")}'`);
  if (params.convenio) conditions.push(`convenio = '${params.convenio.replace(/'/g, "''")}'`);
  if (params.setor) conditions.push(`nome_setor = '${params.setor.replace(/'/g, "''")}'`);
  if (params.receberHospital === 'S' || params.receberHospital === 'N') conditions.push(`receber_hospital = '${params.receberHospital}'`);
  const where = conditions.join(" AND ");

  try {
    // 1. Resumo geral
    const [totais] = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as totalItens,
        COALESCE(SUM(CAST(vl_faturado AS DECIMAL(15,2))), 0) as totalFaturado,
        COALESCE(SUM(CAST(vl_recebido AS DECIMAL(15,2))), 0) as totalRecebido,
        COALESCE(SUM(CAST(vl_glosas AS DECIMAL(15,2))), 0) as totalGlosas,
        COALESCE(SUM(CAST(vl_aberto AS DECIMAL(15,2))), 0) as totalAberto,
        COALESCE(SUM(CAST(vl_recurso AS DECIMAL(15,2))), 0) as totalRecurso,
        COALESCE(SUM(CAST(gl_recuperado AS DECIMAL(15,2))), 0) as totalRecuperado,
        COALESCE(SUM(CAST(vl_receb_a_maior AS DECIMAL(15,2))), 0) as totalRecebAMaior
      FROM recebimento_geral WHERE ${where}
    `));
    const t = (totais as any)[0] || {};
    const totalFaturado = Number(t.totalFaturado) || 0;
    const totalRecebido = Number(t.totalRecebido) || 0;
    const taxaRecebimento = totalFaturado > 0 ? (totalRecebido / totalFaturado) * 100 : 0;

    // 2. Por convênio
    const [convRows] = await db.execute(sql.raw(`
      SELECT 
        convenio as chave,
        COALESCE(SUM(CAST(vl_faturado AS DECIMAL(15,2))), 0) as faturado,
        COALESCE(SUM(CAST(vl_recebido AS DECIMAL(15,2))), 0) as recebido,
        COALESCE(SUM(CAST(vl_glosas AS DECIMAL(15,2))), 0) as glosas,
        COALESCE(SUM(CAST(vl_aberto AS DECIMAL(15,2))), 0) as aberto,
        COALESCE(SUM(CAST(vl_recurso AS DECIMAL(15,2))), 0) as recurso,
        COALESCE(SUM(CAST(gl_recuperado AS DECIMAL(15,2))), 0) as recuperado,
        COUNT(*) as itens
      FROM recebimento_geral WHERE ${where}
      GROUP BY convenio ORDER BY faturado DESC
    `));

    // 3. Por mês de produção
    const [mesRows] = await db.execute(sql.raw(`
      SELECT 
        mes_producao as chave,
        COALESCE(SUM(CAST(vl_faturado AS DECIMAL(15,2))), 0) as faturado,
        COALESCE(SUM(CAST(vl_recebido AS DECIMAL(15,2))), 0) as recebido,
        COALESCE(SUM(CAST(vl_glosas AS DECIMAL(15,2))), 0) as glosas,
        COALESCE(SUM(CAST(vl_aberto AS DECIMAL(15,2))), 0) as aberto
      FROM recebimento_geral WHERE ${where}
      GROUP BY mes_producao ORDER BY mes_producao ASC
    `));

    // 4. Por setor
    const [setorRows] = await db.execute(sql.raw(`
      SELECT 
        COALESCE(nome_setor, 'Sem setor') as chave,
        COALESCE(SUM(CAST(vl_faturado AS DECIMAL(15,2))), 0) as faturado,
        COALESCE(SUM(CAST(vl_recebido AS DECIMAL(15,2))), 0) as recebido,
        COALESCE(SUM(CAST(vl_glosas AS DECIMAL(15,2))), 0) as glosas,
        COALESCE(SUM(CAST(vl_aberto AS DECIMAL(15,2))), 0) as aberto,
        COUNT(*) as itens
      FROM recebimento_geral WHERE ${where}
      GROUP BY nome_setor ORDER BY faturado DESC
    `));

    // 5. Por tipo de procedimento
    const [tipoRows] = await db.execute(sql.raw(`
      SELECT 
        COALESCE(tipo_procedimento, 'Sem tipo') as chave,
        COALESCE(SUM(CAST(vl_faturado AS DECIMAL(15,2))), 0) as faturado,
        COALESCE(SUM(CAST(vl_recebido AS DECIMAL(15,2))), 0) as recebido,
        COALESCE(SUM(CAST(vl_glosas AS DECIMAL(15,2))), 0) as glosas,
        COALESCE(SUM(CAST(vl_aberto AS DECIMAL(15,2))), 0) as aberto,
        COUNT(*) as itens
      FROM recebimento_geral WHERE ${where}
      GROUP BY tipo_procedimento ORDER BY faturado DESC
    `));

    // 6. Top 20 contas com maior valor em aberto
    const [topRows] = await db.execute(sql.raw(`
      SELECT 
        convenio, numero_conta as numeroConta, protocolo,
        COALESCE(CAST(vl_faturado AS DECIMAL(15,2)), 0) as faturado,
        COALESCE(CAST(vl_recebido AS DECIMAL(15,2)), 0) as recebido,
        COALESCE(CAST(vl_aberto AS DECIMAL(15,2)), 0) as aberto,
        mes_producao as mesProducao
      FROM recebimento_geral WHERE ${where} AND CAST(vl_aberto AS DECIMAL(15,2)) > 0
      ORDER BY CAST(vl_aberto AS DECIMAL(15,2)) DESC LIMIT 20
    `));

    const mapRow = (r: any) => ({
      chave: r.chave || "N/A",
      faturado: Number(r.faturado) || 0,
      recebido: Number(r.recebido) || 0,
      glosas: Number(r.glosas) || 0,
      aberto: Number(r.aberto) || 0,
      recurso: Number(r.recurso) || 0,
      recuperado: Number(r.recuperado) || 0,
      itens: Number(r.itens) || 0,
    });

    return {
      resumo: {
        totalFaturado,
        totalRecebido,
        totalGlosas: Number(t.totalGlosas) || 0,
        totalAberto: Number(t.totalAberto) || 0,
        totalRecurso: Number(t.totalRecurso) || 0,
        totalRecuperado: Number(t.totalRecuperado) || 0,
        totalRecebAMaior: Number(t.totalRecebAMaior) || 0,
        totalItens: Number(t.totalItens) || 0,
        taxaRecebimento: Number(taxaRecebimento.toFixed(1)),
      },
      porConvenio: (convRows as unknown as any[]).map(mapRow),
      porMes: (mesRows as unknown as any[]).map(r => ({
        chave: r.chave || "N/A",
        faturado: Number(r.faturado) || 0,
        recebido: Number(r.recebido) || 0,
        glosas: Number(r.glosas) || 0,
        aberto: Number(r.aberto) || 0,
      })),
      porSetor: (setorRows as unknown as any[]).map(mapRow),
      porTipo: (tipoRows as unknown as any[]).map(mapRow),
      topAberto: (topRows as unknown as any[]).map(r => ({
        convenio: r.convenio || "N/A",
        numeroConta: r.numeroConta || "",
        protocolo: r.protocolo || "",
        faturado: Number(r.faturado) || 0,
        recebido: Number(r.recebido) || 0,
        aberto: Number(r.aberto) || 0,
        mesProducao: r.mesProducao || "",
      })),
    };
  } catch (error) {
    console.error("[RecebimentoBI] Erro:", error);
    return emptyResult;
  }
}
