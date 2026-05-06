import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) return;

  const estabs = await db.execute(sql`SELECT id, nome FROM estabelecimentos WHERE nome LIKE '%Hemo%'`);
  console.log("Estabs:", estabs[0]);

  process.exit(0);
}
run();
