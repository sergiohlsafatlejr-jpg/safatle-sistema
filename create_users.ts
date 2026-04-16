import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating users table if it doesn't exist...");
  try {
    const db = await getDb();
    if (!db) throw new Error("Could not connect to DB");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`openId\` varchar(255) NOT NULL,
        \`name\` varchar(255),
        \`email\` varchar(255),
        \`loginMethod\` varchar(50),
        \`role\` varchar(50),
        \`passwordHash\` varchar(255),
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` timestamp,
        CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`)
      );
    `);
    
    // Also recreate auditlog just in case, as it's used by bypass
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`auditLog\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`userNome\` varchar(255) NOT NULL,
        \`acao\` varchar(100) NOT NULL,
        \`entidade\` varchar(100) NOT NULL,
        \`entidadeId\` varchar(100),
        \`detalhes\` json,
        \`ipAddress\` varchar(45),
        \`dataAcao\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`auditLog_id\` PRIMARY KEY(\`id\`)
      );
    `);
    
    console.log("Success!");
    process.exit(0);
  } catch (error) {
    console.error("Failed:", error);
    process.exit(1);
  }
}

run();
