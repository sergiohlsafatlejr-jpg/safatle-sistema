import mysql from 'mysql2/promise';
import https from 'https';
import { parseExcel } from './server/parsers.ts';

async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Buscar arquivo
    const [arquivos] = await conn.execute('SELECT * FROM arquivos WHERE id = 390268');
    const arquivo = arquivos[0];
    
    if (!arquivo) {
      console.log('Arquivo não encontrado');
      return;
    }
    
    console.log('Arquivo encontrado:', arquivo.nome);
    console.log('S3 URL:', arquivo.s3Url);
    console.log('Tipo:', arquivo.tipoArquivo);
    
    // Atualizar status para processando
    await conn.execute('UPDATE arquivos SET status = "processando", progresso = 0, itensProcessados = 0 WHERE id = 390268');
    console.log('Status atualizado para processando');
    
    // Baixar arquivo do S3
    console.log('Baixando arquivo do S3...');
    const buffer = await downloadFile(arquivo.s3Url);
    console.log('Arquivo baixado:', buffer.length, 'bytes');
    
    // Processar o arquivo Excel
    console.log('Processando arquivo Excel...');
    const parseResult = await parseExcel(buffer, arquivo.direcao);
    
    if (parseResult.success && parseResult.procedimentos) {
      console.log('Procedimentos extraídos:', parseResult.procedimentos.length);
      
      // Deletar procedimentos existentes
      await conn.execute('DELETE FROM procedimentos WHERE arquivoId = 390268');
      console.log('Procedimentos antigos deletados');
      
      // Inserir novos procedimentos em batches
      const batchSize = 1000;
      let inserted = 0;
      
      for (let i = 0; i < parseResult.procedimentos.length; i += batchSize) {
        const batch = parseResult.procedimentos.slice(i, i + batchSize);
        
        for (const proc of batch) {
          await conn.execute(
            `INSERT INTO procedimentos (arquivoId, guiaNumero, pacienteNome, codigo, descricao, quantidade, valorUnitario, valorTotal, dataExecucao, comportamento, codigoDespesa, tipoLancamento, nomeMedico, crm, protocoloTISS, numeroLote, sequencialTransacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              390268,
              proc.guiaNumero || null,
              proc.pacienteNome || null,
              proc.codigo || null,
              proc.descricao || null,
              proc.quantidade || 1,
              proc.valorUnitario || 0,
              proc.valorTotal || 0,
              proc.dataExecucao || null,
              proc.comportamento || null,
              proc.codigoDespesa || null,
              proc.tipoLancamento || null,
              proc.nomeMedico || null,
              proc.crm || null,
              proc.protocoloTISS || null,
              proc.numeroLote || null,
              proc.sequencialTransacao || null
            ]
          );
        }
        
        inserted += batch.length;
        const progresso = Math.round((inserted / parseResult.procedimentos.length) * 100);
        await conn.execute('UPDATE arquivos SET progresso = ?, itensProcessados = ? WHERE id = 390268', [progresso, inserted]);
        console.log(`Progresso: ${progresso}% (${inserted}/${parseResult.procedimentos.length})`);
      }
      
      // Atualizar status final
      await conn.execute('UPDATE arquivos SET status = "processado", progresso = 100 WHERE id = 390268');
      console.log('Processamento concluído com sucesso!');
    } else {
      console.error('Erro ao processar:', parseResult.error);
      await conn.execute('UPDATE arquivos SET status = "erro" WHERE id = 390268');
    }
  } catch (error) {
    console.error('Erro:', error);
    await conn.execute('UPDATE arquivos SET status = "erro" WHERE id = 390268');
  } finally {
    await conn.end();
  }
}

main();
