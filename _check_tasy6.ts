import 'dotenv/config';
import { getDb } from './server/db.js';
import { sql } from 'drizzle-orm';
import { createTRPCCaller } from './server/routers.js'; // hypothetical or we just call the logic

const db = await getDb();
if (!db) process.exit(1);

const rows = await db.execute(sql.raw(
  `SELECT DS_CONVENIO, DT_MESANO_REFERENCIA, VL_PROTOCOLO, VENC_TITULO, STATUS_PROTOCOLO, NR_SEQ_PROTOCOLO
    FROM tasy_protocolo_bi WHERE estabelecimentoId = 2 LIMIT 10`
)) as any;
const dados = (rows[0] || []) as any[];

const mapRef = new Map<string, { mes: string; valor: number; qtd: number }>();
const mapVenc = new Map<string, { mes: string; valor: number; qtd: number }>();

for (const r of dados) {
  const dtRef = r.DT_MESANO_REFERENCIA ? String(r.DT_MESANO_REFERENCIA).substring(0, 7) : null;
  const dtVenc = r.VENC_TITULO ? String(r.VENC_TITULO).substring(0, 7) : null;
  
  if (dtRef) {
    if (!mapRef.has(dtRef)) mapRef.set(dtRef, { mes: dtRef, valor: 0, qtd: 0 });
    mapRef.get(dtRef)!.qtd++;
  }
}

console.log("=== SAIDA TIPO TRPC ===");
console.log(Array.from(mapRef.values()));

process.exit(0);
