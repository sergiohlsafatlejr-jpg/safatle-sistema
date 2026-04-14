import 'dotenv/config';
import { getDb } from './server/db.js';
import { sql } from 'drizzle-orm';

const db = await getDb();
if (!db) { console.log("DB null"); process.exit(1); }

const r = await db.execute(sql`SHOW CREATE TABLE tasy_protocolo_bi`);
console.log(JSON.stringify((r as any)[0] || r, null, 2));

process.exit(0);
