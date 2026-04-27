import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("No DB"); return; }

  const estabDistrib = await db.execute(sql`SELECT estabelecimentoId, COUNT(*) as cnt FROM demonstrativo GROUP BY estabelecimentoId`);
  console.log("Demonstrativo distribution:", JSON.stringify(estabDistrib[0]));

  const usersResult = await db.execute(sql`SELECT id, name, role FROM users`);
  console.log("Users:", JSON.stringify(usersResult[0]));

  // Which estabelecimentos does user 2 have permission for?
  const permsUser2 = await db.execute(sql`SELECT estabelecimentoId, podeVisualizar FROM permissoesEstabelecimento WHERE userId = 2 AND podeVisualizar = 'sim'`);
  console.log("User 2 permitted estabs:", JSON.stringify(permsUser2[0]));

  // What estabelecimentoId is selected in the UI? Let's check what "Pronto Socorro Infantil" is
  const estabs = await db.execute(sql`SELECT id, nome FROM estabelecimentos WHERE nome LIKE '%Pronto%' OR id IN (1, 2)`);
  console.log("Estabelecimentos:", JSON.stringify(estabs[0]));
}

main().catch(console.error).then(() => process.exit(0));
