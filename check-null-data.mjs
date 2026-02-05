import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar registros com data_referencia NULL
const [nullCount] = await connection.execute(`
  SELECT COUNT(*) as total FROM faturamento_tiss WHERE data_referencia IS NULL
`);
console.log('Registros com data_referencia NULL:', nullCount[0].total);

// Verificar distribuição de data_referencia
const [distribution] = await connection.execute(`
  SELECT 
    MONTH(data_referencia) as mes,
    YEAR(data_referencia) as ano,
    COUNT(*) as total
  FROM faturamento_tiss
  WHERE data_referencia IS NOT NULL
  GROUP BY YEAR(data_referencia), MONTH(data_referencia)
  ORDER BY ano DESC, mes DESC
  LIMIT 10
`);
console.log('\nDistribuição de data_referencia:');
distribution.forEach(r => console.log(`  ${r.mes}/${r.ano}: ${r.total} registros`));

await connection.end();
