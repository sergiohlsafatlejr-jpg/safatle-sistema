import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) return;
  
  const r = await db.execute(sql`DESCRIBE convenios`);
  console.log("Convenios columns:", JSON.stringify(r[0]));
  
  const r2 = await db.execute(sql`SELECT * FROM convenios LIMIT 3`);
  console.log("Sample convenios:", JSON.stringify(r2[0]));
}

main().catch(console.error).then(() => process.exit(0));
