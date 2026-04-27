import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) return;
  
  const r = await db.execute(sql`SELECT DISTINCT convenio_id FROM demonstrativo WHERE convenio_id IS NOT NULL LIMIT 10`);
  console.log("convenio_ids:", JSON.stringify(r[0]));
  
  // Also check what the drizzle schema maps convenioId to
  const r2 = await db.execute(sql`SELECT id, convenio_id, arquivo_id, valor_pago FROM demonstrativo WHERE estabelecimentoId = 1 LIMIT 3`);
  console.log("sample rows:", JSON.stringify(r2[0]));
}

main().catch(console.error).then(() => process.exit(0));
