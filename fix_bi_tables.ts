import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log("Adicionando PRIMARY KEY / AUTO_INCREMENT...")
    
    // tasy_faturado_itens_bi
    await conn.query("ALTER TABLE tasy_faturado_itens_bi MODIFY id INT NOT NULL AUTO_INCREMENT PRIMARY KEY;").catch(e => {
        // Fallback for when there's an existing PK
        return conn.query("ALTER TABLE tasy_faturado_itens_bi MODIFY id INT NOT NULL AUTO_INCREMENT;");
    }).catch(e => console.error("tfibi:", e.message));

    // tasy_pagamentos_bi
    await conn.query("ALTER TABLE tasy_pagamentos_bi MODIFY id INT NOT NULL AUTO_INCREMENT PRIMARY KEY;").catch(e => {
        return conn.query("ALTER TABLE tasy_pagamentos_bi MODIFY id INT NOT NULL AUTO_INCREMENT;");
    }).catch(e => console.error("tpgbi:", e.message));

    // tasy_protocolo_bi
    await conn.query("ALTER TABLE tasy_protocolo_bi MODIFY id INT NOT NULL AUTO_INCREMENT PRIMARY KEY;").catch(e => {
        return conn.query("ALTER TABLE tasy_protocolo_bi MODIFY id INT NOT NULL AUTO_INCREMENT;");
    }).catch(e => console.error("tptbi:", e.message));

    console.log("Pronto!");
    
  } catch(e: any) {
    console.error("ERRO MYSQL:", e.message);
  }
  
  conn.end();
  process.exit(0);
}
run();
