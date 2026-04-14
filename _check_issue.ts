import 'dotenv/config';
import { getDb } from './server/db.js';
import { sql } from 'drizzle-orm';

const db = await getDb();
if (!db) { console.log("DB null"); process.exit(1); }

// Verificar as contas Unimed de março no resumo
const r1 = await db.execute(sql`
  SELECT id, numeroConta, convenio, totalItens, valorTotal, competencia, statusAnalise
  FROM contas_convenio_resumo
  WHERE estabelecimentoId = 3 AND competencia = '2026/03' AND convenio = 'Unimed'
  ORDER BY numeroConta
`);
console.log("=== RESUMOS UNIMED MARÇO ===");
for (const row of ((r1 as any)[0] || r1)) {
  console.log(`  #${row.numeroConta}: ${row.totalItens} itens, R$ ${row.valorTotal}, status: ${row.statusAnalise}`);
}

// Verificar se os itens dessa conta 68646871 existem
const r2 = await db.execute(sql`
  SELECT COUNT(*) as total, SUM(CAST(valorTotal AS DECIMAL(14,2))) as soma
  FROM contas_convenio_itens 
  WHERE numeroConta = '68646871' AND estabelecimentoId = 3
`);
console.log("\n=== ITENS CONTA 68646871 ===");
console.log(JSON.stringify((r2 as any)[0] || r2, null, 2));

// Verificar se existem resumos duplicados
const r3 = await db.execute(sql`
  SELECT numeroConta, COUNT(*) as duplicatas
  FROM contas_convenio_resumo
  WHERE estabelecimentoId = 3 AND competencia = '2026/03'
  GROUP BY numeroConta
  HAVING COUNT(*) > 1
`);
console.log("\n=== RESUMOS DUPLICADOS ===");
console.log(JSON.stringify((r3 as any)[0] || r3, null, 2));

// Checar a query usada no frontend - como filtra por mês?
const r4 = await db.execute(sql`
  SELECT competencia, COUNT(*) as total
  FROM contas_convenio_resumo
  WHERE estabelecimentoId = 3
  GROUP BY competencia
  ORDER BY competencia DESC
  LIMIT 10
`);
console.log("\n=== RESUMOS POR COMPETÊNCIA ===");
console.log(JSON.stringify((r4 as any)[0] || r4, null, 2));

process.exit(0);
