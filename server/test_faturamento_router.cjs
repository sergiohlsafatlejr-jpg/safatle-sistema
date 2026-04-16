const { getDb } = require('./db');
const { sql } = require('drizzle-orm');
async function run() {
  const db = await getDb();
  const rows = await db.execute(sql.raw(`SELECT * FROM tasy_faturado_itens_bi WHERE estabelecimentoId = 6 LIMIT 5`));
  console.log('IsArray:', Array.isArray(rows));
  console.log('Length:', rows.length);
  if(Array.isArray(rows) && rows.length > 0) {
      console.log('rows[0] is array?', Array.isArray(rows[0]));
      console.log('rows[0] keys:', Object.keys(rows[0]));
  }
  process.exit(0);
}
run();
