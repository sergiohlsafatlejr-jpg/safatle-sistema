import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    const [logs]: any = await conn.query("SELECT * FROM sincronizacao_log ORDER BY id DESC LIMIT 5");
    console.log(logs);
  } catch(e: any) {
    console.error("Erro:", e.message);
  }

  conn.end();
}
run();
