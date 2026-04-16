import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    const [rows] = await conn.query("SELECT COUNT(*) as count FROM fin_transacoes") as any;
    console.log("Count:", rows[0].count);
    
    await conn.query("ALTER TABLE fin_transacoes ADD PRIMARY KEY (id)");
    console.log("PK added");
  } catch(e: any) {
    console.error("Error PK:", e.message);
  }

  try {
    await conn.query("ALTER TABLE fin_transacoes MODIFY id int NOT NULL AUTO_INCREMENT");
    console.log("Auto increment added");
  } catch(e: any) {
    console.error("Error Auto Incr:", e.message);
  }

  conn.end();
}
run();
