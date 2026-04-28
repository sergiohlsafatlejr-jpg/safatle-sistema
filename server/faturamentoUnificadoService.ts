/**
 * Service para popular e manter a tabela faturamento_unificado
 * Unifica dados de duas fontes:
 * - WARLEINE (tabela integ_faturado): dados do faturamento do hospital via banco Warleine
 * - XML_TISS (tabela staging_faturamento_xml): dados dos XMLs enviados aos convênios
 */

import { getDb } from "./db";
import { sql, eq } from "drizzle-orm";
import { warleineFaturamentoStaging } from "../drizzle/schema-integracao";
import { executarMatchingMultiFase } from "./services/conciliacaoCruzadaEngine";

// ============================================================
// POPULAÇÃO A PARTIR DO WARLEINE (integ_faturado)
// ============================================================

/**
 * Popula faturamento_unificado a partir dos dados do integ_faturado (Warleine)
 * para um estabelecimento e competência específicos.
 * Mapeamento:
 *   integ_faturado._id → origemId
 *   'WARLEINE' → origemSistema
 *   numconta → contaNumero
 *   guiacobra → numeroGuia
 *   aihguia → numeroGuiaOperadora
 *   protocolo → protocolo
 *   numfatura → lotePrestador
 *   matricula → carteiraBeneficiario
 *   nomeconv → convenio
 *   mesprod → competencia (convertido de 2025/01 para 2025-01)
 *   nomeprest → profissionalExecutante
 *   nomecc → setor
 *   tipoproc → tipoItem
 *   procdisco → codigoItem
 *   codproprio → codigoItemTuss
 *   descricao → descricaoItem
 *   data → dataExecucao
 *   quantidade → quantidade
 *   vl_unitario → valorUnitario
 *   vl_faturado → valorFaturado
 */
export async function popularDeIntegFaturado(
  estabelecimentoId: number,
  competencia?: string
): Promise<{ inseridos: number; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const compFilter = competencia ? `AND competencia LIKE '${competencia.replace(/'/g, "''")}%'` : '';
  const compWarleineFilter = competencia ? `AND ig.mesprod LIKE '${competencia.replace('-', '/').replace(/'/g, "''")}%'` : '';

  // PASSO 1: Deletar APENAS itens com statusConciliacao = 'pendente'
  // Itens já processados (conciliado, divergente, nao_recebido, glosado) são preservados
  const deleteQuery = `
    DELETE FROM faturamento_unificado 
    WHERE origemSistema = 'WARLEINE' 
      AND estabelecimentoId = ${estabelecimentoId}
      AND statusConciliacao = 'pendente'
      ${compFilter}
  `;
  await db.execute(sql.raw(deleteQuery));

  // PASSO 2: Inserir apenas itens que NÃO existem ainda no faturamento_unificado
  // Usa LEFT JOIN para detectar itens já existentes (por origemId + origemSistema)
  const insertQuery = `
    INSERT INTO faturamento_unificado (
      origemSistema, origemId, estabelecimentoId,
      contaNumero, numeroGuia, numeroGuiaOperadora,
      protocolo, lotePrestador, carteiraBeneficiario,
      convenio, competencia,
      profissionalExecutante, setor,
      tipoItem, codigoItem, codigoItemTuss,
      descricaoItem, dataExecucao, quantidade,
      valorUnitario, valorFaturado,
      dataSincronizacao
    )
    SELECT
      'WARLEINE',
      CAST(ig._id AS CHAR),
      ig.estabelecimento_id,
      ig.numconta,
      ig.guiacobra,
      ig.aihguia,
      ig.protocolo,
      ig.numfatura,
      ig.matricula,
      TRIM(ig.nomeconv),
      REPLACE(ig.mesprod, '/', '-'),
      ig.nomeprest,
      ig.nomecc,
      ig.tipoproc,
      ig.procdisco,
      ig.codproprio,
      ig.descricao,
      ig.data,
      ig.quantidade,
      ig.vl_unitario,
      ig.vl_faturado,
      NOW()
    FROM integ_faturado ig
    LEFT JOIN faturamento_unificado fu 
      ON fu.origemSistema = 'WARLEINE' 
      AND fu.origemId COLLATE utf8mb4_unicode_ci = CAST(ig._id AS CHAR) COLLATE utf8mb4_unicode_ci
      AND fu.estabelecimentoId = ig.estabelecimento_id
    WHERE ig.estabelecimento_id = ${estabelecimentoId}
      AND fu.id IS NULL
      ${compWarleineFilter}
  `;

  await db.execute(sql.raw(insertQuery));

  // Contar registros totais
  const countQuery = `
    SELECT COUNT(*) as total FROM faturamento_unificado 
    WHERE origemSistema = 'WARLEINE' AND estabelecimentoId = ${estabelecimentoId}
    ${compFilter}
  `;
  const [countResult] = await db.execute(sql.raw(countQuery));
  const total = (countResult as any)?.[0]?.total || 0;

  return { inseridos: Number(total), total: Number(total) };
}

// ============================================================
// POPULAÇÃO A PARTIR DO TASY (faturadoTasy) - LEGADO
// ============================================================

/**
 * @deprecated Use popularDeIntegFaturado() em vez desta função.
 * Mantida para compatibilidade. Popula a partir do faturadoTasy.
 */
export async function popularDeTasy(
  estabelecimentoId: number,
  competencia?: string
): Promise<{ inseridos: number; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const compFilter = competencia ? `AND competencia LIKE '${competencia.replace(/'/g, "''")}%'` : '';

  // Limpar APENAS registros TASY pendentes (preservar itens já processados)
  const deleteQuery = `
    DELETE FROM faturamento_unificado 
    WHERE origemSistema = 'TASY' 
      AND estabelecimentoId = ${estabelecimentoId}
      AND statusConciliacao = 'pendente'
      ${compFilter}
  `;
  await db.execute(sql.raw(deleteQuery));

  // Inserir apenas itens que NÃO existem ainda (evitar duplicação)
  let insertQuery = `
    INSERT INTO faturamento_unificado (
      origemSistema, origemId, estabelecimentoId,
      contaNumero, protocolo, atendimento,
      convenio, competencia,
      profissionalExecutante, setor,
      tipoItem, codigoItem, codigoItemTuss,
      descricaoItem, dataExecucao, quantidade,
      valorFaturado, valorPago, valorGlosa,
      motivoGlosa, retorno, dataPagamento,
      dataSincronizacao
    )
    SELECT
      'TASY',
      CAST(ft.id AS CHAR),
      ft.estabelecimentoId,
      ft.conta,
      ft.protocolo,
      ft.atend,
      ft.convenio,
      ft.competencia,
      ft.profExec,
      ft.setor,
      ft.tipoItem,
      ft.cdItem,
      ft.cdItemTuss,
      ft.descricao,
      ft.dtItem,
      ft.qtd,
      ft.vlFaturado,
      ft.vlPago,
      ft.vlGlosa,
      ft.motivoGlosa,
      ft.retorno,
      ft.dtPgto,
      NOW()
    FROM faturadoTasy ft
    LEFT JOIN faturamento_unificado fu 
      ON fu.origemSistema = 'TASY' 
      AND fu.origemId COLLATE utf8mb4_unicode_ci = CAST(ft.id AS CHAR) COLLATE utf8mb4_unicode_ci
      AND fu.estabelecimentoId = ft.estabelecimentoId
    WHERE ft.estabelecimentoId = ${estabelecimentoId}
      AND fu.id IS NULL
  `;

  if (competencia) {
    insertQuery += ` AND ft.competencia LIKE '${competencia.replace(/'/g, "''")}%'`;
  }

  await db.execute(sql.raw(insertQuery));

  // Contar registros inseridos
  const countQuery = `
    SELECT COUNT(*) as total FROM faturamento_unificado 
    WHERE origemSistema = 'TASY' AND estabelecimentoId = ${estabelecimentoId}
    ${competencia ? `AND competencia LIKE '${competencia.replace(/'/g, "''")}%'` : ''}
  `;
  const [countResult] = await db.execute(sql.raw(countQuery));
  const total = (countResult as any)?.[0]?.total || 0;

  return { inseridos: Number(total), total: Number(total) };
}

// ============================================================
// CONTAGEM DE DADOS TASY STAGING (já populados via importação)
// ============================================================

/**
 * Conta os dados TASY_STAGING já existentes na faturamento_unificado.
 * Os dados do tasy_faturado_staging são importados diretamente para a
 * faturamento_unificado via processo de importação, não precisam ser
 * re-populados como Warleine ou XML_TISS.
 */
export async function contarTasyStaging(
  estabelecimentoId: number,
  competencia?: string
): Promise<{ total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const compFilter = competencia
    ? `AND competencia LIKE '${competencia.replace(/'/g, "''")}%'`
    : '';

  const countQuery = `
    SELECT COUNT(*) as total FROM faturamento_unificado 
    WHERE origemSistema = 'TASY_STAGING' AND estabelecimentoId = ${estabelecimentoId}
    ${compFilter}
  `;
  const [countResult] = await db.execute(sql.raw(countQuery));
  const total = (countResult as any)?.[0]?.total || 0;

  return { total: Number(total) };
}

// ============================================================
// POPULAÇÃO A PARTIR DO XML TISS (staging_faturamento_xml)
// ============================================================

/**
 * Popula faturamento_unificado a partir dos dados do staging_faturamento_xml (XML)
 * para um estabelecimento e data de referência específicos.
 */
