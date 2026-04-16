import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    const [rows] = await conn.query("SELECT COUNT(*) as count FROM tasy_faturado_itens_bi") as any;
    console.log("Total na tabela tasy_faturado_itens_bi:", rows[0].count);
    
    // Check if other BI tables exist
    const [tables] = await conn.query("SHOW TABLES LIKE '%bi%'") as any;
    console.log(tables);
  } catch(e: any) {
    console.error("Erro:", e.message);
  }

  conn.end();
}
run();
