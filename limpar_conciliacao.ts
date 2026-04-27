import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function clearAll() {
  const db = await getDb();
  if(!db) throw new Error("Sem db");

  console.log('Limpando conciliados_automatico...');
  await db.execute(sql.raw('TRUNCATE TABLE conciliados_automatico;'));
  
  console.log('Limpando fato_conciliacao_guias...');
  await db.execute(sql.raw('TRUNCATE TABLE fato_conciliacao_guias;'));
  
  console.log('Resetando statusConciliacao em faturamento_unificado...');
  await db.execute(sql.raw('UPDATE faturamento_unificado SET statusConciliacao = \'pendente\' WHERE statusConciliacao != \'pendente\';'));
  
  console.log('Limpeza concluida com sucesso!');
  process.exit(0);
}
clearAll().catch(console.error);