export async function popularDeXmlTiss(
  estabelecimentoId: number,
  dataReferencia?: string
): Promise<{ inseridos: number; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const compFilter = dataReferencia ? `AND competencia = '${dataReferencia.replace(/'/g, "''")}' ` : '';

  // PASSO 1: Deletar APENAS itens XML_TISS com statusConciliacao = 'pendente'
  // Itens já processados (conciliado, divergente, nao_recebido, glosado) são preservados
  const deleteQuery = `
    DELETE FROM faturamento_unificado 
    WHERE origemSistema = 'XML_TISS' 
      AND estabelecimentoId = ${estabelecimentoId}
      AND statusConciliacao = 'pendente'
      ${compFilter}
  `;
  await db.execute(sql.raw(deleteQuery));

  // PASSO 2: Inserir apenas itens que NÃO existem ainda (evitar duplicação)
  // Usa LEFT JOIN com faturamento_unificado para detectar itens já existentes
  let insertQuery = `
    INSERT INTO faturamento_unificado (
      origemSistema, origemId, estabelecimentoId,
      numeroGuia, numeroGuiaOperadora, senha,
      lotePrestador, carteiraBeneficiario,
      convenioId, convenio, competencia,
      profissionalExecutante,
      tipoItem, codigoItem,
      descricaoItem, dataExecucao, quantidade,
      valorUnitario, valorFaturado,
      codigoPrestadorExecutante,
      dataSincronizacao
    )
    SELECT
      'XML_TISS',
      CAST(dedup.id AS CHAR),
      dedup.estabelecimentoId,
      dedup.numero_guia_prestador,
      dedup.numero_guia_operadora,
      dedup.senha,
      dedup.numero_lote,
      dedup.carteira_beneficiario,
      dedup.convenioId,
      c.nome,
      DATE_FORMAT(dedup.data_referencia, '%Y-%m'),
      dedup.nome_prof,
      dedup.tipo_item,
      dedup.codigo_item,
      dedup.descricao_item,
      dedup.data_execucao,
      dedup.quantidade,
      dedup.valor_unitario,
      dedup.valor_faturado,
      dedup.codigo_prestador_executante,
      NOW()
    FROM (
      SELECT ft.*,
        ROW_NUMBER() OVER (
          PARTITION BY ft.numero_guia_prestador, ft.sequencial_item, ft.codigo_item, ft.data_execucao, ft.quantidade, ft.valor_faturado
          ORDER BY ft.id ASC
        ) as rn
      FROM staging_faturamento_xml ft
      WHERE ft.estabelecimentoId = ${estabelecimentoId}
    ) dedup
    LEFT JOIN convenios c ON dedup.convenioId = c.id
    LEFT JOIN faturamento_unificado fu 
      ON fu.origemSistema = 'XML_TISS' 
      AND fu.origemId COLLATE utf8mb4_unicode_ci = CAST(dedup.id AS CHAR) COLLATE utf8mb4_unicode_ci
      AND fu.estabelecimentoId = dedup.estabelecimentoId
    WHERE dedup.rn = 1
      AND fu.id IS NULL
  `;

  if (dataReferencia) {
    insertQuery += ` AND DATE_FORMAT(dedup.data_referencia, '%Y-%m') = '${dataReferencia.replace(/'/g, "''")}' `;
  }

  await db.execute(sql.raw(insertQuery));

  // Contar registros inseridos
  const countQuery = `
    SELECT COUNT(*) as total FROM faturamento_unificado 
    WHERE origemSistema = 'XML_TISS' AND estabelecimentoId = ${estabelecimentoId}
    ${dataReferencia ? `AND competencia = '${dataReferencia.replace(/'/g, "''")}'` : ''}
  `;
  const [countResult] = await db.execute(sql.raw(countQuery));
  const total = (countResult as any)?.[0]?.total || 0;

  return { inseridos: Number(total), total: Number(total) };
}

// ============================================================
// ============================================================
// POPULAÇÃO A PARTIR DO TASY BI (tasy_faturado_itens_bi)
// ============================================================
export async function popularDeTasyBi(
  estabelecimentoId: number,
  competencia?: string
): Promise<{ inseridos: number; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const compFU = competencia ? `AND competencia LIKE '${competencia.replace(/'/g, "''")}%'` : '';
  const compTB = competencia ? `AND tb.COMPETENCIA LIKE '${competencia.replace(/'/g, "''")}%'` : '';

  await db.execute(sql.raw(`
    DELETE FROM faturamento_unificado 
    WHERE origemSistema = 'TASY_BI' 
      AND estabelecimentoId = ${estabelecimentoId}
      AND statusConciliacao = 'pendente'
      ${compFU}
  `));

  await db.execute(sql.raw(`
    INSERT INTO faturamento_unificado (
      origemSistema, origemId, estabelecimentoId,
      contaNumero, protocolo, atendimento,
      pacienteNome, carteiraBeneficiario, senha,
      lotePrestador, convenio, competencia,
      profissionalExecutante, setor,
      tipoItem, codigoItem, codigoItemTuss,
      descricaoItem, dataExecucao, quantidade,
      valorUnitario, valorFaturado, valorPago, valorGlosa,
      motivoGlosa, retorno, dataPagamento,
      dataSincronizacao
    )
    SELECT
      'TASY_BI',
      COALESCE(CONCAT_WS('-', NULLIF(TRIM(tb.CONTA), ''), NULLIF(TRIM(tb.SEQUENCIA), '')), CAST(tb.id AS CHAR)),
      tb.estabelecimentoId,
      NULLIF(TRIM(tb.CONTA), ''),
      NULLIF(TRIM(tb.PROTOCOLO), ''),
      NULLIF(TRIM(tb.ATEND), ''),
      NULLIF(TRIM(tb.PACIENTE), ''),
      NULLIF(TRIM(tb.MATRICULA), ''),
      NULLIF(TRIM(tb.AUTORIZACAO), ''),
      NULLIF(TRIM(tb.NR_PROTOCOLO), ''),
      NULLIF(TRIM(tb.CONVENIO), ''),
      NULLIF(TRIM(tb.COMPETENCIA), ''),
      NULLIF(TRIM(tb.PROF_EXEC), ''),
      NULLIF(TRIM(tb.SETOR), ''),
      NULLIF(TRIM(tb.TIPO_ITEM), ''),
      NULLIF(TRIM(tb.CD_ITEM), ''),
      NULLIF(TRIM(tb.CD_ITEM_TUSS), ''),
      NULLIF(TRIM(tb.DESCRICAO), ''),
      CASE WHEN tb.DT_ITEM IS NOT NULL AND TRIM(tb.DT_ITEM) != '' 
        THEN STR_TO_DATE(TRIM(tb.DT_ITEM), '%d-%b-%y') ELSE NULL END,
      CASE WHEN tb.QTD IS NOT NULL AND TRIM(tb.QTD) != '' 
        THEN CAST(TRIM(tb.QTD) AS DECIMAL(12,4)) ELSE NULL END,
      CASE WHEN tb.VL_PRODUZIDO IS NOT NULL AND TRIM(tb.VL_PRODUZIDO) != '' 
           AND tb.QTD IS NOT NULL AND TRIM(tb.QTD) != ''
           AND CAST(TRIM(tb.QTD) AS DECIMAL(12,4)) > 0
        THEN ROUND(CAST(TRIM(tb.VL_PRODUZIDO) AS DECIMAL(12,4)) 
          / CAST(TRIM(tb.QTD) AS DECIMAL(12,4)), 4) ELSE NULL END,
      CASE WHEN tb.VL_PRODUZIDO IS NOT NULL AND TRIM(tb.VL_PRODUZIDO) != '' 
        THEN CAST(TRIM(tb.VL_PRODUZIDO) AS DECIMAL(12,4)) ELSE NULL END,
      CASE WHEN tb.VL_PAGO IS NOT NULL AND TRIM(tb.VL_PAGO) != '' 
        THEN CAST(TRIM(tb.VL_PAGO) AS DECIMAL(12,4)) ELSE NULL END,
      CASE WHEN tb.VL_GLOSA IS NOT NULL AND TRIM(tb.VL_GLOSA) != '' 
        THEN CAST(TRIM(tb.VL_GLOSA) AS DECIMAL(12,4)) ELSE NULL END,
      NULLIF(TRIM(tb.MOTIVO_GLOSA), ''),
      NULLIF(TRIM(tb.RETORNO), ''),
      CASE WHEN tb.DT_PGTO IS NOT NULL AND TRIM(tb.DT_PGTO) != '' 
        THEN STR_TO_DATE(TRIM(tb.DT_PGTO), '%d-%b-%y') ELSE NULL END,
      NOW()
    FROM tasy_faturado_itens_bi tb
    LEFT JOIN faturamento_unificado fu_check
      ON fu_check.origemSistema = 'TASY_BI'
      AND fu_check.origemId COLLATE utf8mb4_unicode_ci = COALESCE(CONCAT_WS('-', NULLIF(TRIM(tb.CONTA), ''), NULLIF(TRIM(tb.SEQUENCIA), '')), CAST(tb.id AS CHAR)) COLLATE utf8mb4_unicode_ci
      AND fu_check.estabelecimentoId = tb.estabelecimentoId
    WHERE tb.estabelecimentoId = ${estabelecimentoId}
      AND tb.CD_ITEM IS NOT NULL AND TRIM(tb.CD_ITEM) != ''
      AND fu_check.id IS NULL
      ${compTB}
  `));

  const [countResult] = await db.execute(sql.raw(`
    SELECT COUNT(*) as total FROM faturamento_unificado 
    WHERE origemSistema = 'TASY_BI' AND estabelecimentoId = ${estabelecimentoId} ${compFU}
  `));
  const total = (countResult as any)?.[0]?.total || 0;
  console.log(`[TasyBI->Unificado] Estabelecimento ${estabelecimentoId}: ${total} itens`);
  return { inseridos: Number(total), total: Number(total) };
}

// ============================================================
// POPULAÇÃO COMPLETA (todas as fontes)
// ============================================================

/**
 * Popula faturamento_unificado a partir de todas as fontes:
 * - WARLEINE (integ_faturado): dados do faturamento do hospital
 * - XML_TISS (staging_faturamento_xml): dados dos XMLs enviados aos convênios
 * - TASY_BI (tasy_faturado_itens_bi): dados do Tasy via relatório BI (Oracle)
 * - TASY_STAGING: dados já importados do Tasy (apenas contagem, não re-popula)
 */
export async function popularFaturamentoUnificado(
  estabelecimentoId: number,
  competencia?: string
): Promise<{ warleine: { inseridos: number; total: number }; xmlTiss: { inseridos: number; total: number }; tasyBi: { inseridos: number; total: number }; tasyStaging: { total: number }; totalGeral: number }> {
  const empty = { inseridos: 0, total: 0 };
  
  let warleine = { ...empty };
  try { warleine = await popularDeIntegFaturado(estabelecimentoId, competencia); }
  catch (e) { console.log(`[PopularUnificado] Warleine ignorado para estab ${estabelecimentoId}:`, (e as any)?.message?.substring(0,100)); }

  let xmlTiss = { ...empty };
  try { xmlTiss = await popularDeXmlTiss(estabelecimentoId, competencia); }
  catch (e) { console.log(`[PopularUnificado] XML_TISS ignorado para estab ${estabelecimentoId}:`, (e as any)?.message?.substring(0,100)); }

  let tasyBi = { ...empty };
  try { tasyBi = await popularDeTasyBi(estabelecimentoId, competencia); }
  catch (e) { console.log(`[PopularUnificado] TasyBI ignorado para estab ${estabelecimentoId}:`, (e as any)?.message?.substring(0,100)); }

  let tasyStaging = { total: 0 };
  try { tasyStaging = await contarTasyStaging(estabelecimentoId, competencia); }
  catch (e) { console.log(`[PopularUnificado] TasyStaging ignorado para estab ${estabelecimentoId}:`, (e as any)?.message?.substring(0,100)); }

  return {
    warleine,
    xmlTiss,
    tasyBi,
    tasyStaging,
    totalGeral: warleine.total + xmlTiss.total + tasyBi.total + tasyStaging.total,
  };
}

// ============================================================
// CONSULTAS PARA CONCILIAÇÃO
// ============================================================

/**
 * Lista o faturamento unificado com filtros para conciliação
 */
