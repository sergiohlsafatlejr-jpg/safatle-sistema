import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) return;

  const res = await db.execute(sql`SELECT SUM(CAST(NULLIF(TRIM(REPLACE(A_RECEBER, ',', '.')), '') AS DECIMAL(15,2))) as total_a_receber FROM tasy_faturado_itens_bi WHERE A_RECEBER IS NOT NULL AND A_RECEBER != '0'`);
  console.log("Total A_RECEBER DB:", res[0]);

  process.exit(0);
}
run();
