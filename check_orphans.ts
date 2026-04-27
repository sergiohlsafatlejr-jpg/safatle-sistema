import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No db");

  const [orfas] = await db.execute(sql.raw(`
    SELECT ca.id, ca.faturamentoUnificadoId, ca.numeroGuia, ca.contaNumero
    FROM conciliados_automatico ca
    LEFT JOIN faturamento_unificado fu ON ca.faturamentoUnificadoId = fu.id
    WHERE ca.numeroGuia = '66162579' AND ca.estabelecimentoId = 6
    AND fu.id IS NULL
    LIMIT 10
  `));
  console.log("Orphans in conciliados_automatico (have fuId but no record in faturamento_unificado):", orfas);

  const [totalOrfas] = await db.execute(sql.raw(`
    SELECT COUNT(*) as qtd
    FROM conciliados_automatico ca
    LEFT JOIN faturamento_unificado fu ON ca.faturamentoUnificadoId = fu.id
    WHERE ca.numeroGuia = '66162579' AND ca.estabelecimentoId = 6
    AND fu.id IS NULL
  `));
  console.log("Total orphans:", totalOrfas);

  const [allFUs] = await db.execute(sql.raw(`
    SELECT numeroGuia, contaNumero, COUNT(*) as qtd
    FROM faturamento_unificado
    WHERE estabelecimentoId = 6 AND numeroGuia = '66162579'
    GROUP BY numeroGuia, contaNumero
  `));
  console.log("FUs with this numeroGuia:", allFUs);

  process.exit(0);
}

main();
