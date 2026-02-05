import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  console.log('=== Ressincronizando tabela demonstrativo ===\n');

  // Limpar tabela demonstrativo
  await connection.execute('DELETE FROM demonstrativo');
  console.log('Tabela demonstrativo limpa');

  // Buscar todos os arquivos de recebimentos_excel
  const [arquivos] = await connection.execute(`
    SELECT DISTINCT arquivo_id FROM recebimentos_excel WHERE arquivo_id IS NOT NULL
  `);
  console.log('Arquivos encontrados:', arquivos.length);

  let totalInseridos = 0;

  for (const { arquivo_id } of arquivos) {
    // Buscar dados do arquivo
    const [items] = await connection.execute(`
      SELECT * FROM recebimentos_excel WHERE arquivo_id = ?
    `, [arquivo_id]);

    if (items.length === 0) continue;

    // Preparar registros para inserção
    const records = items.map(item => {
      // CORREÇÃO: Quando situacaoItem = GLOSADO, o valorPagamento é na verdade o valor glosado
      const situacao = (item.situacao_item || '').toString().toUpperCase();
      const isGlosado = situacao === 'GLOSADO' || situacao.includes('GLOS');
      
      // Se é glosado, o valor vai para valorGlosa e valorPago = 0
      const valorOriginal = item.valor_pagamento;
      const valorPago = isGlosado ? '0' : valorOriginal;
      const valorGlosa = isGlosado ? valorOriginal : null;

      return [
        item.arquivo_id,
        'excel',
        item.convenio_id,
        item.estabelecimento_id,
        item.numero_guia,
        item.protocolo_tiss,
        item.lote_prestador,
        item.data_pagto || item.data_pagamento_upload || item.data_pagamento,
        item.beneficiario,
        item.nome_beneficiario,
        item.seq,
        item.item,
        item.item_desc,
        item.data_execucao,
        item.quantidade,
        valorPago,
        valorGlosa,
        item.tipo_lancamento,
        item.erro_tiss,
        item.situacao_item,
        item.data_referencia
      ];
    });

    // Inserir em lotes
    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values = batch.flat();
      
      await connection.execute(`
        INSERT INTO demonstrativo (
          arquivo_id, origem_tipo, convenio_id, estabelecimento_id,
          numero_guia, protocolo, lote_prestador, data_pagamento,
          carteira_beneficiario, nome_beneficiario,
          sequencial_item, codigo_item, descricao_item, data_execucao, quantidade,
          valor_pago, valor_glosa,
          tipo_lancamento, erro_tiss, situacao_item, data_referencia
        ) VALUES ${placeholders}
      `, values);
      
      totalInseridos += batch.length;
    }
    
    console.log(`Arquivo ${arquivo_id}: ${items.length} registros inseridos`);
  }

  console.log('\nTotal de registros inseridos:', totalInseridos);

  // Verificar resultado
  const [verificacao] = await connection.execute(`
    SELECT 
      estabelecimento_id,
      COUNT(*) as total,
      SUM(CASE WHEN UPPER(situacao_item) = 'GLOSADO' THEN 1 ELSE 0 END) as glosados,
      SUM(COALESCE(CAST(valor_pago AS DECIMAL(15,2)), 0)) as total_pago,
      SUM(COALESCE(CAST(valor_glosa AS DECIMAL(15,2)), 0)) as total_glosa
    FROM demonstrativo
    WHERE convenio_id = 1
    GROUP BY estabelecimento_id
  `);

  console.log('\nResumo após ressincronização (Unimed):');
  for (const r of verificacao) {
    console.log('  Estabelecimento ' + r.estabelecimento_id + ':');
    console.log('    Total: ' + r.total + ', Glosados: ' + r.glosados);
    console.log('    Valor Pago: R$ ' + parseFloat(r.total_pago).toFixed(2));
    console.log('    Valor Glosa: R$ ' + parseFloat(r.total_glosa).toFixed(2));
  }

  await connection.end();
  console.log('\n=== Ressincronização concluída ===');
}

main().catch(console.error);
