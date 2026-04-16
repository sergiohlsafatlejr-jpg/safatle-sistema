import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [cols]: any = await conn.query("DESCRIBE tasy_faturado_itens_bi");
    console.log(cols);
    const [c] = await conn.query("SELECT * FROM tasy_faturado_itens_bi LIMIT 1");
    console.log("Linha 1:", c);
  } catch(e: any) { console.error(e) }
  conn.end();
}
run();
