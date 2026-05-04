import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const ESTAB_ID = 6; // Hemolabor

  // 1. Total de itens na tasy_faturado_itens_bi para Hemolabor
  const [totalBi] = await db.execute(sql.raw(`
    SELECT COUNT(*) as total 
    FROM tasy_faturado_itens_bi 
    WHERE estabelecimentoId = ${ESTAB_ID}
  `));
  console.log("\n=== tasy_faturado_itens_bi (fonte bruta) ===");
  console.log("Total itens:", (totalBi as any)[0]?.total);

  // 2. Quantos têm CD_ITEM_TUSS preenchido vs vazio/null
  const [tussBi] = await db.execute(sql.raw(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN CD_ITEM_TUSS IS NOT NULL AND TRIM(CD_ITEM_TUSS) != '' THEN 1 ELSE 0 END) as comTuss,
      SUM(CASE WHEN CD_ITEM_TUSS IS NULL OR TRIM(CD_ITEM_TUSS) = '' THEN 1 ELSE 0 END) as semTuss
    FROM tasy_faturado_itens_bi 
    WHERE estabelecimentoId = ${ESTAB_ID}
  `));
  console.log("Com CD_ITEM_TUSS:", (tussBi as any)[0]?.comTuss);
  console.log("Sem CD_ITEM_TUSS:", (tussBi as any)[0]?.semTuss);

  // 3. Amostra dos CD_ITEM_TUSS preenchidos (top 20 distintos)
  const [amostraTuss] = await db.execute(sql.raw(`
    SELECT DISTINCT CD_ITEM_TUSS, CD_ITEM, DESCRICAO, TIPO_ITEM
    FROM tasy_faturado_itens_bi 
    WHERE estabelecimentoId = ${ESTAB_ID}
      AND CD_ITEM_TUSS IS NOT NULL AND TRIM(CD_ITEM_TUSS) != ''
    LIMIT 20
  `));
  console.log("\n=== Amostra CD_ITEM_TUSS preenchidos ===");
  console.table(amostraTuss);

  // 4. Amostra dos itens SEM CD_ITEM_TUSS (top 20 distintos)
  const [amostraSemTuss] = await db.execute(sql.raw(`
    SELECT DISTINCT CD_ITEM, DESCRICAO, TIPO_ITEM
    FROM tasy_faturado_itens_bi 
    WHERE estabelecimentoId = ${ESTAB_ID}
      AND (CD_ITEM_TUSS IS NULL OR TRIM(CD_ITEM_TUSS) = '')
    LIMIT 20
  `));
  console.log("\n=== Amostra itens SEM CD_ITEM_TUSS ===");
  console.table(amostraSemTuss);

  // 5. Agora verificar na faturamento_unificado (após importação)
  const [totalFU] = await db.execute(sql.raw(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN codigoItemTuss IS NOT NULL AND TRIM(codigoItemTuss) != '' THEN 1 ELSE 0 END) as comTuss,
      SUM(CASE WHEN codigoItemTuss IS NULL OR TRIM(codigoItemTuss) = '' THEN 1 ELSE 0 END) as semTuss
    FROM faturamento_unificado 
    WHERE estabelecimentoId = ${ESTAB_ID}
      AND origemSistema = 'TASY_BI'
  `));
  console.log("\n=== faturamento_unificado (TASY_BI, estab=6) ===");
  console.log("Total itens:", (totalFU as any)[0]?.total);
  console.log("Com codigoItemTuss:", (totalFU as any)[0]?.comTuss);
  console.log("Sem codigoItemTuss:", (totalFU as any)[0]?.semTuss);

  // 6. Breakdown por tipoItem
  const [byTipo] = await db.execute(sql.raw(`
    SELECT 
      TIPO_ITEM as tipoItem,
      COUNT(*) as total,
      SUM(CASE WHEN CD_ITEM_TUSS IS NOT NULL AND TRIM(CD_ITEM_TUSS) != '' THEN 1 ELSE 0 END) as comTuss,
      SUM(CASE WHEN CD_ITEM_TUSS IS NULL OR TRIM(CD_ITEM_TUSS) = '' THEN 1 ELSE 0 END) as semTuss,
      ROUND(SUM(CASE WHEN CD_ITEM_TUSS IS NOT NULL AND TRIM(CD_ITEM_TUSS) != '' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as percentualPreenchido
    FROM tasy_faturado_itens_bi 
    WHERE estabelecimentoId = ${ESTAB_ID}
    GROUP BY TIPO_ITEM
    ORDER BY total DESC
  `));
  console.log("\n=== Breakdown por TIPO_ITEM ===");
  console.table(byTipo);

  // 7. Comparar CD_ITEM vs CD_ITEM_TUSS - são iguais ou diferentes?
  const [comparacao] = await db.execute(sql.raw(`
    SELECT 
      SUM(CASE WHEN CD_ITEM_TUSS IS NOT NULL AND TRIM(CD_ITEM_TUSS) != '' AND CD_ITEM = CD_ITEM_TUSS THEN 1 ELSE 0 END) as iguais,
      SUM(CASE WHEN CD_ITEM_TUSS IS NOT NULL AND TRIM(CD_ITEM_TUSS) != '' AND CD_ITEM != CD_ITEM_TUSS THEN 1 ELSE 0 END) as diferentes
    FROM tasy_faturado_itens_bi 
    WHERE estabelecimentoId = ${ESTAB_ID}
  `));
  console.log("\n=== CD_ITEM vs CD_ITEM_TUSS (quando TUSS preenchido) ===");
  console.log("Iguais:", (comparacao as any)[0]?.iguais);
  console.log("Diferentes:", (comparacao as any)[0]?.diferentes);

  // 8. Verificar competências mais recentes
  const [compRecentes] = await db.execute(sql.raw(`
    SELECT COMPETENCIA, COUNT(*) as total,
      SUM(CASE WHEN CD_ITEM_TUSS IS NOT NULL AND TRIM(CD_ITEM_TUSS) != '' THEN 1 ELSE 0 END) as comTuss
    FROM tasy_faturado_itens_bi 
    WHERE estabelecimentoId = ${ESTAB_ID}
    GROUP BY COMPETENCIA
    ORDER BY COMPETENCIA DESC
    LIMIT 10
  `));
  console.log("\n=== Competências recentes ===");
  console.table(compRecentes);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
