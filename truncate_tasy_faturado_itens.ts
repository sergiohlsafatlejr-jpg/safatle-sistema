import "dotenv/config";
import { getDb } from "./server/db.js";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const db = await getDb();
    if (!db) throw new Error("No DB");
    
    console.log("Limpando a tabela tasy_faturado_itens_bi...");
    await db.execute(sql`TRUNCATE TABLE tasy_faturado_itens_bi`);
    console.log("Tabela tasy_faturado_itens_bi limpa com sucesso!");

    process.exit(0);
  } catch(e) {
    console.error("Erro ao limpar a tabela:", e);
    process.exit(1);
  }
}
run();
