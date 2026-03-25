import { getDb } from "../server/db";
import { sincronizacaoLog } from "../drizzle/schema-integracao";
import { desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) process.exit(1);

  const logs = await db.select().from(sincronizacaoLog).orderBy(desc(sincronizacaoLog.id)).limit(3);
  for (const l of logs) {
    if (l.status === 'ERRO') {
       console.log(`[ERRO ID ${l.id}] Mensagem de Erro:`);
       console.log(l.mensagemErro);
       console.log(l.detalhesErro);
       console.log('-------------------------');
    }
  }
  process.exit(0);
}

main();
