import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar registros para guia 67752681 lote 86910 data 01/01/2026
const [rows] = await connection.execute(`
  SELECT 
    numero_guia_prestador as guia,
    numero_lote as lote,
    DATE(data_execucao) as data_execucao,
    codigo_item,
    descricao_item,
    valor_faturado
  FROM faturamento_tiss
  WHERE numero_guia_prestador = '67752681'
    AND numero_lote = '86910'
    AND DATE(data_execucao) = '2026-01-01'
  ORDER BY codigo_item
  LIMIT 30
`);

console.log('Itens para guia 67752681 lote 86910 data 01/01/2026:');
console.log('=====================================');
rows.forEach(row => {
  console.log('Codigo: ' + row.codigo_item + ' | Desc: ' + (row.descricao_item || '').substring(0, 30) + ' | Valor: R$ ' + row.valor_faturado);
});
console.log('=====================================');
console.log('Total de itens: ' + rows.length);

await connection.end();
