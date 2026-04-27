import 'dotenv/config';
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("DB null"); process.exit(1); }

  // Check sample of VL_PRODUZIDO values
  const [sample] = await db.execute(sql.raw(`
    SELECT CD_ITEM, DESCRICAO, VL_PRODUZIDO, QTD, TIPO_ITEM
    FROM tasy_faturado_itens_bi 
    WHERE estabelecimentoId = 6
    AND VL_PRODUZIDO IS NOT NULL AND VL_PRODUZIDO != '' AND VL_PRODUZIDO != '0'
    LIMIT 10
  `));
  console.log("Sample with values:", JSON.stringify(sample, null, 2));

  // Check how many have zero/null VL_PRODUZIDO
  const [stats] = await db.execute(sql.raw(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN VL_PRODUZIDO IS NULL OR VL_PRODUZIDO = '' OR VL_PRODUZIDO = '0' THEN 1 ELSE 0 END) as zero_vals,
      SUM(CASE WHEN VL_PRODUZIDO IS NOT NULL AND VL_PRODUZIDO != '' AND VL_PRODUZIDO != '0' THEN 1 ELSE 0 END) as has_vals
    FROM tasy_faturado_itens_bi 
    WHERE estabelecimentoId = 6
  `));
  console.log("\nStats:", JSON.stringify(stats));

  // Check padroesCobranca values
  const [padroes] = await db.execute(sql.raw(`
    SELECT codigoProcedimentoPrincipal, descricaoProcedimentoPrincipal, 
           valorMedioConta, valorMinConta, valorMaxConta, totalOcorrencias, confianca
    FROM padroesCobranca 
    WHERE estabelecimentoId = 6
    ORDER BY totalOcorrencias DESC
    LIMIT 5
  `));
  console.log("\nTop padroes:", JSON.stringify(padroes, null, 2));

  process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
