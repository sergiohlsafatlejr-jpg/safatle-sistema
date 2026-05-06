import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log("DB offline"); process.exit(1); }

  // Check what estabelecimentoIds exist in tasy_faturado_itens_bi
  const [rows] = await db.execute(sql.raw(
    `SELECT estabelecimentoId, COUNT(*) as total FROM tasy_faturado_itens_bi GROUP BY estabelecimentoId ORDER BY total DESC`
  ));
  console.log("=== Dados na tasy_faturado_itens_bi por estabelecimentoId ===");
  console.log(JSON.stringify(rows, null, 2));

  // Check what establishments exist in the system
  const [estabs] = await db.execute(sql.raw(
    `SELECT id, nome FROM estabelecimentos WHERE ativo = 'sim' ORDER BY id`
  ));
  console.log("\n=== Estabelecimentos ativos ===");
  console.log(JSON.stringify(estabs, null, 2));

  // Also check faturamento_unificado for other establishments
  const [fatRows] = await db.execute(sql.raw(
    `SELECT estabelecimentoId, COUNT(*) as total, SUM(CAST(valorFaturado AS DECIMAL(15,2))) as vlFat, SUM(CAST(valorGlosa AS DECIMAL(15,2))) as vlGlosa FROM faturamento_unificado GROUP BY estabelecimentoId ORDER BY total DESC LIMIT 10`
  ));
  console.log("\n=== Dados na faturamento_unificado por estabelecimentoId ===");
  console.log(JSON.stringify(fatRows, null, 2));

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
