import mysql from 'mysql2/promise';

async function run() {
  try {
    const connection = await mysql.createConnection("mysql://root:@localhost:3306/safatle_sistema?timezone=Z");
    const [rows] = await connection.execute("SELECT count(*) as total FROM `tasy_pagamentos_bi`");
    console.log("Total na tabela tasy_pagamentos_bi:", rows);
    await connection.end();
  } catch (err) {
    console.error("Erro ao ler tabela:", err);
  }
  process.exit(0);
}

run();
