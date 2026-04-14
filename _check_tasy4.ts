import 'dotenv/config';
import { getDb } from './server/db.js';
import { sql } from 'drizzle-orm';

const db = await getDb();
if (!db) { console.log("DB null"); process.exit(1); }

const rows = await db.execute(sql.raw(
  `SELECT DS_CONVENIO, DT_MESANO_REFERENCIA, VL_PROTOCOLO, VENC_TITULO, STATUS_PROTOCOLO, NR_SEQ_PROTOCOLO
   FROM tasy_protocolo_bi WHERE estabelecimentoId = 2 LIMIT 3`
)) as any;
const dados = (rows[0] || []) as any[];

console.log("=== RAW DATA TYPE & VAL ===");
for (const r of dados) {
  console.log({
    DT_MESANO_REFERENCIA: {
      type: typeof r.DT_MESANO_REFERENCIA,
      constructor: r.DT_MESANO_REFERENCIA?.constructor?.name,
      val: r.DT_MESANO_REFERENCIA,
      stringSub: r.DT_MESANO_REFERENCIA ? String(r.DT_MESANO_REFERENCIA).substring(0, 7) : null
    },
    VENC_TITULO: {
      type: typeof r.VENC_TITULO,
      constructor: r.VENC_TITULO?.constructor?.name,
      val: r.VENC_TITULO,
      stringSub: r.VENC_TITULO ? String(r.VENC_TITULO).substring(0, 7) : null
    }
  });
}

process.exit(0);
