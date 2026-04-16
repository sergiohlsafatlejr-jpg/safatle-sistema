import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const db = await getDb();
    if (!db) throw new Error("No DB");
    
    // Ler a configuracao atual
    const [configs]: any = await db.execute(sql`SELECT conexaoConfig FROM query_configuracoes WHERE id = 103`);
    if (configs.length > 0) {
      let conexao = configs[0].conexaoConfig;
      if (typeof conexao === "string") conexao = JSON.parse(conexao);
      
      conexao.tabelaDestinoBi = "tasy_faturado_itens_bi";
      
      const novaStr = JSON.stringify(conexao);
      await db.execute(sql`UPDATE query_configuracoes SET conexaoConfig = ${novaStr} WHERE id = 103`);
      console.log("Config 103 vinculada à tabela tasy_faturado_itens_bi!");
    } else {
      console.log("Config 103 nao achada");
    }

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
