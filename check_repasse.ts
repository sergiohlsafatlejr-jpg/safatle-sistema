import "dotenv/config";
import { getDb } from "./server/db";
import { demonstrativo, permissoesEstabelecimento, users } from "./drizzle/schema";
import { sql, eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("No DB"); return; }

  // 1. Which estabelecimentoIds exist in demonstrativo?
  const estabDistrib = await db.execute(sql`SELECT estabelecimentoId, COUNT(*) as cnt FROM demonstrativo GROUP BY estabelecimentoId`);
  console.log("=== Demonstrativo by estabelecimentoId ===");
  console.log(JSON.stringify(estabDistrib[0], null, 2));

  // 2. All users and their permissions
  const allUsers = await db.select({ id: users.id, name: users.name, role: users.role }).from(users);
  console.log("\n=== Users ===");
  console.log(JSON.stringify(allUsers, null, 2));

  // 3. Permissions
  const perms = await db.select().from(permissoesEstabelecimento);
  console.log("\n=== Permissions ===");
  console.log(JSON.stringify(perms, null, 2));

  // 4. Sample demonstrativo rows
  const sample = await db.execute(sql`SELECT id, estabelecimentoId, convenio_id, valor_informado, valor_pago, valor_glosa, descricao_item FROM demonstrativo LIMIT 5`);
  console.log("\n=== Sample demonstrativo rows ===");
  console.log(JSON.stringify(sample[0], null, 2));
}

main().catch(console.error).then(() => process.exit(0));
