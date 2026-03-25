import { getDb } from "../server/db";
import { queryConfiguracoes, sincronizacaoLog } from "../drizzle/schema-integracao";
import { desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) process.exit(1);

  console.log("---- LOGS ----");
  const logs = await db.select().from(sincronizacaoLog).orderBy(desc(sincronizacaoLog.id)).limit(5);
  for (const l of logs) {
    console.log(`[${l.status}] CFG ID: ${l.configuracaoId} | Sync: ${l.registrosSincronizados} | ErroDB: ${l.mensagemErro}`);
  }
  
  console.log("\n---- CONFIGS ----");
  const configs = await db.select().from(queryConfiguracoes).orderBy(desc(queryConfiguracoes.id)).limit(2);
  for (const c of configs) {
    console.log(`[CFG ${c.id}] Tipo: ${c.tipoDados} | Conexao: ${c.conexaoConfig ? 'SIM' : 'NAO'}`);
  }

  process.exit(0);
}

main();
