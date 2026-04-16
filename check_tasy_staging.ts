import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    const [configs] = await conn.query("SELECT * FROM query_configuracoes WHERE sistema = 'tasy' OR tipoDados LIKE '%faturamento%'") as any;
    console.log("Configs:", configs.map((c: any) => ({
      id: c.id, 
      desc: c.descricao, 
      sistema: c.sistema,
      tipo: c.tipoDados,
    })));
    
    // Check if it went to staging
    const [staging] = await conn.query("SELECT COUNT(*) as c FROM tasy_faturado_staging") as any[];
    console.log("tasy_faturado_staging count:", staging[0].c);

  } catch(e: any) {
    console.error("Erro:", e.message);
  }

  conn.end();
}
run();
