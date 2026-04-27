import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No db");

  const guiaAlvo = '66162579';

  console.log(`\nContando itens totais para a guia ${guiaAlvo} em faturamento_unificado:`);
  const [totalFu] = await db.execute(sql.raw(`
    SELECT COUNT(*) as qtd
    FROM faturamento_unificado
    WHERE numeroGuia = '${guiaAlvo}' AND estabelecimentoId = 6
  `));
  console.log(totalFu);

  console.log(`\nVerificando se há repetição exata do mesmo item na mesma fatura:`);
  const [dupFu] = await db.execute(sql.raw(`
    SELECT codigoItem, quantidade, valorFaturado, dataExecucao, COUNT(*) as qtd
    FROM faturamento_unificado
    WHERE numeroGuia = '${guiaAlvo}' AND estabelecimentoId = 6
    GROUP BY codigoItem, quantidade, valorFaturado, dataExecucao
    HAVING qtd > 1
    ORDER BY qtd DESC
    LIMIT 10
  `));
  console.log(dupFu);

  // Verificando a importação do XML/TASY
  console.log(`\nTop origens para esses itens:`);
  const [origens] = await db.execute(sql.raw(`
    SELECT origemSistema, lote, COUNT(*) as qtd
    FROM faturamento_unificado
    WHERE numeroGuia = '${guiaAlvo}' AND estabelecimentoId = 6
    GROUP BY origemSistema, lote
  `));
  console.log(origens);

  process.exit(0);
}

main();