export async function listarFaturamentoUnificado(params: {
  estabelecimentoId: number;
  competencia?: string;
  convenio?: string;
  convenioId?: number;
  statusConciliacao?: string;
  codigoItem?: string;
  pacienteNome?: string;
  limite?: number;
  offset?: number;
}): Promise<{ itens: any[]; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let whereClause = `WHERE fu.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia) {
    whereClause += ` AND fu.competencia LIKE '${params.competencia.replace(/'/g, "''")}%'`;
  }
  if (params.convenio) {
    whereClause += ` AND fu.convenio LIKE '%${params.convenio.replace(/'/g, "''")}%'`;
  }
  if (params.convenioId) {
    whereClause += ` AND fu.convenioId = ${params.convenioId}`;
  }
  if (params.statusConciliacao) {
    whereClause += ` AND fu.statusConciliacao = '${params.statusConciliacao.replace(/'/g, "''")}'`;
  }
  if (params.codigoItem) {
    whereClause += ` AND fu.codigoItem = '${params.codigoItem.replace(/'/g, "''")}'`;
  }
  if (params.pacienteNome) {
    whereClause += ` AND fu.pacienteNome LIKE '%${params.pacienteNome.replace(/'/g, "''")}%'`;
  }

  const limite = params.limite || 100;
  const offset = params.offset || 0;

  const query = `
    SELECT fu.* FROM faturamento_unificado fu
    ${whereClause}
    ORDER BY fu.competencia DESC, fu.contaNumero, fu.codigoItem
    LIMIT ${limite} OFFSET ${offset}
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM faturamento_unificado fu
    ${whereClause}
  `;

  const [rows] = await db.execute(sql.raw(query));
  const [countRows] = await db.execute(sql.raw(countQuery));
  const total = (countRows as any)?.[0]?.total || 0;

  return { itens: (rows as unknown as any[]), total: Number(total) };
}

/**
 * Resumo do faturamento unificado agrupado por convênio
 */
export async function resumoFaturamentoPorConvenio(params: {
  estabelecimentoId: number;
  competencia?: string;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let whereClause = `WHERE fu.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia) {
    whereClause += ` AND fu.competencia LIKE '${params.competencia.replace(/'/g, "''")}%'`;
  }

  const query = `
    SELECT
      fu.convenio,
      fu.convenioId,
      fu.origemSistema,
      COUNT(*) as totalItens,
      COUNT(DISTINCT fu.contaNumero) as totalContas,
      COUNT(DISTINCT fu.numeroGuia) as totalGuias,
      SUM(COALESCE(fu.valorFaturado, 0)) as valorTotalFaturado,
      SUM(COALESCE(fu.valorPago, 0)) as valorTotalPago,
      SUM(COALESCE(fu.valorGlosa, 0)) as valorTotalGlosado,
      SUM(CASE WHEN fu.statusConciliacao = 'conciliado' THEN 1 ELSE 0 END) as totalConciliados,
      SUM(CASE WHEN fu.statusConciliacao = 'divergente' THEN 1 ELSE 0 END) as totalDivergentes,
      SUM(CASE WHEN fu.statusConciliacao = 'pendente' THEN 1 ELSE 0 END) as totalPendentes,
      SUM(CASE WHEN fu.statusConciliacao = 'nao_recebido' THEN 1 ELSE 0 END) as totalNaoRecebidos
    FROM faturamento_unificado fu
    ${whereClause}
    GROUP BY fu.convenio, fu.convenioId, fu.origemSistema
    ORDER BY valorTotalFaturado DESC
  `;

  const [rows] = await db.execute(sql.raw(query));
  return (rows as unknown as any[]);
}

/**
 * Resumo do faturamento unificado agrupado por guia/conta
 * para visualização na tela de conciliação
 */
export async function resumoFaturamentoPorGuia(params: {
  estabelecimentoId: number;
  competencia?: string;
  convenio?: string;
  convenioId?: number;
  statusConciliacao?: string;
  busca?: string;
  loteXml?: string;
  loteRetorno?: string;
  limite?: number;
  offset?: number;
}): Promise<{ contas: any[]; total: number; resumo: any }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let whereClause = `WHERE fu.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia) {
    whereClause += ` AND fu.competencia LIKE '${params.competencia.replace(/'/g, "''")}%'`;
  }
  if (params.convenio) {
    whereClause += ` AND fu.convenio LIKE '%${params.convenio.replace(/'/g, "''")}%'`;
  }
  if (params.convenioId) {
    whereClause += ` AND fu.convenioId = ${params.convenioId}`;
  }
  if (params.statusConciliacao && params.statusConciliacao !== 'todos') {
    whereClause += ` AND fu.statusConciliacao = '${params.statusConciliacao.replace(/'/g, "''")}'`;
  }
  if (params.busca) {
    const busca = params.busca.replace(/'/g, "''");
    whereClause += ` AND (fu.contaNumero LIKE '%${busca}%' OR fu.numeroGuia LIKE '%${busca}%' OR fu.pacienteNome LIKE '%${busca}%' OR fu.convenio LIKE '%${busca}%')`;
  }
  if (params.loteXml) {
    whereClause += ` AND fu.lotePrestador = '${params.loteXml.replace(/'/g, "''")}'`;
  }
  if (params.loteRetorno) {
    const lr = params.loteRetorno.replace(/'/g, "''");
    whereClause += ` AND fu.numeroGuia IN (SELECT DISTINCT d.numero_guia FROM demonstrativo d WHERE d.estabelecimentoId = ${params.estabelecimentoId} AND d.lote_prestador = '${lr}')`;
  }

  const limite = params.limite || 50;
  const offset = params.offset || 0;

  // Agrupar por guia/conta
  const groupKey = `COALESCE(fu.contaNumero, fu.numeroGuia)`;

  const query = `
    SELECT
      ${groupKey} as chaveGuia,
      MAX(fu.contaNumero) as contaNumero,
      MAX(fu.numeroGuia) as numeroGuia,
      MAX(fu.atendimento) as atendimento,
      MAX(fu.pacienteNome) as pacienteNome,
      MAX(fu.carteiraBeneficiario) as carteiraBeneficiario,
      MAX(fu.convenio) as convenio,
      MAX(fu.convenioId) as convenioId,
      MAX(fu.competencia) as competencia,
      MAX(fu.profissionalExecutante) as profissionalExecutante,
      MAX(fu.setor) as setor,
      MAX(fu.protocolo) as protocolo,
      MAX(fu.origemSistema) as origemSistema,
      COUNT(*) as totalItens,
      SUM(COALESCE(fu.valorFaturado, 0)) as valorFaturado,
      SUM(COALESCE(fu.valorPago, 0)) as valorPago,
      SUM(COALESCE(fu.valorGlosa, 0)) as valorGlosa,
      SUM(COALESCE(fu.valorFaturado, 0)) - SUM(COALESCE(fu.valorPago, 0)) - SUM(COALESCE(fu.valorGlosa, 0)) as valorPendente,
      MAX(fu.statusConciliacao) as statusConciliacao,
      MAX(fu.dataPagamento) as dataPagamento
    FROM faturamento_unificado fu
    ${whereClause}
    GROUP BY ${groupKey}
    ORDER BY chaveGuia DESC
    LIMIT ${limite} OFFSET ${offset}
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM faturamento_unificado fu
    ${whereClause}
  `;

  // Resumo geral
  const resumoQuery = `
    SELECT
      COUNT(*) as totalItens,
      0 as totalContas,
      SUM(COALESCE(fu.valorFaturado, 0)) as totalFaturado,
      SUM(COALESCE(fu.valorPago, 0)) as totalPago,
      SUM(COALESCE(fu.valorGlosa, 0)) as totalGlosado,
      SUM(COALESCE(fu.valorFaturado, 0)) - SUM(COALESCE(fu.valorPago, 0)) - SUM(COALESCE(fu.valorGlosa, 0)) as totalPendente,
      SUM(CASE WHEN fu.statusConciliacao = 'conciliado' THEN 1 ELSE 0 END) as itensConciliados,
      SUM(CASE WHEN fu.statusConciliacao = 'divergente' THEN 1 ELSE 0 END) as itensDivergentes,
      SUM(CASE WHEN fu.statusConciliacao = 'pendente' THEN 1 ELSE 0 END) as itensPendentes,
      SUM(CASE WHEN fu.statusConciliacao = 'nao_recebido' THEN 1 ELSE 0 END) as itensNaoRecebidos
    FROM faturamento_unificado fu
    ${whereClause}
  `;

  const [rows] = await db.execute(sql.raw(query));
  const [countRows] = await db.execute(sql.raw(countQuery));
  const [resumoRows] = await db.execute(sql.raw(resumoQuery));

  const total = (countRows as any)?.[0]?.total || 0;
  const resumo = (resumoRows as any)?.[0] || {};

  return {
    contas: (rows as unknown as any[]),
    total: Number(total),
    resumo: {
      totalItens: Number(resumo.totalItens || 0),
      totalContas: Number(resumo.totalContas || 0),
      totalFaturado: Number(resumo.totalFaturado || 0),
      totalPago: Number(resumo.totalPago || 0),
      totalGlosado: Number(resumo.totalGlosado || 0),
      totalPendente: Number(resumo.totalPendente || 0),
      itensConciliados: Number(resumo.itensConciliados || 0),
      itensDivergentes: Number(resumo.itensDivergentes || 0),
      itensPendentes: Number(resumo.itensPendentes || 0),
      itensNaoRecebidos: Number(resumo.itensNaoRecebidos || 0),
    },
  };
}

/**
 * Itens detalhados de uma guia/conta específica
 */
export async function itensPorGuia(params: {
  estabelecimentoId: number;
  contaNumero?: string;
  numeroGuia?: string;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let whereClause = `WHERE fu.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.contaNumero) {
    whereClause += ` AND fu.contaNumero = '${params.contaNumero.replace(/'/g, "''")}'`;
  }
  if (params.numeroGuia) {
    whereClause += ` AND fu.numeroGuia = '${params.numeroGuia.replace(/'/g, "''")}'`;
  }

  const query = `
    SELECT fu.* FROM faturamento_unificado fu
    ${whereClause}
    ORDER BY fu.dataExecucao, fu.codigoItem
  `;

  const [rows] = await db.execute(sql.raw(query));
  return (rows as unknown as any[]);
}

/**
 * Competências disponíveis no faturamento unificado
 */
export async function competenciasDisponiveis(
  estabelecimentoId: number
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const query = `
    SELECT
      fu.competencia,
      COUNT(*) as total
    FROM faturamento_unificado fu
    WHERE fu.estabelecimentoId = ${estabelecimentoId}
      AND fu.competencia IS NOT NULL
    GROUP BY fu.competencia
    ORDER BY fu.competencia DESC
  `;

  const [rows] = await db.execute(sql.raw(query));
  return (rows as unknown as any[]);
}

/**
 * Convênios disponíveis no faturamento unificado
 */
