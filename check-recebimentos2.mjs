import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
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
  for (const r of recebimentos) {
    console.log('  Estabelecimento ' + r.estabelecimento_id + ':');
    console.log('    Total: ' + r.total + ', Pagos: ' + r.pagos + ', Glosados: ' + r.glosados);
    console.log('    Valor Total: R$ ' + parseFloat(r.total_valor).toFixed(2));
  }

  await connection.end();
}

main().catch(console.error);
