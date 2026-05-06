import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) return;

  const res = await db.execute(sql`
    SELECT 
      SUM(CAST(NULLIF(TRIM(REPLACE(VL_AMAIOR, ',', '.')), '') AS DECIMAL(15,2))) as a_maior
    FROM tasy_faturado_itens_bi
    WHERE CONVENIO = 'Ipasgo' AND COMPETENCIA = '2026/02'
  `);
  console.log("Ipasgo 2026/02 A_MAIOR:", res[0]);

  process.exit(0);
}
run();
