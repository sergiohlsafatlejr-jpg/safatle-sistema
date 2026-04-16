import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [rows] = await conn.query("SELECT id, descricao, ultimaSincronizacao, totalRegistrosSincronizados FROM query_configuracoes WHERE id = 103") as any;
    console.log("Config 103:", rows[0]);
  } catch(e: any) {
    console.error("Erro:", e.message);
  }
  conn.end();
}
run();
