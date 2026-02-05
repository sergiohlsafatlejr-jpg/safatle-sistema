import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar lotes diferentes para a guia 67752681
const [rows] = await connection.execute(`
  SELECT 
    numero_guia_prestador as guia,
    numero_lote as lote,
    DATE(data_execucao) as data_execucao,
    COUNT(*) as total_itens,
    SUM(CAST(valor_faturado AS DECIMAL(15,2))) as valor_total
  FROM faturamento_tiss
  WHERE numero_guia_prestador = '67752681'
  GROUP BY numero_guia_prestador, numero_lote, DATE(data_execucao)
  ORDER BY numero_lote, data_execucao
`);

console.log('Lotes encontrados para guia 67752681:');
console.log('=====================================');
rows.forEach(row => {
  console.log('Lote: ' + row.lote + ' | Data: ' + row.data_execucao + ' | Itens: ' + row.total_itens + ' | Valor: R$ ' + row.valor_total);
});
console.log('=====================================');
console.log('Total de lotes diferentes: ' + rows.length);

await connection.end();
