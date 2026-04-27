import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No db");

  console.log("=== Investigando duplicidade de itens ===");

  // 1. Procurar guias com mais itens em conciliados_automatico
  console.log("\nTop guias por quantidade de itens em conciliados_automatico (estabelecimento 6):");
  const [topGuias] = await db.execute(sql.raw(`
    SELECT numeroGuia, COUNT(*) as qtd_itens
    FROM conciliados_automatico
    WHERE estabelecimentoId = 6 AND numeroGuia IS NOT NULL AND numeroGuia != ''
    GROUP BY numeroGuia
    ORDER BY qtd_itens DESC
    LIMIT 5
  `));
  console.log(topGuias);

  if ((topGuias as any[]).length > 0) {
    const guiaAlvo = (topGuias as any[])[0].numeroGuia;
    
    console.log(`\nExemplo de itens para a guia ${guiaAlvo} em conciliados_automatico:`);
    const [itens] = await db.execute(sql.raw(`
      SELECT id, faturamentoUnificadoId, numeroGuia, codigoItem, descricaoItem, quantidade, valorFaturado, valorPago, recebimentoId
      FROM conciliados_automatico
      WHERE numeroGuia = '${guiaAlvo}' AND estabelecimentoId = 6
      ORDER BY codigoItem
      LIMIT 10
    `));
    console.log(itens);

    console.log(`\nItens correspondentes em faturamento_unificado para a guia ${guiaAlvo}:`);
    const [itensFu] = await db.execute(sql.raw(`
      SELECT id, numeroGuia, codigoItem, descricaoItem, quantidade, valorFaturado
      FROM faturamento_unificado
      WHERE numeroGuia = '${guiaAlvo}' AND estabelecimentoId = 6
      ORDER BY codigoItem
      LIMIT 10
    `));
    console.log(itensFu);
    
    console.log(`\nVerificando se faturamentoUnificadoId está duplicado em conciliados_automatico:`);
    const [dupFuId] = await db.execute(sql.raw(`
      SELECT faturamentoUnificadoId, COUNT(*) as qtd
      FROM conciliados_automatico
      WHERE estabelecimentoId = 6 AND numeroGuia = '${guiaAlvo}'
      GROUP BY faturamentoUnificadoId
      HAVING qtd > 1
      LIMIT 5
    `));
    console.log(dupFuId);
  }

  process.exit(0);
}

main();
