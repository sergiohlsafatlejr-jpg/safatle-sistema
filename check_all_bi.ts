import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    const [c1]: any = await conn.query("SELECT COUNT(*) as c FROM tasy_faturado_itens_bi");
    console.log("tasy_faturado_itens_bi count:", c1[0].c);

    const [c2]: any = await conn.query("SELECT COUNT(*) as c FROM tasy_pagamentos_bi");
    console.log("tasy_pagamentos_bi count:", c2[0].c);

    const [c3]: any = await conn.query("SELECT COUNT(*) as c FROM tasy_protocolo_bi");
    console.log("tasy_protocolo_bi count:", c3[0].c);
  } catch(e: any) {
    console.error("Erro:", e.message);
  }

  conn.end();
}
run();
