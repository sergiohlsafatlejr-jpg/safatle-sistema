import 'dotenv/config';
import { getDb } from './server/db.js';
import { sql } from 'drizzle-orm';

const db = await getDb();
if (!db) { console.log("DB null"); process.exit(1); }

try {
  const r = await db.execute(sql`SHOW CREATE TABLE tasy_pagamentos_bi`);
  console.log(JSON.stringify((r as any)[0] || r, null, 2));
} catch (e: any) {
  console.log("Erro ao buscar tasy_pagamentos_bi:", e?.message || e);
}

process.exit(0);