export async function conveniosDisponiveis(params: {
  estabelecimentoId: number;
  competencia?: string;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let whereClause = `WHERE fu.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia) {
    whereClause += ` AND fu.competencia LIKE '${params.competencia.replace(/'/g, "''")}%'`;
  }

  const query = `
    SELECT 
      MAX(fu.convenioId) as convenioId,
      MAX(fu.convenio) as convenio,
      COUNT(*) as total
    FROM faturamento_unificado fu
    ${whereClause}
      AND fu.convenio IS NOT NULL
    GROUP BY fu.convenioId
    ORDER BY MAX(fu.convenio)
  `;

  const [rows] = await db.execute(sql.raw(query));
  return (rows as unknown as any[]);
}

/**
 * Atualizar status de conciliação de um item
 */
export async function atualizarStatusConciliacao(params: {
  id: number;
  statusConciliacao: string;
  recebimentoVinculadoId?: number;
  recebimentoOrigem?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let setClause = `statusConciliacao = '${params.statusConciliacao.replace(/'/g, "''")}'`;
  setClause += `, atualizadoEm = NOW()`;
  if (params.recebimentoVinculadoId) {
    setClause += `, recebimentoVinculadoId = ${params.recebimentoVinculadoId}`;
  }
  if (params.recebimentoOrigem) {
    setClause += `, recebimentoOrigem = '${params.recebimentoOrigem.replace(/'/g, "''")}'`;
  }

  const query = `UPDATE faturamento_unificado SET ${setClause} WHERE id = ${params.id}`;
  await db.execute(sql.raw(query));
}

/**
 * Vincular manualmente uma guia do faturamento com um recebimento
 * Usado quando as guias do mesmo paciente têm números diferentes
 */
export async function vincularGuiaManual(params: {
  faturamentoIds: number[];
  recebimentoId: number;
  recebimentoOrigem: 'excel' | 'xml';
}): Promise<{ atualizados: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  if (params.faturamentoIds.length === 0) return { atualizados: 0 };

  const ids = params.faturamentoIds.join(',');
  const query = `
    UPDATE faturamento_unificado 
    SET statusConciliacao = 'conciliado',
        recebimentoVinculadoId = ${params.recebimentoId},
        recebimentoOrigem = '${params.recebimentoOrigem}',
        atualizadoEm = NOW()
    WHERE id IN (${ids})
  `;

  await db.execute(sql.raw(query));
  return { atualizados: params.faturamentoIds.length };
}

/**
 * Buscar recebimentos candidatos para vinculação manual
 * Busca por nome do paciente, carteira ou guia similar
 */
export async function buscarRecebimentosCandidatos(params: {
  estabelecimentoId: number;
  pacienteNome?: string;
  carteiraBeneficiario?: string;
  competencia?: string;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let whereClause = `WHERE re.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.pacienteNome) {
    whereClause += ` AND re.nome_beneficiario LIKE '%${params.pacienteNome.replace(/'/g, "''").substring(0, 30)}%'`;
  }
  if (params.carteiraBeneficiario) {
    whereClause += ` AND re.beneficiario = '${params.carteiraBeneficiario.replace(/'/g, "''")}'`;
  }
  if (params.competencia) {
    whereClause += ` AND re.data_referencia LIKE '${params.competencia.replace(/'/g, "''")}%'`;
  }

  const query = `
    SELECT 
      re.id,
      re.numero_guia as numeroGuia,
      re.beneficiario,
      re.nome_beneficiario as nomeBeneficiario,
      re.item as codigoItem,
      re.item_desc as descricaoItem,
      re.valor_pagamento as valorPago,
      re.valor_glosa as valorGlosa,
      re.situacao_item as situacao,
      re.data_pagto as dataPagamento,
      re.data_referencia as dataReferencia,
      'excel' as origem
    FROM recebimentos_excel re
    ${whereClause}
    ORDER BY re.data_pagto DESC
    LIMIT 100
  `;

  const [rows] = await db.execute(sql.raw(query));
  return (rows as unknown as any[]);
}


// ============================================================
// CONCILIAÇÃO AUTOMÁTICA
// ============================================================

export interface ConciliacaoResultado {
  totalProcessados: number;
  totalConciliados: number;
  totalDivergentes: number;
  totalNaoRecebidos: number;
  totalGlosados: number;
  totalTerceiros: number;
  totalJaConciliados: number;
  detalhes: {
    conciliadosPorGuiaCodigo: number;
    conciliadosPorGuiaCodigoTuss: number;
    conciliadosPorVinculacao: number;
    conciliadosPorPacienteCodigo: number;
    conciliadosPorCarteiraCodigo: number;
  };
  divergencias: Array<{
    faturamentoId: number;
    recebimentoId: number;
    codigoItem: string;
    numeroGuia: string;
    valorFaturado: number;
    valorRecebido: number;
    diferenca: number;
  }>;
}

/**
 * Executa a conciliação automática cruzando faturamento_unificado com recebimentos_excel.
 * 
 * Estratégia de matching (em ordem de prioridade):
 * 1. Match exato: numero_guia + codigoItem
 * 2. Match TUSS: numero_guia + codigoItemTuss
 * 3. Match com vinculacao_codigos (tabela de-para): numero_guia + código traduzido
 * 4. Match por paciente: pacienteNome + codigoItem (fallback quando guia diverge)
 * 5. Match por carteira: carteiraBeneficiario + codigoItem (fallback quando guias são incompatíveis)
 * 
 * Status resultante:
 * - conciliado: match encontrado e valores compatíveis (diferença < 1%)
 * - divergente: match encontrado mas valores diferentes (diferença >= 1%)
 * - nao_recebido: faturado sem match no recebimento
 */
