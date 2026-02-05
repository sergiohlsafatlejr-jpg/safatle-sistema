import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar dados na tabela recebimentos_excel
const [recebimentos] = await connection.execute(`
  SELECT 
    estabelecimento_id,
    COUNT(*) as total,
    SUM(CASE WHEN UPPER(situacao_item) = 'GLOSADO' THEN 1 ELSE 0 END) as glosados,
    SUM(CASE WHEN UPPER(situacao_item) = 'PAGO' THEN 1 ELSE 0 END) as pagos,
    SUM(COALESCE(CAST(valor_pagamento AS DECIMAL(15,2)), 0)) as total_valor
  FROM recebimentos_excel
  WHERE convenio_id = 1
  GROUP BY estabelecimento_id
`);

console.log('Dados em recebimentos_excel (Unimed):');
recebimentos.forEach(r => {
  console.log(`  Estabelecimento ${r.estabelecimento_id}:`);
  console.log(`    Total: ${r.total}, Pagos: ${r.pagos}, Glosados: ${r.glosados}`);
  console.log(`    Valor Total: R$ ${parseFloat(r.total_valor).toFixed(2)}`);
});

// Verificar arquivo específico 690002
const [arquivo690002] = await connection.execute(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN UPPER(situacao_item) = 'GLOSADO' THEN 1 ELSE 0 END) as glosados,
    SUM(CASE WHEN UPPER(situacao_item) = 'PAGO' THEN 1 ELSE 0 END) as pagos
  FROM recebimentos_excel
  WHERE arquivo_id = 690002
`);

console.log('\nArquivo 690002 (demonstrativo-0284932.xlsx):');
console.log(arquivo690002[0]);

await connection.end();
