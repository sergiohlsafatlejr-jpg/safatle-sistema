import "dotenv/config";
import mysql from "mysql2/promise";
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.query('SELECT querySql FROM query_configuracoes WHERE sistema="tasy"');
  console.log((rows as any)[0].querySql);
  process.exit(0);
} main();