export async function executarConciliacaoAutomatica(params: {
  estabelecimentoId: number;
  competencia?: string;
  convenioId?: number;
  toleranciaPercentual?: number; // Tolerância para considerar valores iguais (default 1%)
}): Promise<ConciliacaoResultado> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  // NOTA: O processamento em lotes por competência agora é feito pelo
  // conciliacaoJobManager.ts (processamento assíncrono em background).
  // Esta função processa UMA competência por vez.

  const tolerancia = params.toleranciaPercentual ?? 1; // 1% de tolerância por padrão

  const resultado: ConciliacaoResultado = {
    totalProcessados: 0,
    totalConciliados: 0,
    totalDivergentes: 0,
    totalNaoRecebidos: 0,
    totalGlosados: 0,
    totalTerceiros: 0,
    totalJaConciliados: 0,
    detalhes: {
      conciliadosPorGuiaCodigo: 0,
      conciliadosPorGuiaCodigoTuss: 0,
      conciliadosPorVinculacao: 0,
      conciliadosPorPacienteCodigo: 0,
      conciliadosPorCarteiraCodigo: 0,
    },
    divergencias: [],
  };

  // -------------------------------------------------------
  // PASSO 0.5: Deletar conciliações anteriores para evitar duplicatas
  // -------------------------------------------------------
  let whereDelete = `WHERE estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia) {
    whereDelete += ` AND competencia LIKE '${params.competencia.replace(/'/g, "''")}%'`;
  }
  if (params.convenioId) {
    whereDelete += ` AND convenioId = ${params.convenioId}`;
  }
  if (params.contaNumero) {
    whereDelete += ` AND (contaNumero = '${params.contaNumero.replace(/'/g, "''")}' OR numeroGuia = '${params.contaNumero.replace(/'/g, "''")}')`;
  }
  if (params.loteXml) {
    whereDelete += ` AND lotePrestador = '${params.loteXml.replace(/'/g, "''")}'`;
  }
  await db.execute(sql.raw(`DELETE FROM conciliados_automatico ${whereDelete}`));

  // -------------------------------------------------------
  // PASSO 1: Buscar itens do faturamento_unificado para conciliação
  // Busca todos os itens (não apenas pendentes) pois a conciliação anterior
  // foi deletada acima
  // -------------------------------------------------------
  let whereFat = `WHERE fu.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia) {
    whereFat += ` AND fu.competencia LIKE '${params.competencia.replace(/'/g, "''")}%'`;
  }
  if (params.convenioId) {
    whereFat += ` AND fu.convenioId = ${params.convenioId}`;
  }
  if (params.contaNumero) {
    whereFat += ` AND (fu.contaNumero = '${params.contaNumero.replace(/'/g, "''")}' OR fu.numeroGuia = '${params.contaNumero.replace(/'/g, "''")}')`;
  }
  if (params.loteXml) {
    whereFat += ` AND fu.lotePrestador = '${params.loteXml.replace(/'/g, "''")}'`;
  }

  // -------------------------------------------------------
  // DEDUPLICAÇÃO: Excluir TASY_BI quando TASY_STAGING existe para a mesma conta.
  // Passo 1: Buscar contas que têm dados TASY_STAGING
  // Passo 2: Excluir TASY_BI dessas contas na query principal
  // -------------------------------------------------------
  const [stagingContas] = await db.execute(sql.raw(`
    SELECT DISTINCT contaNumero 
    FROM faturamento_unificado 
    ${whereFat.replace(/fu\./g, '')} 
    AND origemSistema = 'TASY_STAGING'
    LIMIT 50000
  `));
  const contasComStaging = new Set(
    (stagingContas as unknown as any[]).map(r => String(r.contaNumero))
  );

  const queryFaturamento = `
    SELECT 
      fu.id, fu.codigoItem, fu.codigoItemTuss, fu.numeroGuia, fu.contaNumero,
      fu.pacienteNome, fu.carteiraBeneficiario, fu.convenioId, fu.competencia,
      fu.convenio, fu.origemSistema, fu.descricaoItem, fu.tipoItem,
      fu.dataExecucao, fu.codigoPrestadorExecutante,
      COALESCE(fu.valorFaturado, 0) as valorFaturado,
      COALESCE(fu.quantidade, 0) as quantidade
    FROM faturamento_unificado fu
    ${whereFat}
    ORDER BY fu.id
  `;

  const [fatRows] = await db.execute(sql.raw(queryFaturamento));
  const fatRowsAll = fatRows as unknown as any[];

  // Filtrar em JS: se conta tem TASY_STAGING, excluir TASY_BI dessa conta
  const itensFaturamento = contasComStaging.size > 0
    ? fatRowsAll.filter(r => !(r.origemSistema === 'TASY_BI' && contasComStaging.has(String(r.contaNumero))))
    : fatRowsAll;

  resultado.totalProcessados = itensFaturamento.length;

  if (itensFaturamento.length === 0) {
    return resultado;
  }

  // -------------------------------------------------------
  // PASSO 1.5: Buscar códigos de prestadores PRÓPRIOS cadastrados
  // Itens cujo codigoPrestadorExecutante NÃO está entre os próprios
  // são considerados terceiros e não devem ser glosados
  // -------------------------------------------------------
  const [propriosRows] = await db.execute(sql.raw(
    `SELECT DISTINCT codigoPrestador FROM convenioEstabelecimentoPrestador 
     WHERE estabelecimentoId = ${params.estabelecimentoId} AND tipoPrestador = 'proprio' AND ativo = 'sim'`
  ));
  const codigosProprios = new Set((propriosRows as unknown as any[]).map(r => String(r.codigoPrestador)));

  // -------------------------------------------------------
  // PASSO 2: Buscar recebimentos_excel do mesmo estabelecimento/convênio
  // NÃO filtra por competência nos recebimentos, pois o pagamento pode
  // vir em mês posterior ao faturamento (ex: faturado 11/2025, pago 01/2026)
  // -------------------------------------------------------
  let whereRec = `WHERE re.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.convenioId) {
    whereRec += ` AND re.convenioId = ${params.convenioId}`;
  }
  if (params.loteRetorno) {
    whereRec += ` AND re.lote_prestador = '${params.loteRetorno.replace(/'/g, "''")}'`;
  }

  const queryRecebimentos = `
    SELECT 
      re.id, re.numero_guia as numeroGuia, re.item as codigoItem,
      re.nome_beneficiario as nomeBeneficiario, re.beneficiario as carteira,
      COALESCE(re.valor_pagamento, 0) as valorPago,
      COALESCE(re.valor_glosa, 0) as valorGlosa,
      re.situacao_item as situacao,
      COALESCE(re.quantidade, 0) as quantidade,
      re.item_desc as descricaoItem,
      re.tipo_lancamento as tipoLancamento,
      re.codigo_glosa as codigoGlosa
    FROM recebimentos_excel re
    ${whereRec}
    ORDER BY re.id
  `;

  const [recRows] = await db.execute(sql.raw(queryRecebimentos));
  const itensRecebimento = (recRows as unknown as any[]).map(r => ({
    ...r,
    saldoPago: Number(r.valorPago) || 0
  }));

  // -------------------------------------------------------
  // PASSO 3: Carregar tabela de vinculação de códigos (de-para)
  // -------------------------------------------------------
  let whereVinc = `WHERE vc.estabelecimentoId = ${params.estabelecimentoId} AND vc.ativo = 'sim'`;
  if (params.convenioId) {
    whereVinc += ` AND (vc.convenioId = ${params.convenioId} OR vc.convenioId IS NULL)`;
  }

  const queryVinculacao = `
    SELECT vc.codigoHospital, vc.codigoConvenio, vc.convenioId
    FROM vinculacao_codigos vc
    ${whereVinc}
  `;

  const [vincRows] = await db.execute(sql.raw(queryVinculacao));
  const vinculacoes = vincRows as unknown as any[];

  // Criar mapa de vinculação: codigoHospital → codigoConvenio
  const mapaVinculacao = new Map<string, string>();
  for (const v of vinculacoes) {
    mapaVinculacao.set(v.codigoHospital, v.codigoConvenio);
  }

  // -------------------------------------------------------
  // PASSO 4 & 5: Executar Motor de Conciliação Multi-Fase (Greedy)
  // -------------------------------------------------------
  const engineResult = executarMatchingMultiFase(
    itensFaturamento as any[],
    itensRecebimento as any[],
    mapaVinculacao,
    codigosProprios,
    tolerancia
  );
  
  const inserts = engineResult.inserts;
  
  // Mesclar resultado estatístico
  Object.assign(resultado, engineResult.resultado);

  
  // -------------------------------------------------------
  // PASSO 6: INSERT em MEGA-BATCH na tabela conciliados_automatico
  // Usa batches de 5000 para minimizar roundtrips ao banco
  // (conciliações anteriores já foram deletadas no PASSO 0.5)
  // -------------------------------------------------------
  let _firstErrLogged = false;
  const sn = (v) => isNaN(Number(v)) || !isFinite(Number(v)) ? 0 : Number(v);
  const MEGA_BATCH = 5000;
  const esc = (v: string | null | undefined) => {
    if (v === null || v === undefined || v === '') return 'NULL';
    const sanitized = String(v)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .substring(0, 500);
    return `'${sanitized}'`;
  };

  const toRow = (r: any) =>
    `(${sn(r.faturamentoUnificadoId)},${params.estabelecimentoId},${esc(r.contaNumero)},${esc(r.numeroGuia)},${esc(r.pacienteNome)},${esc(r.convenio)},${r.convenioId??'NULL'},${esc(r.competencia)},${esc(r.codigoItem)},${esc(r.codigoItemTuss)},${esc(r.descricaoItem)},${esc(r.tipoItem)},${esc(r.origemSistema)},${esc(r.dataExecucao)},${esc(r.codigoPrestadorExecutante)},${sn(r.valorFaturado)},${sn(r.quantidade)},${r.recebimentoId??'NULL'},${r.recebimentoOrigem?esc(r.recebimentoOrigem):'NULL'},${sn(r.valorPago)},${sn(r.valorGlosa)},${esc(r.codigoGlosa)},${esc(r.motivoGlosa)},${esc(r.statusConciliacao)},${r.metodoConciliacao?esc(r.metodoConciliacao):'NULL'},${sn(r.diferenca)},${sn(r.percentualDiferenca)},${tolerancia},NOW())`;

  const INSERT_COLS = `(faturamentoUnificadoId,estabelecimentoId,contaNumero,numeroGuia,pacienteNome,convenio,convenioId,competencia,codigoItem,codigoItemTuss,descricaoItem,tipoItem,origemSistema,dataExecucao,codigoPrestadorExecutante,valorFaturado,quantidade,recebimentoId,recebimentoOrigem,valorPago,valorGlosa,codigoGlosa,motivoGlosa,statusConciliacao,metodoConciliacao,diferenca,percentualDiferenca,toleranciaUsada,criadoEm)`;

  console.log(`[Conciliacao] Inserindo ${inserts.length} registros em batches de ${MEGA_BATCH}...`);
  const t0 = Date.now();

  for (let i = 0; i < inserts.length; i += MEGA_BATCH) {
    const batch = inserts.slice(i, i + MEGA_BATCH);
    const values = batch.map(toRow).join(',');
    try {
      await db.execute(sql.raw(`INSERT INTO conciliados_automatico ${INSERT_COLS} VALUES ${values}`));
    } catch (err: any) {
      console.error(`[Conciliacao] Erro mega-batch ${i}: ${err.message?.substring(0, 200)}. Tentando sub-batches...`);
      // Fallback: sub-batches de 500
      for (let j = 0; j < batch.length; j += 500) {
        const sub = batch.slice(j, j + 500);
        try {
          await db.execute(sql.raw(`INSERT INTO conciliados_automatico ${INSERT_COLS} VALUES ${sub.map(toRow).join(',')}`));
        } catch (subErr: any) {
          console.error(`[Conciliacao] Erro sub-batch ${i+j}: ${subErr.message?.substring(0, 100)}`);
          // Último recurso: um a um
          for (const r of sub) {
            try {
              await db.execute(sql.raw(`INSERT INTO conciliados_automatico ${INSERT_COLS} VALUES ${toRow(r)}`));
            } catch (e: any) {
              console.error(`[Conciliacao] Erro id=${r.faturamentoUnificadoId}: ${e.message}`); if(!_firstErrLogged) { _firstErrLogged = true; console.error('[Conciliacao] SQL:', toRow(r).substring(0, 500)); };
            }
          }
        }
      }
    }
  }
  console.log(`[Conciliacao] INSERT concluído em ${((Date.now()-t0)/1000).toFixed(1)}s`);

  // -------------------------------------------------------
  // PASSO 7: UPDATE em massa do statusConciliacao no faturamento_unificado
  // Agrupa TODOS os IDs por status e faz UPDATEs em paralelo com chunks menores
  // -------------------------------------------------------
  const t1 = Date.now();
  const porStatus = new Map<string, number[]>();
  for (const ins of inserts) {
    const st = ins.statusConciliacao;
    if (!porStatus.has(st)) porStatus.set(st, []);
    porStatus.get(st)!.push(ins.faturamentoUnificadoId);
  }

  const updatePromises: Promise<void>[] = [];
  for (const [status, ids] of porStatus) {
    if (ids.length === 0) continue;
    // Chunks de 2000 para queries menores e mais rápidas
    for (let i = 0; i < ids.length; i += 2000) {
      const chunk = ids.slice(i, i + 2000);
      updatePromises.push(
        db.execute(sql.raw(
          `UPDATE faturamento_unificado SET statusConciliacao = '${status}' WHERE id IN (${chunk.join(',')})`
        )).then(() => {})
      );
    }
  }
  // Executar em paralelo (max 4 simultâneos)
  for (let i = 0; i < updatePromises.length; i += 4) {
    await Promise.all(updatePromises.slice(i, i + 4));
  }
  console.log(`[Conciliacao] UPDATE concluído em ${((Date.now()-t1)/1000).toFixed(1)}s`);

  // -------------------------------------------------------
  // PASSO 8: Atualizar a View Materializada de Guias (fato_conciliacao_guias)
  // Essencial para carregar a página da UI quase instantaneamente
  // -------------------------------------------------------
  try {
    console.log(`[Conciliacao] Atualizando fato_conciliacao_guias para competência ${params.competencia}...`);
    const t2 = Date.now();
    let compWhere = `estabelecimentoId = ${params.estabelecimentoId}`;
    if (params.competencia) {
      compWhere += ` AND competencia = '${params.competencia.replace(/'/g, "''")}'`;
    }
    if (params.convenioId) {
      compWhere += ` AND convenioId = ${params.convenioId}`;
    }

    // Deletar as guias anteriores desse filtro para evitar lixo
    await db.execute(sql.raw(`DELETE FROM fato_conciliacao_guias WHERE ${compWhere}`));

    // Inserir os dados agregados atualizados
    await db.execute(sql.raw(`
      INSERT INTO fato_conciliacao_guias (
        estabelecimentoId, competencia, convenioId, convenio, guia, pacienteNome, 
        valorFaturado, valorPago, valorGlosa, diferenca, statusGuia, 
        totalItens, itensConciliados, itensDivergentes, itensGlosados, itensNaoRecebidos, itensTerceiros
      )
      SELECT 
        estabelecimentoId, MAX(competencia), MAX(convenioId), MAX(convenio),
        COALESCE(numeroGuia, contaNumero) as guia, MAX(pacienteNome),
        COALESCE(SUM(valorFaturado), 0), COALESCE(SUM(valorPago), 0), COALESCE(SUM(valorGlosa), 0), COALESCE(SUM(diferenca), 0),
        CASE
          WHEN SUM(CASE WHEN statusConciliacao IN ('nao_recebido', 'divergente') THEN 1 ELSE 0 END) = 0 THEN 'conciliado'
          WHEN SUM(CASE WHEN statusConciliacao = 'divergente' THEN 1 ELSE 0 END) > 0 THEN 'divergente'
          WHEN SUM(CASE WHEN statusConciliacao = 'nao_recebido' THEN 1 ELSE 0 END) > 0 THEN 'nao_recebido'
          WHEN SUM(CASE WHEN statusConciliacao = 'terceiro' THEN 1 ELSE 0 END) > 0 AND SUM(CASE WHEN statusConciliacao != 'terceiro' THEN 1 ELSE 0 END) = 0 THEN 'terceiro'
          ELSE 'glosado'
        END as statusGuia,
        COUNT(*),
        SUM(CASE WHEN statusConciliacao = 'conciliado' THEN 1 ELSE 0 END),
        SUM(CASE WHEN statusConciliacao = 'divergente' THEN 1 ELSE 0 END),
        SUM(CASE WHEN statusConciliacao = 'glosado' THEN 1 ELSE 0 END),
        SUM(CASE WHEN statusConciliacao = 'nao_recebido' THEN 1 ELSE 0 END),
        SUM(CASE WHEN statusConciliacao = 'terceiro' THEN 1 ELSE 0 END)
      FROM conciliados_automatico
      WHERE ${compWhere}
      GROUP BY COALESCE(numeroGuia, contaNumero), numeroGuia, contaNumero, estabelecimentoId
    `));
    console.log(`[Conciliacao] fato_conciliacao_guias atualizada em ${((Date.now()-t2)/1000).toFixed(1)}s`);
  } catch (err: any) {
    console.error(`[Conciliacao] Erro ao atualizar fato_conciliacao_guias:`, err.message);
  }

  return resultado;
}

