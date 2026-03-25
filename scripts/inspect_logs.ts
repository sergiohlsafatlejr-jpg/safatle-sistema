import { getDb } from "../server/db";
import { sincronizacaoLog } from "../drizzle/schema-integracao";
import { desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) process.exit(1);

  const logs = await db.select().from(sincronizacaoLog).orderBy(desc(sincronizacaoLog.id)).limit(20);
  for (const l of logs) {
    console.log(`[${l.status}] (${l.sistema}) IDs(Config: ${l.configuracaoId}) -> Sync: ${l.registrosSincronizados} | Errs: ${l.registrosErro}`);
    if (l.mensagemErro || l.detalhesErro) {
      console.log(`   MSG: ${l.mensagemErro} | DET: ${l.detalhesErro}`);
    }
  }
  process.exit(0);
}

main();
