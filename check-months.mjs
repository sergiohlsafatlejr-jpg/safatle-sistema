import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute(`
  SELECT 
    MONTH(data_referencia) as mes,
    YEAR(data_referencia) as ano,
    COUNT(*) as total
  FROM faturamento_tiss 
  WHERE estabelecimento_id = 1
  GROUP BY MONTH(data_referencia), YEAR(data_referencia)
  ORDER BY ano DESC, mes DESC
`);

console.log('Meses/Anos disponíveis para estabelecimento 1:');
rows.forEach(r => console.log(`  ${r.mes}/${r.ano}: ${r.total} registros`));

// Verificar se existe dados para Janeiro/2026
const [jan2026] = await connection.execute(`
  SELECT COUNT(*) as total
  FROM faturamento_tiss 
  WHERE estabelecimento_id = 1
    AND MONTH(data_referencia) = 1
    AND YEAR(data_referencia) = 2026
`);
console.log('\nJaneiro/2026:', jan2026[0].total, 'registros');

await connection.end();
