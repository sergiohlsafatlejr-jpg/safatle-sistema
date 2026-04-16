import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    const [rows] = await conn.query("SELECT COUNT(*) as count FROM tasy_faturado_itens_bi") as any;
    console.log("Total na tabela:", rows[0].count);
    
    if (rows[0].count > 0) {
      const [meses] = await conn.query(`
        SELECT SUBSTRING(competencia, 1, 7) as mes, COUNT(*) as qtd 
        FROM tasy_faturado_itens_bi 
        GROUP BY SUBSTRING(competencia, 1, 7)
        ORDER BY mes
      `) as any[];
      
      console.log("Por mês (competencia):", meses);
    }

  } catch(e: any) {
    console.error("Erro:", e.message);
  }

  conn.end();
}
run();
