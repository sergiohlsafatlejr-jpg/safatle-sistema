import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [rows] = await conn.query("SELECT * FROM query_configuracoes WHERE id = 103") as any;
    console.log(rows[0].conexaoConfig);
    
    // Pega as tabelas dinamicas no sistema
    const [tables] = await conn.query("SHOW TABLES LIKE '%bi%'");
    console.log(tables);
  } catch(e: any) {
    console.error("Erro:", e.message);
  }
  conn.end();
}
run();
