import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No db");
  
  try {
    const q = `SELECT * FROM conciliados_automatico WHERE estabelecimentoId = 6 AND numeroGuia = '19619793' AND codigoItem = '00065390' LIMIT 5`;
    const [rows] = await db.execute(sql.raw(q));
    console.log(rows);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}

main();
