import 'dotenv/config';
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("DB null"); process.exit(1); }
  const [r] = await db.execute(sql.raw('SHOW CREATE TABLE padroesCobranca'));
  console.log(JSON.stringify((r as any)[0], null, 2));
  
  // Also check how many items exist per estabelecimentoId in tasy_faturado_itens_bi
  const [counts] = await db.execute(sql.raw(`
    SELECT estabelecimentoId, COUNT(*) as total 
    FROM tasy_faturado_itens_bi 
    GROUP BY estabelecimentoId
  `));
  console.log("\n[TasyBI counts per estabelecimento]:");
  console.log(JSON.stringify(counts, null, 2));
  
  process.exit(0);
}
main();
