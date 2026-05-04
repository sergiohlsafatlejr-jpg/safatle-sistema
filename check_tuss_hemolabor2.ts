import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Verificar se o problema está no fato de CD_ITEM ser NULL nos itens sem TUSS
  // O filtro na importação exige CD_ITEM IS NOT NULL AND TRIM(CD_ITEM) != ''
  const [filtroImpact] = await db.execute(sql.raw(`
    SELECT 
      COUNT(*) as totalComCdItem,
      SUM(CASE WHEN CD_ITEM_TUSS IS NOT NULL AND TRIM(CD_ITEM_TUSS) != '' THEN 1 ELSE 0 END) as comTuss,
      SUM(CASE WHEN CD_ITEM_TUSS IS NULL OR TRIM(CD_ITEM_TUSS) = '' THEN 1 ELSE 0 END) as semTuss
    FROM tasy_faturado_itens_bi 
    WHERE estabelecimentoId = 6
      AND CD_ITEM IS NOT NULL AND TRIM(CD_ITEM) != ''
  `));
  console.log("\n=== tasy_faturado_itens_bi COM CD_ITEM preenchido (filtro usado na importação) ===");
  console.log("Total:", (filtroImpact as any)[0]?.totalComCdItem);
  console.log("Com TUSS:", (filtroImpact as any)[0]?.comTuss);
  console.log("Sem TUSS:", (filtroImpact as any)[0]?.semTuss);

  // Verificar na faturamento_unificado - amostra de itens COM codigoItemTuss
  const [amostraFU] = await db.execute(sql.raw(`
    SELECT codigoItem, codigoItemTuss, descricaoItem, tipoItem, competencia
    FROM faturamento_unificado 
    WHERE estabelecimentoId = 6
      AND origemSistema = 'TASY_BI'
      AND codigoItemTuss IS NOT NULL AND TRIM(codigoItemTuss) != ''
    LIMIT 10
  `));
  console.log("\n=== FU: Amostra com codigoItemTuss ===");
  console.table(amostraFU);

  // Verificar competências na faturamento_unificado
  const [compFU] = await db.execute(sql.raw(`
    SELECT competencia, COUNT(*) as total,
      SUM(CASE WHEN codigoItemTuss IS NOT NULL AND TRIM(codigoItemTuss) != '' THEN 1 ELSE 0 END) as comTuss
    FROM faturamento_unificado 
    WHERE estabelecimentoId = 6 AND origemSistema = 'TASY_BI'
    GROUP BY competencia
    ORDER BY competencia DESC
    LIMIT 10
  `));
  console.log("\n=== FU: Competências ===");
  console.table(compFU);

  // Itens no BI com CD_ITEM_TUSS preenchido mas CD_ITEM null (estes NÃO entram na importação)
  const [tussSemCdItem] = await db.execute(sql.raw(`
    SELECT COUNT(*) as total
    FROM tasy_faturado_itens_bi 
    WHERE estabelecimentoId = 6
      AND CD_ITEM_TUSS IS NOT NULL AND TRIM(CD_ITEM_TUSS) != ''
      AND (CD_ITEM IS NULL OR TRIM(CD_ITEM) = '')
  `));
  console.log("\n=== Itens com TUSS mas SEM CD_ITEM (excluídos da importação) ===");
  console.log("Total:", (tussSemCdItem as any)[0]?.total);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
