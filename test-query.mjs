import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Query exata que deveria ser executada
const [items] = await connection.execute(`
  SELECT *
  FROM faturamento_tiss 
  WHERE estabelecimento_id = 1
    AND MONTH(data_referencia) = 1
    AND YEAR(data_referencia) = 2026
  ORDER BY data_execucao DESC, id DESC
  LIMIT 20
  OFFSET 0
`);

console.log('Items encontrados:', items.length);
if (items.length > 0) {
  console.log('Primeiro item:', JSON.stringify(items[0], null, 2));
}

await connection.end();
