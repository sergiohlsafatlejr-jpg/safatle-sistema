import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) return;
  
  // Check convenios table IDs
  const convs = await db.execute(sql`SELECT id, nome_fantasia, razao_social FROM convenios ORDER BY id LIMIT 20`);
  console.log("Convenios:", JSON.stringify(convs[0]));
  
  // Check if convenio_id 1, 60001 etc exist
  const specific = await db.execute(sql`SELECT id, nome_fantasia FROM convenios WHERE id IN (1, 60001, 60004, 30001)`);
  console.log("Specific convenios:", JSON.stringify(specific[0]));
}

main().catch(console.error).then(() => process.exit(0));
