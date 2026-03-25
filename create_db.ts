import mysql from 'mysql2/promise';

async function createDb() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      port: 3306
    });
    
    await connection.query('CREATE DATABASE IF NOT EXISTS safatle_sistema');
    console.log('Banco de dados safatle_sistema garantido (criado ou já existente).');
    await connection.end();
  } catch (err) {
    console.error('Erro ao criar banco:', err);
  }
}

createDb();
