import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [columns] = await connection.execute(`DESCRIBE faturamento_tiss`);
console.log('Colunas da tabela faturamento_tiss:');
columns.forEach(c => console.log(`  ${c.Field} (${c.Type})`));

await connection.end();
