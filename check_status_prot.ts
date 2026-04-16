import mysql from "mysql2/promise";
async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.query("SELECT STATUS_PROT, COUNT(*) as qtd FROM tasy_faturado_itens_bi GROUP BY STATUS_PROT");
  console.log(rows);
  conn.end();
  process.exit(0);
}
run();
