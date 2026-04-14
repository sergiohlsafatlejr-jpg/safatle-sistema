import 'dotenv/config';
import { getDb } from './server/db.js';
import { sql } from 'drizzle-orm';

const db = await getDb();
if (!db) { console.log("DB null"); process.exit(1); }

const r = await db.execute(sql`
  SELECT DT_MESANO_REFERENCIA, COUNT(*) as qtd
  FROM tasy_protocolo_bi 
  WHERE estabelecimentoId = 2 AND DT_MESANO_REFERENCIA LIKE '%/%'
  GROUP BY DT_MESANO_REFERENCIA
  LIMIT 5
`);
console.log("=== '/' em DT_MESANO_REFERENCIA ===");
console.log(JSON.stringify((r as any)[0] || r, null, 2));

const r2 = await db.execute(sql`
  SELECT VENC_TITULO, COUNT(*) as qtd
  FROM tasy_protocolo_bi 
  WHERE estabelecimentoId = 2 AND VENC_TITULO LIKE '%/%'
  GROUP BY VENC_TITULO
  LIMIT 5
`);
console.log("\n=== '/' em VENC_TITULO ===");
console.log(JSON.stringify((r2 as any)[0] || r2, null, 2));

process.exit(0);
