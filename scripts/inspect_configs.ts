import { getDb } from "../server/db";
import { queryConfiguracoes, sincronizacaoLog } from "../drizzle/schema-integracao";
import { desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No DB connection");
    process.exit(1);
  }

  const logs = await db.select().from(sincronizacaoLog).orderBy(desc(sincronizacaoLog.id)).limit(10);
  console.log("======= RECENT LOGS =======");
  for (const l of logs) {
    console.log(`[${l.status}] Config: ${l.configuracaoId} | Sinc: ${l.registrosSincronizados} | Err: ${l.registrosErro} | Msg: ${l.mensagemErro}`);
  }

  const configs = await db.select().from(queryConfiguracoes).orderBy(desc(queryConfiguracoes.id)).limit(5);
  console.log("\n======= RECENT CONFIGS =======");
  for (const c of configs) {
    console.log(`ID: ${c.id} | Sist: ${c.sistema} | Tipo: ${c.tipoDados} | Desc: ${c.descricao}`);
  }

  process.exit(0);
}

main();
