import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No db");

  console.log("=== Analisando guia 66162579 ===");

  const [totalCa] = await db.execute(sql.raw(`
    SELECT COUNT(*) as qtd
    FROM conciliados_automatico
    WHERE numeroGuia = '66162579' AND estabelecimentoId = 6
  `));
  console.log("Total em conciliados_automatico:", totalCa);

  const [totalFu] = await db.execute(sql.raw(`
    SELECT COUNT(*) as qtd
    FROM faturamento_unificado
    WHERE numeroGuia = '66162579' AND estabelecimentoId = 6
  `));
  console.log("Total em faturamento_unificado:", totalFu);

  const [nullFuId] = await db.execute(sql.raw(`
    SELECT COUNT(*) as qtd
    FROM conciliados_automatico
    WHERE numeroGuia = '66162579' AND estabelecimentoId = 6 AND faturamentoUnificadoId IS NULL
  `));
  console.log("Total com faturamentoUnificadoId IS NULL em conciliados_automatico:", nullFuId);

  const [caIds] = await db.execute(sql.raw(`
    SELECT faturamentoUnificadoId, COUNT(*) as qtd
    FROM conciliados_automatico
    WHERE numeroGuia = '66162579' AND estabelecimentoId = 6
    GROUP BY faturamentoUnificadoId
    ORDER BY qtd DESC
    LIMIT 5
  `));
  console.log("Top faturamentoUnificadoId repetidos em conciliados_automatico:", caIds);

  process.exit(0);
}

main();
