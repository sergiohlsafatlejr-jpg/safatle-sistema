import mysql from 'mysql2/promise';

async function resetDb() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      port: 3306
    });
    
    console.log('Dropando safatle_sistema...');
    await connection.query('DROP DATABASE IF EXISTS safatle_sistema');
    console.log('Criando safatle_sistema do zero...');
    await connection.query('CREATE DATABASE safatle_sistema');
    console.log('Pronto. Banco de dados vazio e limpo.');
    await connection.end();
  } catch (err) {
    console.error('Erro ao resetar banco:', err);
  }
}

resetDb();
