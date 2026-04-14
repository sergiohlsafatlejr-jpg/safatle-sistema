import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/safatle_sistema");
  const [rows] = await connection.execute("SELECT COUNT(*) as cnt FROM tasy_faturado_itens_bi;");
  
  console.log("Total de Itens de Faturamento:", (rows as any)[0].cnt);
  await connection.end();
  process.exit(0);
}

run();
