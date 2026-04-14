import mysql from 'mysql2/promise';

async function run() {
  try {
    const connection = await mysql.createConnection("mysql://root:@localhost:3306/safatle_sistema?timezone=Z");
    const [rows] = await connection.execute("SELECT descricao, querySql FROM query_configuracoes WHERE descricao LIKE '%Pagamento%'");
    console.log("Query:", JSON.stringify(rows, null, 2));
    await connection.end();
  } catch (err) {
    console.error("Erro:", err);
  }
  process.exit(0);
}

run();
