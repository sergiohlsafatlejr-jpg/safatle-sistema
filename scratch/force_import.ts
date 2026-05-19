import * as XLSX from 'xlsx';
import fs from 'fs';
import { parseRhFolhaExcel } from '../server/rhFolhaParser';
import { getDb } from '../server/db';
import { rhFolhaPagamento } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const filePath = 'C:/Users/sergi/Downloads/safatle - folha pagamento 2026.xlsx';
  try {
    const buf = fs.readFileSync(filePath);
    const records = parseRhFolhaExcel(buf, 1800186, 2160001, '2026-05');
    console.log('Total records parsed:', records.length);
    
    const db = await getDb();
    
    // Deleta os antigos desse arquivo
    await db.delete(rhFolhaPagamento).where(eq(rhFolhaPagamento.arquivoId, 1800186));
    console.log('Antigos deletados.');
    
    const batchSize = 100;
    let totalInserted = 0;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await db.insert(rhFolhaPagamento).values(batch);
      totalInserted += batch.length;
    }
    console.log('Total inseridos no banco:', totalInserted);
    
    process.exit(0);
  } catch (e) {
    console.log('Error:', e);
    process.exit(1);
  }
}

main();
