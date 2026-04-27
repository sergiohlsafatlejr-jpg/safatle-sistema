import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No db");

  const guiaAlvo = '19619793';
  const estabelecimentoId = 6;

  console.log(`=== Análise Detalhada Conciliação Guia ${guiaAlvo} ===\n`);

  const [conc] = await db.execute(sql.raw(`
    SELECT codigoItem, descricaoItem, valorFaturado, valorPago, diferenca, statusConciliacao, metodoConciliacao
    FROM conciliados_automatico
    WHERE numeroGuia = '${guiaAlvo}' AND estabelecimentoId = ${estabelecimentoId}
    ORDER BY valorFaturado DESC
  `));
  
  console.table(conc);

  process.exit(0);
}

main();