/**
 * Reseta a conciliação: deleta registros da conciliados_automatico
 */
export async function resetarConciliacao(params: {
  estabelecimentoId: number;
  competencia?: string;
  convenioId?: number;
}): Promise<{ resetados: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let whereClause = `WHERE estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia) {
    whereClause += ` AND competencia LIKE '${params.competencia.replace(/'/g, "''")}%'`;
  }
  if (params.convenioId) {
    whereClause += ` AND convenioId = ${params.convenioId}`;
  }

  // Contar antes
  const [countRows] = await db.execute(sql.raw(
    `SELECT COUNT(*) as total FROM conciliados_automatico ${whereClause}`
  ));
  const total = Number((countRows as any)?.[0]?.total || 0);

  // Resetar statusConciliacao no faturamento_unificado para 'pendente'
  // Primeiro buscar os IDs do faturamento_unificado que serão afetados
  const [idsRows] = await db.execute(sql.raw(
    `SELECT DISTINCT faturamentoUnificadoId FROM conciliados_automatico ${whereClause}`
  ));
  const idsAfetados = (idsRows as unknown as any[]).map((r: any) => r.faturamentoUnificadoId).filter(Boolean);
  
  if (idsAfetados.length > 0) {
    // Atualizar em batches de 500
    for (let i = 0; i < idsAfetados.length; i += 500) {
      const batch = idsAfetados.slice(i, i + 500);
      await db.execute(sql.raw(
        `UPDATE faturamento_unificado SET statusConciliacao = 'pendente' WHERE id IN (${batch.join(',')})`
      ));
    }
  }

  // Deletar registros de conciliação
  const query = `DELETE FROM conciliados_automatico ${whereClause}`;
  await db.execute(sql.raw(query));

  return { resetados: total };
}

/**
 * Lista os resultados da conciliação automática com filtros
 */
export async function listarConciliadosAutomatico(params: {
  estabelecimentoId: number;
  competencia?: string;
  convenioId?: number;
  statusConciliacao?: string;
  busca?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: any[]; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let whereClause = `WHERE ca.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia) {
    whereClause += ` AND ca.competencia LIKE '${params.competencia.replace(/'/g, "''")}%'`;
  }
  if (params.convenioId) {
    whereClause += ` AND ca.convenioId = ${params.convenioId}`;
  }
  if (params.statusConciliacao && params.statusConciliacao !== 'todos') {
    whereClause += ` AND ca.statusConciliacao = '${params.statusConciliacao.replace(/'/g, "''")}'`;
  }
  if (params.busca) {
    const b = params.busca.replace(/'/g, "''");
    whereClause += ` AND (ca.numeroGuia LIKE '%${b}%' OR ca.contaNumero LIKE '%${b}%' OR ca.pacienteNome LIKE '%${b}%' OR ca.convenio LIKE '%${b}%' OR ca.codigoItem LIKE '%${b}%')`;
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;

  // Contar total
  const [countRows] = await db.execute(sql.raw(
    `SELECT COUNT(*) as total FROM conciliados_automatico ca ${whereClause}`
  ));
  const total = Number((countRows as any)?.[0]?.total || 0);

  // Buscar itens
  const query = `
    SELECT 
      ca.id, ca.faturamentoUnificadoId, ca.contaNumero, ca.numeroGuia,
      ca.pacienteNome, ca.convenio, ca.convenioId, ca.competencia,
      ca.codigoItem, ca.codigoItemTuss, ca.descricaoItem, ca.tipoItem, ca.origemSistema,
      COALESCE(ca.valorFaturado, 0) as valorFaturado,
      COALESCE(ca.quantidade, 0) as quantidade,
      ca.recebimentoId, ca.recebimentoOrigem,
      COALESCE(ca.valorPago, 0) as valorPago,
      COALESCE(ca.valorGlosa, 0) as valorGlosa,
      ca.codigoGlosa, ca.motivoGlosa,
      ca.statusConciliacao, ca.metodoConciliacao,
      COALESCE(ca.diferenca, 0) as diferenca,
      COALESCE(ca.percentualDiferenca, 0) as percentualDiferenca,
      ca.toleranciaUsada, ca.criadoEm
    FROM conciliados_automatico ca
    ${whereClause}
    ORDER BY ca.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [rows] = await db.execute(sql.raw(query));
  return { items: rows as unknown as any[], total };
}

/**
 * Resumo dos resultados da conciliação automática por status
 */
export async function resumoConciliadosAutomatico(params: {
  estabelecimentoId: number;
  competencia?: string;
  convenioId?: number;
}): Promise<{
  totalConciliados: number;
  totalDivergentes: number;
  totalNaoRecebidos: number;
  totalTerceiros: number;
  valorTotalFaturado: number;
  valorTotalPago: number;
  valorTotalGlosa: number;
  valorTotalDiferenca: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let whereClause = `WHERE fcg.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia) {
    whereClause += ` AND fcg.competencia LIKE '${params.competencia.replace(/'/g, "''")}%'`;
  }
  if (params.convenioId) {
    whereClause += ` AND fcg.convenioId = ${params.convenioId}`;
  }

  const query = `
    SELECT 
      COALESCE(SUM(fcg.itensConciliados), 0) as totalConciliados,
      COALESCE(SUM(fcg.itensDivergentes), 0) as totalDivergentes,
      COALESCE(SUM(fcg.itensNaoRecebidos), 0) as totalNaoRecebidos,
      COALESCE(SUM(fcg.itensTerceiros), 0) as totalTerceiros,
      COALESCE(SUM(fcg.valorFaturado), 0) as valorTotalFaturado,
      COALESCE(SUM(fcg.valorPago), 0) as valorTotalPago,
      COALESCE(SUM(fcg.valorGlosa), 0) as valorTotalGlosa,
      COALESCE(SUM(fcg.diferenca), 0) as valorTotalDiferenca
    FROM fato_conciliacao_guias fcg
    ${whereClause}
  `;

  const [rows] = await db.execute(sql.raw(query));
  const row = (rows as unknown as any[])[0] || {};

  return {
    totalConciliados: Number(row.totalConciliados) || 0,
    totalDivergentes: Number(row.totalDivergentes) || 0,
    totalNaoRecebidos: Number(row.totalNaoRecebidos) || 0,
    totalTerceiros: Number(row.totalTerceiros) || 0,
    valorTotalFaturado: Number(row.valorTotalFaturado) || 0,
    valorTotalPago: Number(row.valorTotalPago) || 0,
    valorTotalGlosa: Number(row.valorTotalGlosa) || 0,
    valorTotalDiferenca: Number(row.valorTotalDiferenca) || 0,
  };
}

// ============================================================
// QUERIES PARA ABA CONCILIADOS - AGRUPADO POR GUIA
// ============================================================

/**
 * Competências disponíveis na tabela conciliados_automatico
 * Também inclui competências do faturamento_unificado que ainda não foram conciliadas
 */
export async function competenciasConciliados(estabelecimentoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");
  // Query rápida: buscar competências distintas de cada tabela separadamente
  const [rowsConc] = await db.execute(sql.raw(
    `SELECT competencia, COUNT(*) as total
     FROM conciliados_automatico
     WHERE estabelecimentoId = ${estabelecimentoId}
     GROUP BY competencia`
  ));
  const [rowsFat] = await db.execute(sql.raw(
    `SELECT competencia, COUNT(*) as total
     FROM faturamento_unificado
     WHERE estabelecimentoId = ${estabelecimentoId}
     GROUP BY competencia`
  ));
  // Combinar em JS (muito mais rápido que UNION ALL + GROUP BY no SQL)
  const mapa = new Map<string, number>();
  for (const r of rowsConc as unknown as any[]) {
    if (r.competencia) mapa.set(r.competencia, (mapa.get(r.competencia) || 0) + Number(r.total));
  }
  for (const r of rowsFat as unknown as any[]) {
    if (r.competencia) mapa.set(r.competencia, (mapa.get(r.competencia) || 0) + Number(r.total));
  }
  return Array.from(mapa.entries())
    .map(([competencia, total]) => ({ competencia, total }))
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
}

/**
 * Convênios disponíveis na tabela conciliados_automatico
 */
export async function conveniosConciliados(estabelecimentoId: number, competencia?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");
  let where = `WHERE estabelecimentoId = ${estabelecimentoId}`;
  if (competencia) {
    where += ` AND competencia LIKE '${competencia.replace(/'/g, "''")}%'`;
  }
  const [rows] = await db.execute(sql.raw(
    `SELECT MAX(convenioId) as convenioId, MAX(convenio) as convenio, COUNT(*) as total
     FROM conciliados_automatico
     ${where}
     GROUP BY convenioId
     ORDER BY total DESC`
  ));
  return (rows as unknown as any[]).filter((r: any) => r.convenioId);
}

/**
 * Resumo agrupado por GUIA dos conciliados automáticos
 * Retorna: guia, paciente, convênio, competência, totalItens, valorFaturado, valorPago, valorGlosa, diferença, status
 */
