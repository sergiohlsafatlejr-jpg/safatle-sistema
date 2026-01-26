import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkTables() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [tables] = await connection.execute("SHOW TABLES LIKE '%Conciliacao%'");
  console.log('Tabelas de conciliação:', tables);
  
  await connection.end();
}

checkTables().catch(console.error);
