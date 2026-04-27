import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No db");

  const guiaAlvo = '19619793';
  const estabelecimentoId = 6;

  console.log(`=== Analisando guia ${guiaAlvo} ===\n`);

  console.log("1. Resumo em faturamento_unificado (O que o sistema acha que foi faturado):");
  const [resumoFu] = await db.execute(sql.raw(`
    SELECT COUNT(*) as qtd_itens, SUM(valorFaturado) as total_faturado
    FROM faturamento_unificado
    WHERE numeroGuia = '${guiaAlvo}' AND estabelecimentoId = ${estabelecimentoId}
  `));
  console.log(resumoFu);

  console.log("\n2. Resumo em recebimentos_excel (O que veio do demonstrativo):");
  const [resumoRec] = await db.execute(sql.raw(`
    SELECT COUNT(*) as qtd_itens, SUM(valor_pagamento) as total_pago, SUM(valor_glosa) as total_glosa, SUM(valor_informado) as total_informado
    FROM recebimentos_excel
    WHERE numero_guia = '${guiaAlvo}' AND estabelecimentoId = ${estabelecimentoId}
  `));
  console.log(resumoRec);

  console.log("\n3. Itens do recebimento (demonstrativo) que NÃO acharam par no faturamento:");
  // Se o valor pago é maior no demonstrativo, significa que há itens no demonstrativo que sobraram após a conciliação
  // Como o motor de conciliação tenta casar, vamos ver o que sobrou no banco
  const [sobras] = await db.execute(sql.raw(`
    SELECT item, item_desc, valor_pagamento, valor_glosa, valor_informado, situacao_item
    FROM recebimentos_excel
    WHERE numero_guia = '${guiaAlvo}' AND estabelecimentoId = ${estabelecimentoId}
    ORDER BY valor_pagamento DESC
    LIMIT 10
  `));
  console.log("Amostra do demonstrativo:");
  console.log(sobras);

  console.log("\n4. Amostra do faturamento:");
  const [amostraFu] = await db.execute(sql.raw(`
    SELECT codigoItem, descricaoItem, valorFaturado
    FROM faturamento_unificado
    WHERE numeroGuia = '${guiaAlvo}' AND estabelecimentoId = ${estabelecimentoId}
    ORDER BY valorFaturado DESC
    LIMIT 10
  `));
  console.log(amostraFu);

  process.exit(0);
}

main();