export async function resumoConciliadosPorGuia(params: {
  estabelecimentoId: number;
  competencia?: string;
  convenioId?: number;
  statusConciliacao?: string;
  busca?: string;
  loteXml?: string;
  loteRetorno?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: any[]; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let whereClause = `WHERE fcg.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia) {
    whereClause += ` AND fcg.competencia LIKE '${params.competencia.replace(/'/g, "''")}%'`;
  }
  if (params.convenioId) {
    whereClause += ` AND fcg.convenioId = ${params.convenioId}`;
  }
  if (params.statusConciliacao && params.statusConciliacao !== 'todos') {
    whereClause += ` AND fcg.statusGuia = '${params.statusConciliacao.replace(/'/g, "''")}'`;
  }
  if (params.busca) {
    const b = params.busca.replace(/'/g, "''");
    whereClause += ` AND (fcg.guia LIKE '%${b}%' OR fcg.pacienteNome LIKE '%${b}%' OR fcg.convenio LIKE '%${b}%')`;
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;

  // Contar total de guias distintas
  const [countRows] = await db.execute(sql.raw(
    `SELECT COUNT(*) as total FROM fato_conciliacao_guias fcg ${whereClause}`
  ));
  const total = Number((countRows as unknown as any[])?.[0]?.total || 0);

  // Buscar guias agregadas instantaneamente
  const query = `
    SELECT 
      fcg.guia,
      fcg.guia as numeroGuia,
      fcg.guia as contaNumero,
      fcg.pacienteNome,
      fcg.convenio,
      fcg.convenioId,
      fcg.competencia,
      'sistema' as origemSistema,
      fcg.totalItens,
      fcg.valorFaturado,
      fcg.valorPago,
      fcg.valorGlosa,
      fcg.diferenca,
      fcg.statusGuia,
      fcg.itensConciliados,
      fcg.itensDivergentes,
      fcg.itensNaoRecebidos,
      fcg.itensTerceiros,
      fcg.itensGlosados,
      0 as itensAgrupados,
      1 as totalContas,
      '' as codigoPrestadorExecutante
    FROM fato_conciliacao_guias fcg
    ${whereClause}
    ORDER BY ABS(fcg.diferenca) DESC, fcg.guia
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [rows] = await db.execute(sql.raw(query));
  const items = rows as any[];

  // ENRIQUECIMENTO: Buscar lotes e protocolos apenas para a página atual (muito mais rápido que fazer JOIN na query principal inteira)
  if (items.length > 0) {
    const guias = items.map(i => i.numeroGuia).filter(Boolean);
    const contas = items.map(i => i.contaNumero).filter(Boolean);
    
    // Buscar Lote XML de faturamento_unificado
    if (guias.length > 0 || contas.length > 0) {
      let fuWhere = `estabelecimentoId = ${params.estabelecimentoId}`;
      let orConditions = [];
      if (guias.length > 0) orConditions.push(`numeroGuia IN (${guias.map(g => `'${g.replace(/'/g, "''")}'`).join(',')})`);
      if (contas.length > 0) orConditions.push(`contaNumero IN (${contas.map(c => `'${c.replace(/'/g, "''")}'`).join(',')})`);
      fuWhere += ` AND (${orConditions.join(' OR ')})`;

      const [fuRows] = await db.execute(sql.raw(`
        SELECT COALESCE(numeroGuia, contaNumero) as chave, MAX(lotePrestador) as loteXml, MAX(protocolo) as protocoloXml
        FROM faturamento_unificado
        WHERE ${fuWhere} AND lotePrestador IS NOT NULL
        GROUP BY COALESCE(numeroGuia, contaNumero)
      `));
      
      const fuMap = new Map();
      for (const row of fuRows as any[]) {
        fuMap.set(String(row.chave), row);
      }
      
      for (const item of items) {
        const chave = String(item.guia);
        const match = fuMap.get(chave);
        if (match) {
          item.loteXml = match.loteXml;
          item.protocoloXml = match.protocoloXml;
        } else {
          item.loteXml = null;
          item.protocoloXml = null;
        }
      }
    }

    // Buscar Lote Retorno de demonstrativo
    if (guias.length > 0) {
      const [demRows] = await db.execute(sql.raw(`
        SELECT numero_guia as guia, MAX(lote_prestador) as loteRetorno, MAX(protocolo) as protocoloRetorno
        FROM demonstrativo
        WHERE estabelecimentoId = ${params.estabelecimentoId}
          AND numero_guia IN (${guias.map(g => `'${g.replace(/'/g, "''")}'`).join(',')})
        GROUP BY numero_guia
      `));
      
      const demMap = new Map();
      for (const row of demRows as any[]) {
        demMap.set(String(row.guia), row);
      }
      
      for (const item of items) {
        const chave = String(item.numeroGuia);
        const match = demMap.get(chave);
        if (match) {
          item.loteRetorno = match.loteRetorno;
          item.protocoloRetorno = match.protocoloRetorno;
        } else {
          item.loteRetorno = item.loteRetorno || null;
          item.protocoloRetorno = item.protocoloRetorno || null;
        }
      }
    }
  }

  return { items, total };
}

/**
 * Itens detalhados de uma guia na conciliados_automatico
 */
export async function itensConciliadosPorGuia(params: {
  estabelecimentoId: number;
  numeroGuia?: string;
  contaNumero?: string;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let whereClause = `WHERE ca.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.numeroGuia && params.contaNumero && params.numeroGuia === params.contaNumero) {
    // When both are the same (from fato_conciliacao_guias), match either field
    const guiaEsc = params.numeroGuia.replace(/'/g, "''");
    whereClause += ` AND (ca.numeroGuia = '${guiaEsc}' OR ca.contaNumero = '${guiaEsc}')`;
  } else {
    if (params.numeroGuia) {
      whereClause += ` AND ca.numeroGuia = '${params.numeroGuia.replace(/'/g, "''")}'`;
    }
    if (params.contaNumero) {
      whereClause += ` AND ca.contaNumero = '${params.contaNumero.replace(/'/g, "''")}'`;
    }
  }

  const query = `
    SELECT 
      ca.id, ca.faturamentoUnificadoId, ca.contaNumero, ca.numeroGuia,
      ca.pacienteNome, ca.convenio, ca.convenioId, ca.competencia,
      ca.codigoItem, ca.codigoItemTuss,
      COALESCE(ca.descricaoItem, fu.descricaoItem) as descricaoItem,
      COALESCE(ca.tipoItem, fu.tipoItem) as tipoItem,
      ca.origemSistema,
      COALESCE(ca.dataExecucao, fu.dataExecucao) as dataExecucao,
      COALESCE(ca.valorFaturado, 0) as valorFaturado,
      COALESCE(ca.quantidade, 0) as quantidade,
      ca.recebimentoId, ca.recebimentoOrigem,
      COALESCE(ca.valorPago, 0) as valorPago,
      COALESCE(ca.valorGlosa, 0) as valorGlosa,
      ca.codigoGlosa,
      COALESCE(mg.descricao, ca.motivoGlosa) as motivoGlosa,
      mg.grupo as grupoGlosa,
      ca.statusConciliacao, ca.metodoConciliacao,
      COALESCE(ca.diferenca, 0) as diferenca,
      COALESCE(ca.percentualDiferenca, 0) as percentualDiferenca,
      ca.toleranciaUsada, ca.criadoEm
    FROM conciliados_automatico ca
    LEFT JOIN faturamento_unificado fu ON ca.faturamentoUnificadoId = fu.id
    LEFT JOIN motivosGlosa mg ON ca.codigoGlosa = mg.codigo AND mg.ativo = 'sim'
    ${whereClause}
    ORDER BY ca.codigoItem, ca.id
  `;

  const [rows] = await db.execute(sql.raw(query));
  return rows as unknown as any[];
}

// ============================================================
// GLOSAR ITENS NÃO RECEBIDOS
// ============================================================

/**
 * Glosar itens individuais da conciliados_automatico
 * Muda o status de 'nao_recebido' ou 'divergente' para 'glosado' e preenche valorGlosa
 */
export async function glosarItens(params: {
  ids: number[];
  estabelecimentoId: number;
  motivoGlosa?: string;
  codigoGlosa?: string;
}): Promise<{ atualizados: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  if (params.ids.length === 0) return { atualizados: 0 };

  const esc = (v: string | null | undefined) => v ? `'${v.replace(/'/g, "''")}' ` : 'NULL';
  const ids = params.ids.join(',');

  const query = `
    UPDATE conciliados_automatico 
    SET statusConciliacao = 'glosado',
        valorGlosa = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN valorFaturado - valorPago ELSE valorFaturado END,
        valorPago = CASE WHEN statusConciliacao = 'divergente' THEN valorPago ELSE 0 END,
        diferenca = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN valorFaturado - valorPago ELSE valorFaturado END,
        percentualDiferenca = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN ROUND(((valorFaturado - valorPago) / valorFaturado) * 100, 2) ELSE 100 END,
        motivoGlosa = ${esc(params.motivoGlosa)},
        codigoGlosa = ${esc(params.codigoGlosa)}
    WHERE id IN (${ids})
      AND estabelecimentoId = ${params.estabelecimentoId}
      AND statusConciliacao IN ('nao_recebido', 'divergente')
  `;

  const [result] = await db.execute(sql.raw(query));
  const atualizados = (result as any)?.affectedRows || 0;
  return { atualizados: Number(atualizados) };
}

/**
 * Glosar TODOS os itens não recebidos e divergentes de uma guia
 */
export async function glosarTodosNaoRecebidosPorGuia(params: {
  estabelecimentoId: number;
  numeroGuia?: string;
  contaNumero?: string;
  motivoGlosa?: string;
  codigoGlosa?: string;
}): Promise<{ atualizados: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const esc = (v: string | null | undefined) => v ? `'${v.replace(/'/g, "''")}' ` : 'NULL';

  let whereClause = `WHERE estabelecimentoId = ${params.estabelecimentoId} AND statusConciliacao IN ('nao_recebido', 'divergente')`;
  if (params.numeroGuia) {
    whereClause += ` AND numeroGuia = ${esc(params.numeroGuia)}`;
  }
  if (params.contaNumero) {
    whereClause += ` AND contaNumero = ${esc(params.contaNumero)}`;
  }

  const query = `
    UPDATE conciliados_automatico 
    SET statusConciliacao = 'glosado',
        valorGlosa = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN valorFaturado - valorPago ELSE valorFaturado END,
        valorPago = CASE WHEN statusConciliacao = 'divergente' THEN valorPago ELSE 0 END,
        diferenca = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN valorFaturado - valorPago ELSE valorFaturado END,
        percentualDiferenca = CASE WHEN valorFaturado > 0 AND valorPago > 0 AND valorPago < valorFaturado THEN ROUND(((valorFaturado - valorPago) / valorFaturado) * 100, 2) ELSE 100 END,
        motivoGlosa = ${esc(params.motivoGlosa)},
        codigoGlosa = ${esc(params.codigoGlosa)}
    ${whereClause}
  `;

  const [result] = await db.execute(sql.raw(query));
  const atualizados = (result as any)?.affectedRows || 0;
  return { atualizados: Number(atualizados) };
}

/**
 * Reverter glosa de itens (voltar para status anterior - nao_recebido ou divergente)
 */
export async function reverterGlosa(params: {
  ids: number[];
  estabelecimentoId: number;
}): Promise<{ atualizados: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  if (params.ids.length === 0) return { atualizados: 0 };

  const ids = params.ids.join(',');

  // Reverter: se o item tinha valorPago > 0, volta para 'divergente'; senão volta para 'nao_recebido'
  const query = `
    UPDATE conciliados_automatico 
    SET statusConciliacao = CASE WHEN valorPago > 0 THEN 'divergente' ELSE 'nao_recebido' END,
        valorGlosa = 0,
        diferenca = CASE WHEN valorPago > 0 THEN valorFaturado - valorPago ELSE 0 END,
        percentualDiferenca = CASE WHEN valorPago > 0 AND valorFaturado > 0 THEN ROUND(((valorFaturado - valorPago) / valorFaturado) * 100, 2) ELSE 0 END,
        motivoGlosa = NULL,
        codigoGlosa = NULL
    WHERE id IN (${ids})
      AND estabelecimentoId = ${params.estabelecimentoId}
      AND statusConciliacao = 'glosado'
  `;

  const [result] = await db.execute(sql.raw(query));
  const atualizados = (result as any)?.affectedRows || 0;
  return { atualizados: Number(atualizados) };
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

/**
 * Normaliza nome para comparação (remove acentos, lowercase, trim)
 */
function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove zeros à esquerda para comparação de códigos
 */
function normalizarCodigo(codigo: string | null | undefined): string {
  if (!codigo) return '';
  const limpo = String(codigo).trim().replace(/^0+/, '');
  return limpo === '' && String(codigo).trim().length > 0 ? '0' : limpo;
}


/**
 * Encontra o melhor match entre uma lista de recebimentos candidatos.
 * Prioriza recebimentos com valor mais próximo do faturado.
 */
function encontrarMelhorMatch(
  candidatos: any[] | undefined,
  valorFaturado: number
): any | null {
  if (!candidatos || candidatos.length === 0) return null;

  // Filtrar candidatos com saldo > 0.01
  const disponiveis = candidatos.filter(c => c.saldoPago > 0.01);
  if (disponiveis.length === 0) return null;

  // Se só tem um, retorna ele
  if (disponiveis.length === 1) return disponiveis[0];

  // Priorizar por proximidade de valor/saldo
  let melhor = disponiveis[0];
  let menorDiferenca = Math.abs(valorFaturado - melhor.saldoPago);

  for (let i = 1; i < disponiveis.length; i++) {
    const diff = Math.abs(valorFaturado - disponiveis[i].saldoPago);
    if (diff < menorDiferenca) {
      menorDiferenca = diff;
      melhor = disponiveis[i];
    }
  }

  return melhor;
}

// ============================================================
// VINCULAÇÃO MANUAL DE ITENS
// ============================================================

/**
 * Lista sobras (itens do demonstrativo que não foram conciliados) para uma guia
 */
export async function listarSobrasPorGuia(params: {
  estabelecimentoId: number;
  numeroGuia: string;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  console.log('--- listarSobrasPorGuia CHAMADO ---', params);

  const query = `
    SELECT re.id, re.numero_guia as numeroGuia, re.item as codigoItem, 
           re.item_desc as descricaoItem, re.valor_pagamento as valorPago, 
           re.valor_informado as valorInformado, re.quantidade, re.situacao_item as situacao
    FROM recebimentos_excel re
    LEFT JOIN conciliados_automatico ca ON ca.recebimentoId = re.id
    WHERE re.numero_guia = '${params.numeroGuia.replace(/'/g, "''")}' 
      AND re.estabelecimentoId = ${params.estabelecimentoId}
      AND ca.id IS NULL
    ORDER BY CAST(re.valor_pagamento AS DECIMAL(10,2)) DESC
  `;

  console.log('Query executada:', query);
  const [rows] = await db.execute(sql.raw(query));
  console.log('Resultados sobras:', (rows as any[]).length);
  return rows as unknown as any[];
}

/**
 * Vincular manualmente um item da conciliados_automatico a um item de recebimentos_excel
 */
export async function vincularItemManual(params: {
  estabelecimentoId: number;
  conciliadoId: number;
  recebimentoId: number;
  criarRegraDePara?: boolean;
}): Promise<{ sucesso: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  // 1. Buscar detalhes do item conciliado e do recebimento
  const [concRows] = await db.execute(sql.raw(`SELECT * FROM conciliados_automatico WHERE id = ${params.conciliadoId} AND estabelecimentoId = ${params.estabelecimentoId}`));
  const conc = (concRows as any[])[0];
  if (!conc) throw new Error("Item conciliado não encontrado");

  const [recRows] = await db.execute(sql.raw(`SELECT * FROM recebimentos_excel WHERE id = ${params.recebimentoId} AND estabelecimentoId = ${params.estabelecimentoId}`));
  const rec = (recRows as any[])[0];
  if (!rec) throw new Error("Item recebimento não encontrado");

  // 2. Calcular novos valores
  const valorFaturado = Number(conc.valorFaturado) || 0;
  const valorRecebido = Math.min(valorFaturado, Number(rec.valor_pagamento) || 0);
  const diferenca = valorFaturado - valorRecebido;
  const pctDif = valorFaturado > 0 ? (diferenca / valorFaturado) * 100 : 0;
  
  // Status
  const novoStatus = pctDif <= 1 ? 'conciliado' : 'divergente';

  // 3. Atualizar conciliados_automatico
  await db.execute(sql.raw(`
    UPDATE conciliados_automatico
    SET recebimentoId = ${rec.id},
        recebimentoOrigem = 'excel',
        valorPago = ${valorRecebido},
        valorGlosa = CASE WHEN ${diferenca} > 0 THEN ${diferenca} ELSE 0 END,
        diferenca = ${diferenca},
        percentualDiferenca = ${pctDif},
        statusConciliacao = '${novoStatus}',
        metodoConciliacao = 'manual',
        codigoGlosa = NULL,
        motivoGlosa = NULL,
        pacienteNome = COALESCE(pacienteNome, '${(rec.nome_beneficiario || '').replace(/'/g, "''")}')
    WHERE id = ${conc.id}
  `));

  // 4. Criar regra De-Para se solicitado
  if (params.criarRegraDePara && conc.convenioId && conc.codigoItem && rec.item) {
    const codHosp = conc.codigoItem;
    const codConv = rec.item;
    
    const [exist] = await db.execute(sql.raw(`
      SELECT id FROM vinculacao_codigos 
      WHERE estabelecimentoId = ${params.estabelecimentoId} 
        AND convenioId = ${conc.convenioId} 
        AND codigoHospital = '${codHosp}'
    `));
    
    if (!(exist as any[])[0]) {
      await db.execute(sql.raw(`
        INSERT INTO vinculacao_codigos (estabelecimentoId, convenioId, codigoHospital, codigoConvenio, ativo)
        VALUES (${params.estabelecimentoId}, ${conc.convenioId}, '${codHosp}', '${codConv}', 'sim')
      `));
    } else {
      await db.execute(sql.raw(`
        UPDATE vinculacao_codigos 
        SET codigoConvenio = '${codConv}', ativo = 'sim'
        WHERE estabelecimentoId = ${params.estabelecimentoId} 
          AND convenioId = ${conc.convenioId} 
          AND codigoHospital = '${codHosp}'
      `));
    }
  }

  return { sucesso: true };
}


// ============================================================
// LOTES DISPONÍVEIS PARA FILTROS
// ============================================================

/**
 * Lista lotes do demonstrativo (lote_prestador) para filtro na conciliação cruzada
 */
export async function lotesRetornoDisponiveis(params: {
  estabelecimentoId: number;
  competencia?: string;
  convenioId?: number;
}): Promise<{ lote: string; protocolo: string; total: number }[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  let where = `WHERE d.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia && params.competencia !== 'todos') {
    // Usar range de datas em vez de DATE_FORMAT para aproveitar índice
    const [ano, mes] = params.competencia.split(/[\/\-]/);
    if (ano && mes) {
      const dataInicio = `${ano}-${mes.padStart(2, '0')}-01`;
      const proxMes = Number(mes) === 12 ? `${Number(ano) + 1}-01-01` : `${ano}-${(Number(mes) + 1).toString().padStart(2, '0')}-01`;
      where += ` AND d.data_referencia >= '${dataInicio}' AND d.data_referencia < '${proxMes}'`;
    }
  }
  if (params.convenioId) {
    where += ` AND d.convenio_id = ${params.convenioId}`;
  }

  const [rows] = await db.execute(sql.raw(
    `SELECT d.lote_prestador as lote, MAX(d.protocolo) as protocolo, COUNT(*) as total
     FROM demonstrativo d
     ${where}
     AND d.lote_prestador IS NOT NULL AND d.lote_prestador != ''
     GROUP BY d.lote_prestador
     ORDER BY d.lote_prestador DESC
     LIMIT 200`
  ));
  return (rows as unknown as any[]).filter((r: any) => r.lote);
}

/**
 * Lista lotes do XML TISS (numero_lote) para filtro na conciliação cruzada
 */
export async function lotesXmlTissDisponiveis(params: {
  estabelecimentoId: number;
  competencia?: string;
  convenioId?: number;
}): Promise<{ lote: string; total: number }[]> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  // Buscar lotes direto do faturamento_unificado usando lotePrestador
  // que já tem índice por estabelecimentoId
  let where = `WHERE fu.estabelecimentoId = ${params.estabelecimentoId}`;
  if (params.competencia && params.competencia !== 'todos') {
    where += ` AND fu.competencia = '${params.competencia.replace(/'/g, "''")}'`;
  }
  if (params.convenioId) {
    where += ` AND fu.convenioId = ${params.convenioId}`;
  }

  const [rows] = await db.execute(sql.raw(
    `SELECT fu.lotePrestador as lote, COUNT(*) as total
     FROM faturamento_unificado fu
     ${where}
     AND fu.lotePrestador IS NOT NULL AND fu.lotePrestador != ''
     GROUP BY fu.lotePrestador
     ORDER BY fu.lotePrestador DESC
     LIMIT 200`
  ));
  return (rows as unknown as any[]).filter((r: any) => r.lote);
}


// ============================================================
// POPULAÇÃO A PARTIR DOS NOVOS STAGINGS (Robôs ETL a definir)
// ============================================================

export async function popularDeOmni(estabelecimentoId: number, competencia?: string) {
  // TODO: Implementar mapeamento DE-PARA da staging_faturamento_omni para faturamento_unificado
  console.log('ETL: Omni -> Unificado (Não implementado)');
  return { inseridos: 0, total: 0 };
}

export async function popularDePromedico(estabelecimentoId: number, competencia?: string) {
  // TODO: Implementar mapeamento DE-PARA da staging_faturamento_promedico para faturamento_unificado
  console.log('ETL: Promedico -> Unificado (Não implementado)');
  return { inseridos: 0, total: 0 };
}

export async function popularDeEasyvision(estabelecimentoId: number, competencia?: string) {
  // TODO: Implementar mapeamento DE-PARA da staging_faturamento_easyvision para faturamento_unificado
  console.log('ETL: Easyvision -> Unificado (Não implementado)');
  return { inseridos: 0, total: 0 };
}
