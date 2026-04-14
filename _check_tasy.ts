import 'dotenv/config';
import { getDb } from './server/db.js';
import { sql } from 'drizzle-orm';

const db = await getDb();
if (!db) { console.log("DB null"); process.exit(1); }

const r = await db.execute(sql`
  SELECT DT_MESANO_REFERENCIA, VENC_TITULO 
  FROM tasy_protocolo_bi 
  WHERE estabelecimentoId = 2
  LIMIT 10
`);
console.log("=== TASY_PROTOCOLO_BI HEMOLABOR ===");
console.log(JSON.stringify((r as any)[0] || r, null, 2));

const r2 = await db.execute(sql`
  SELECT DT_MESANO_REFERENCIA, VENC_TITULO 
  FROM tasy_protocolo_bi 
  LIMIT 10
`);
console.log("=== TASY_PROTOCOLO_BI GERAL ===");
console.log(JSON.stringify((r2 as any)[0] || r2, null, 2));

process.exit(0);
