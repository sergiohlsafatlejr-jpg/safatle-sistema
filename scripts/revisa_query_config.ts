import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.query("SELECT * FROM query_configuracoes WHERE sistema='tasy'") as any++;
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
main();
