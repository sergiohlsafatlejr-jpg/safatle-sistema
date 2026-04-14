import mysql from 'mysql2/promise';

async function run() {
  try {
    const connection = await mysql.createConnection("mysql://root:@localhost:3306/safatle_sistema?timezone=Z");
    const [rows] = await connection.execute("SELECT id, descricao, tipoDados, conexaoConfig FROM query_configuracoes WHERE tipoDados = 'bi_relatorio'");
    console.log("Configurações BI:", JSON.stringify(rows, null, 2));
    await connection.end();
  } catch (err) {
    console.error("Erro:", err);
  }
  process.exit(0);
}

run();
