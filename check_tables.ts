import "dotenv/config";
import { getDb } from "./server/db.js";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  const [res] = await db.execute(sql`SHOW TABLES LIKE "%tasy_faturado%"`);
  console.log("Found tables:", res);
  process.exit(0);
}
run();
