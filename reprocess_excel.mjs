import fs from 'fs';

// Simular o processamento que o routers.ts faz
async function main() {
  try {
    const buffer = fs.readFileSync('/home/ubuntu/demo_psi.xlsx');
    console.log('Buffer size:', buffer.length);
    
    // Importar o parser
    const { parseExcelRecebimentosExcel } = await import('./server/recebimentosExcelParser.ts');
    
    const arquivoId = 840001;
    const convenioId = 1;
    const dataReferencia = new Date('2025-12-01T05:00:00.000Z');
    const dataPagamento = new Date('2025-01-30T05:00:00.000Z');
    const estabelecimentoId = 1;
    
    console.log('Parsing Excel...');
    const records = parseExcelRecebimentosExcel(
      buffer,
      arquivoId,
      convenioId,
      dataReferencia,
      dataPagamento,
      estabelecimentoId
    );
    
    console.log('Total records parsed:', records.length);
    
    if (records.length > 0) {
      console.log('\nPrimeiro registro:');
      console.log(JSON.stringify(records[0], null, 2));
      
      console.log('\nSegundo registro:');
      if (records.length > 1) console.log(JSON.stringify(records[1], null, 2));
    }
    
    // Tentar inserir no banco
    console.log('\nTentando inserir no banco...');
    const { insertRecebimentosExcelBatch } = await import('./server/db.ts');
    
    // Inserir em lotes de 500
    const BATCH_SIZE = 500;
    let totalInserted = 0;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      try {
        const count = await insertRecebimentosExcelBatch(batch);
        totalInserted += count;
        console.log(`Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${count} inseridos (total: ${totalInserted})`);
      } catch (batchError) {
        console.error(`Erro no batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError.message);
        console.error('Primeiro registro do batch:', JSON.stringify(batch[0], null, 2));
        break;
      }
    }
    
    console.log('\nTotal inserido:', totalInserted);
    
  } catch (error) {
    console.error('ERRO:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

main();
