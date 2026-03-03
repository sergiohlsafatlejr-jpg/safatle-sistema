import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

const db = await getDb();
const [rows] = await db.execute(sql.raw('SELECT DISTINCT convenio, convenioId FROM conciliados_automatico LIMIT 20'));
console.log('Convenios na conciliados_automatico:', JSON.stringify(rows, null, 2));

const [convFiltro] = await db.execute(sql.raw("SELECT DISTINCT convenio, convenioId, COUNT(*) as total FROM conciliados_automatico WHERE convenioId IS NOT NULL GROUP BY convenio, convenioId"));
console.log('Convenios com ID:', JSON.stringify(convFiltro, null, 2));

const [compFiltro] = await db.execute(sql.raw("SELECT DISTINCT competencia, COUNT(*) as total FROM conciliados_automatico GROUP BY competencia ORDER BY competencia"));
console.log('Competencias:', JSON.stringify(compFiltro, null, 2));

process.exit(0);
