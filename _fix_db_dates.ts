import 'dotenv/config';
import { getDb } from './server/db.js';
import { sql } from 'drizzle-orm';

const db = await getDb();
if (!db) { console.log("DB null"); process.exit(1); }

const monthMap: Record<string, string> = {
  'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
  'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
};

async function fixColumnPattern(column: string) {
  const rs = await db.execute(sql.raw(`
    SELECT id, ${column} 
    FROM tasy_protocolo_bi 
    WHERE ${column} LIKE '%-%-%' AND length(${column}) < 15
  `)) as any;
  const rows = (rs[0] || []) as any[];
  
  console.log(`Encontrados ${rows.length} registros para corrigir em ${column}`);
  
  let fixes = 0;
  for (const r of rows) {
    const s = r[column];
    const m = s.match(/^(\d{2})-([a-zA-Z]{3})-(\d{2,4})/);
    if (m) {
      const mon = m[2].toUpperCase();
      let yy = m[3];
      const dd = m[1];
      if (yy.length === 2) {
        yy = parseInt(yy) > 50 ? `19${yy}` : `20${yy}`;
      }
      const mm = monthMap[mon] || '01';
      const novoformato = `${yy}-${mm}-${dd} 00:00:00`;
      
      await db.execute(sql.raw(`
        UPDATE tasy_protocolo_bi 
        SET ${column} = '${novoformato}' 
        WHERE id = ${r.id}
      `));
      fixes++;
    }
  }
  console.log(`Corrigidos ${fixes} registros em ${column}`);
}

await fixColumnPattern('DT_MESANO_REFERENCIA');
await fixColumnPattern('VENC_TITULO');

process.exit(0);
