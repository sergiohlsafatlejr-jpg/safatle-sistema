import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const db = await getDb();
    if (!db) throw new Error("No DB");
    
    console.log("Truncating table tasy_faturado_itens_bi...");
    await db.execute(sql`TRUNCATE TABLE tasy_faturado_itens_bi`);
    console.log("Table tasy_faturado_itens_bi truncated successfully!");

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
