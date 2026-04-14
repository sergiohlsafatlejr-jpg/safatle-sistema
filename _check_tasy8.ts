import 'dotenv/config';
import { getDb } from './server/db.js';
import { sql } from 'drizzle-orm';

const db = await getDb();
if (!db) { console.log("DB null"); process.exit(1); }

// Buscar formatos diferentes
const r1 = await db.execute(sql`
  SELECT DT_MESANO_REFERENCIA, VENC_TITULO, estabelecimentoId 
  FROM tasy_protocolo_bi 
  WHERE DT_MESANO_REFERENCIA NOT LIKE '202%' 
  LIMIT 5
`);
console.log("=== DIFERENTE DE 202% ===");
console.log(JSON.stringify((r1 as any)[0] || r1, null, 2));

process.exit(0);
