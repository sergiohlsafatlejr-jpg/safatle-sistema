import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("Limpando a tabela tasy_faturado_itens_bi...");
    await conn.query("TRUNCATE TABLE tasy_faturado_itens_bi");
    console.log("Tabela tasy_faturado_itens_bi limpa com sucesso!");
  } catch(e: any) {
    console.error("ERRO MYSQL:", e.message);
  }
  
  conn.end();
  process.exit(0);
}
run();
