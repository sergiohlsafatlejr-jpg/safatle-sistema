import { getDb } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const db = await getDb();
    if (!db) throw new Error("No DB");
    
    await db.update(users).set({ role: 'admin' }).where(eq(users.email, 'sergiohlsafatlejr@gmail.com'));
    console.log("User updated to admin!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
