import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN data_referencia IS NULL THEN 1 ELSE 0 END) as null_count,
    SUM(CASE WHEN data_referencia IS NOT NULL THEN 1 ELSE 0 END) as not_null_count
  FROM faturamento_tiss 
  WHERE estabelecimento_id = 1
`);

console.log('Resultado:', rows[0]);

const [sample] = await connection.execute(`
  SELECT id, data_referencia, data_execucao, MONTH(data_referencia) as mes, YEAR(data_referencia) as ano
  FROM faturamento_tiss 
  WHERE estabelecimento_id = 1
  LIMIT 5
`);

console.log('Amostra de dados:', sample);

await connection.end();
