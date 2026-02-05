/**
 * Módulo de sincronização automática da tabela demonstrativo
 * 
 * Este módulo é responsável por popular a tabela demonstrativo com a união
 * dos dados de recebimentos_excel e recebimento_tiss após cada importação.
 */

import { getDb } from './db';
import { demonstrativo, recebimentosExcel, recebimentoTiss } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import type { InsertDemonstrativo } from '../drizzle/schema';

/**
 * Sincroniza os dados de um arquivo específico para a tabela demonstrativo
 * Chamado automaticamente após cada importação de arquivo de retorno
 */
export async function syncDemonstrativoByArquivo(
  arquivoId: number,
  origemTipo: 'excel' | 'xml'
): Promise<{ success: boolean; total: number; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, total: 0, error: 'Database not available' };
  }

  try {
    console.log(`[SyncDemonstrativo] Iniciando sincronização para arquivo ${arquivoId} (${origemTipo})`);

    // Primeiro, excluir registros existentes deste arquivo na tabela demonstrativo
    await db.delete(demonstrativo).where(eq(demonstrativo.arquivoId, arquivoId));
    console.log(`[SyncDemonstrativo] Registros antigos excluídos para arquivo ${arquivoId}`);

    let records: InsertDemonstrativo[] = [];

    if (origemTipo === 'excel') {
      // Buscar dados de recebimentos_excel
      const excelData = await db
        .select()
        .from(recebimentosExcel)
        .where(eq(recebimentosExcel.arquivoId, arquivoId));

      console.log(`[SyncDemonstrativo] Encontrados ${excelData.length} registros em recebimentos_excel`);

      // Mapear para formato demonstrativo
      records = excelData.map((item: any) => ({
        arquivoId: item.arquivoId,
        origemTipo: 'excel' as const,
        convenioId: item.convenioId,
        estabelecimentoId: item.estabelecimentoId,
        
        // Identificação
        numeroGuia: item.numeroGuia,
        protocolo: item.protocoloTiss,
        lotePrestador: item.lotePrestador,
        dataPagamento: item.dataPagto || item.dataPagamentoUpload || item.dataPagamento,
        
        // Beneficiário
        carteiraBeneficiario: item.beneficiario,
        nomeBeneficiario: item.nomeBeneficiario,
        
        // Detalhes do Item
        sequencialItem: item.seq,
        codigoItem: item.item,
        descricaoItem: item.itemDesc,
        dataExecucao: item.dataExecucao,
        quantidade: item.quantidade ? String(item.quantidade) : null,
        
        // Valores
        valorPago: item.valorPagamento,
        
        // Status
        tipoLancamento: item.tipoLancamento,
        erroTiss: item.erroTiss,
        situacaoItem: item.situacaoItem,
        
        // Data de referência
        dataReferencia: item.dataReferencia,
      }));

    } else if (origemTipo === 'xml') {
      // Buscar dados de recebimento_tiss
      const xmlData = await db
        .select()
        .from(recebimentoTiss)
        .where(eq(recebimentoTiss.arquivoId, arquivoId));

      console.log(`[SyncDemonstrativo] Encontrados ${xmlData.length} registros em recebimento_tiss`);

      // Mapear para formato demonstrativo
      records = xmlData.map((item: any) => ({
        arquivoId: item.arquivoId,
        origemTipo: 'xml' as const,
        convenioId: item.convenioId,
        estabelecimentoId: item.estabelecimentoId,
        
        // Identificação
        numeroGuia: item.numeroGuiaPrestador,
        protocolo: item.numeroProtocolo,
        lotePrestador: item.numeroLotePrestador,
        dataPagamento: item.dataPagamento,
        
        // Beneficiário
        carteiraBeneficiario: item.numeroCarteira,
        nomeBeneficiario: item.nomeBeneficiario,
        
        // Detalhes do Item
        sequencialItem: item.sequencialItem ? parseInt(String(item.sequencialItem)) : null,
        codigoItem: item.codigoItem,
        descricaoItem: item.descricaoItem,
        dataExecucao: item.dataRealizacao,
        quantidade: item.quantidadeExecutada,
        
        // Valores
        valorInformado: item.valorInformado,
        valorPago: item.valorLiberado,
        valorGlosa: item.valorGlosado,
        
        // Status
        codigoGlosa: item.codigoGlosa,
        situacaoItem: item.situacaoGuia,
        
        // Data de referência
        dataReferencia: item.dataReferencia,
      }));
    }

    // Inserir registros na tabela demonstrativo em lotes
    if (records.length > 0) {
      const batchSize = 500;
      let totalInserted = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(demonstrativo).values(batch);
        totalInserted += batch.length;
      }

      console.log(`[SyncDemonstrativo] Inseridos ${totalInserted} registros na tabela demonstrativo`);
      return { success: true, total: totalInserted };
    }

    console.log('[SyncDemonstrativo] Nenhum registro para sincronizar');
    return { success: true, total: 0 };

  } catch (error) {
    console.error('[SyncDemonstrativo] Erro na sincronização:', error);
    return { 
      success: false, 
      total: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Sincroniza todos os dados de recebimentos para a tabela demonstrativo
 * Útil para reprocessamento em lote
 */
export async function syncAllDemonstrativo(): Promise<{ success: boolean; totalExcel: number; totalXml: number; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, totalExcel: 0, totalXml: 0, error: 'Database not available' };
  }

  try {
    console.log('[SyncDemonstrativo] Iniciando sincronização completa...');

    // Limpar tabela demonstrativo
    await db.delete(demonstrativo);
    console.log('[SyncDemonstrativo] Tabela demonstrativo limpa');

    // Buscar todos os arquivos únicos de recebimentos_excel
    const excelArquivos = await db
      .selectDistinct({ arquivoId: recebimentosExcel.arquivoId })
      .from(recebimentosExcel);

    let totalExcel = 0;
    for (const { arquivoId } of excelArquivos) {
      if (arquivoId) {
        const result = await syncDemonstrativoByArquivo(arquivoId, 'excel');
        if (result.success) {
          totalExcel += result.total;
        }
      }
    }

    // Buscar todos os arquivos únicos de recebimento_tiss
    const xmlArquivos = await db
      .selectDistinct({ arquivoId: recebimentoTiss.arquivoId })
      .from(recebimentoTiss);

    let totalXml = 0;
    for (const { arquivoId } of xmlArquivos) {
      if (arquivoId) {
        const result = await syncDemonstrativoByArquivo(arquivoId, 'xml');
        if (result.success) {
          totalXml += result.total;
        }
      }
    }

    console.log(`[SyncDemonstrativo] Sincronização completa: ${totalExcel} Excel + ${totalXml} XML`);
    return { success: true, totalExcel, totalXml };

  } catch (error) {
    console.error('[SyncDemonstrativo] Erro na sincronização completa:', error);
    return { 
      success: false, 
      totalExcel: 0, 
      totalXml: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
