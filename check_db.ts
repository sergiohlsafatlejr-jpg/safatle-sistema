import { getDb } from "./server/db";
import { estabelecimentos, users } from "./drizzle/schema";

async function check() {
  try {
    const db = await getDb();
    if (!db) throw new Error("No DB");
    
    const est = await db.select().from(estabelecimentos);
    console.log("Estabelecimentos:", est.map(e => e.nome));
    
    const us = await db.select().from(users);
    console.log("Usuarios:", us.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role })));
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
check();
