import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import "dotenv/config";
import fs from "fs";

async function run() {
  let connection;
  try {
    console.log("Starting migration...");
    connection = await mysql.createConnection({
      uri: process.env.DATABASE_URL
    });
    
    const db = drizzle(connection);
    
    console.log("Applying migrations from ./drizzle folder...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    
    console.log("Migrations applied successfully!");
    await connection.end();
  } catch (error) {
    if (connection) await connection.end();
    console.error("Migration failed!");
    fs.writeFileSync('migration_error.txt', error.toString() + "\n" + (error.query || error.sql || JSON.stringify(error, Object.getOwnPropertyNames(error))));
    process.exit(1);
  }
}

run();
