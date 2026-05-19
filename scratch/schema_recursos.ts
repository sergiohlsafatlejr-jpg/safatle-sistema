import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDb();
  
  try {
    const cols = await db.execute(sql`SHOW COLUMNS FROM tasy_faturado_itens_bi`);
    console.log("tasy_faturado_itens_bi cols:", cols[0]);
  } catch(e) {
    console.log("No tasy_faturado_itens_bi");
  }
  
  try {
    const recCols = await db.execute(sql`SHOW COLUMNS FROM recursos_glosa`);
    console.log("recursos_glosa cols:", recCols[0]);
  } catch(e) {
    console.log("No recursos_glosa");
  }
  
  process.exit(0);
}

run();
