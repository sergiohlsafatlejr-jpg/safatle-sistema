import "dotenv/config";
import { getDb } from "./server/db.js";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const db = await getDb();
    if (!db) throw new Error("No DB");
    
    console.log("Deletando as antigas tabelas BI para forcar a recriacao...");
    
    try {
      await db.execute(sql`DROP TABLE IF EXISTS tasy_pagamentos_bi`);
      console.log("Tabela tasy_pagamentos_bi deletada!");
    } catch(e) {
      console.log("Erro ao deletar tasy_pagamentos_bi", e);
    }

    try {
      await db.execute(sql`DROP TABLE IF EXISTS tasy_protocolo_bi`);
      console.log("Tabela tasy_protocolo_bi deletada!");
    } catch(e) {
      console.log("Erro ao deletar tasy_protocolo_bi", e);
    }

    process.exit(0);
  } catch(e) {
    console.error("Erro geral:", e);
    process.exit(1);
  }
}
run();
