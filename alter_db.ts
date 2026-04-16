import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const db = await getDb();
    if (!db) throw new Error("No DB");
    
    console.log("Fixing fin_transacoes PK...");
    try {
      await db.execute(sql`ALTER TABLE fin_transacoes ADD PRIMARY KEY (id)`);
    } catch (e: any) {
      if (!e.message.includes("Multiple primary key defined")) {
        console.error("PK add error:", e.message);
      }
    }
    
    await db.execute(sql`ALTER TABLE fin_transacoes MODIFY id int NOT NULL AUTO_INCREMENT`);
    console.log("fin_transacoes auto_increment added!");

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
