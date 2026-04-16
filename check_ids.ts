import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.query("SELECT id, COUNT(*) as c FROM fin_transacoes GROUP BY id ORDER BY c DESC LIMIT 10") as any;
  console.log(rows);
  conn.end();
}
run();
