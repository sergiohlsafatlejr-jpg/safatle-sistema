import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    const [c1]: any = await conn.query("SELECT COUNT(*) as c FROM tasy_faturado_itens_bi");
    console.log("Linhas em tasy_faturado_itens_bi:", c1[0].c);

    const [logs]: any = await conn.query("SELECT * FROM sincronizacao_log ORDER BY id DESC LIMIT 1");
    if (logs.length > 0) {
      console.log("Último Status:", logs[0].status);
      console.log("Registros Sincronizados:", logs[0].registrosSincronizados);
      if(logs[0].mensagemErro) console.log("Erro:", logs[0].mensagemErro);
    }
  } catch(e: any) {
    console.error("Erro:", e.message);
  }

  conn.end();
  process.exit(0);
}
run();
