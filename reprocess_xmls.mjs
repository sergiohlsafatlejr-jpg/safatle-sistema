import { parseXmlRecebimentoTiss } from './server/recebimentoTissParser.ts';
import { syncDemonstrativoByArquivo } from './server/syncDemonstrativo.ts';
import * as db from './server/db.ts';
import { arquivos, recebimentoTiss, demonstrativo } from './drizzle/schema.ts';
import { eq, inArray, sql, count } from 'drizzle-orm';

// IDs dos XMLs retornados que faltam em recebimento_tiss
const missingIds = [870002, 870003, 870004, 870005, 870006, 870008, 870009, 870010, 870011];

async function main() {
  const database = await db.getDb();
  if (!database) {
    console.error('Database not available');
    process.exit(1);
  }

  // Buscar todos os arquivos de uma vez
  const arqs = await database.select().from(arquivos).where(inArray(arquivos.id, missingIds));
  console.log(`Encontrados ${arqs.length} arquivos para reprocessar`);

  for (const arquivo of arqs) {
    console.log(`\n=== Processando arquivo ${arquivo.id} (${arquivo.nome}) ===`);
    console.log(`Convênio: ${arquivo.convenioId}, Estab: ${arquivo.estabelecimentoId}`);
    
    try {
      // Baixar o XML do S3
      const resp = await fetch(arquivo.s3Url);
      if (!resp.ok) {
        console.error(`Erro ao baixar: ${resp.status}`);
        continue;
      }
      const buffer = Buffer.from(await resp.arrayBuffer());
      console.log(`Baixado: ${(buffer.length / 1024).toFixed(1)} KB`);
      
      // Parsear o XML
      const result = await parseXmlRecebimentoTiss(
        buffer,
        arquivo.id,
        arquivo.estabelecimentoId,
        arquivo.convenioId,
        arquivo.dataReferencia
      );
      
      if (!result.success) {
        console.error(`Erro no parser: ${result.error}`);
        continue;
      }
      
      console.log(`Parser retornou ${result.items.length} itens`);
      
      if (result.items.length === 0) {
        console.log('Nenhum item para inserir');
        continue;
      }
      
      // Limpar dados antigos
      await database.delete(recebimentoTiss).where(eq(recebimentoTiss.arquivoId, arquivo.id));
      await database.delete(demonstrativo).where(eq(demonstrativo.arquivoId, arquivo.id));
      
      // Truncar campos que podem exceder o limite
      for (const item of result.items) {
        if (item.descricaoItem && item.descricaoItem.length > 255) {
          item.descricaoItem = item.descricaoItem.substring(0, 255);
        }
        if (item.nomeOperadora && item.nomeOperadora.length > 150) {
          item.nomeOperadora = item.nomeOperadora.substring(0, 150);
        }
        if (item.nomeBeneficiario && item.nomeBeneficiario.length > 150) {
          item.nomeBeneficiario = item.nomeBeneficiario.substring(0, 150);
        }
        if (item.nomeContratado && item.nomeContratado.length > 70) {
          item.nomeContratado = item.nomeContratado.substring(0, 70);
        }
        if (item.codigoGlosa && item.codigoGlosa.length > 20) {
          item.codigoGlosa = item.codigoGlosa.substring(0, 20);
        }
        if (item.numeroDemonstrativo && item.numeroDemonstrativo.length > 50) {
          item.numeroDemonstrativo = item.numeroDemonstrativo.substring(0, 50);
        }
      }
      
      // Inserir em recebimento_tiss
      try {
        const totalInserted = await db.insertRecebimentoTiss(result.items);
        console.log(`Inseridos ${totalInserted} itens em recebimento_tiss`);
      } catch (insertError) {
        console.error(`Erro ao inserir em recebimento_tiss:`, insertError.message);
        // Tentar inserir um por um para encontrar o item problemático
        let inserted = 0;
        for (let i = 0; i < result.items.length; i++) {
          try {
            await db.insertRecebimentoTiss([result.items[i]]);
            inserted++;
          } catch (e) {
            console.error(`  Item ${i} falhou: ${e.message}`);
            const item = result.items[i];
            console.error(`  guia=${item.numeroGuiaPrestador}, code=${item.codigoItem}, desc=${item.descricaoItem?.substring(0,50)}, glosa=${item.codigoGlosa}`);
          }
        }
        console.log(`Inseridos ${inserted}/${result.items.length} itens individualmente`);
      }
      
      // Sincronizar com demonstrativo
      const syncResult = await syncDemonstrativoByArquivo(arquivo.id, 'xml');
      if (syncResult.success) {
        console.log(`Demonstrativo sincronizado: ${syncResult.total} itens`);
      } else {
        console.error(`Erro no sync demonstrativo: ${syncResult.error}`);
      }
      
    } catch (error) {
      console.error(`Erro geral no arquivo ${arquivo.id}:`, error.message);
    }
  }
  
  console.log('\n=== Resumo final ===');
  const [rtCount] = await database.select({ cnt: count() }).from(recebimentoTiss);
  const [demoCount] = await database.select({ cnt: count() }).from(demonstrativo);
  console.log(`recebimento_tiss: ${rtCount.cnt}, demonstrativo: ${demoCount.cnt}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
