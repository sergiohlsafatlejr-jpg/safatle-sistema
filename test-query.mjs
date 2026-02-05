import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(`
  SELECT 
    numero_guia_prestador,
    numero_lote,
    DATE(data_execucao) as data_execucao,
    MAX(data_referencia) as data_referencia,
    MAX(carteira_beneficiario) as carteira_beneficiario,
    MAX(nome_prof) as nome_prof,
    COUNT(*) as total_itens,
    SUM(CAST(COALESCE(valor_faturado, 0) AS DECIMAL(15,2))) as valor_faturado
  FROM faturamento_tiss
  WHERE estabelecimento_id = 3
    AND MONTH(data_referencia) = 1
    AND YEAR(data_referencia) = 2026
  GROUP BY numero_guia_prestador, numero_lote, DATE(data_execucao)
  ORDER BY DATE(data_execucao) DESC
  LIMIT 20
`);

console.log('Registros encontrados:', rows.length);
console.log('Primeiros registros:');
rows.slice(0, 5).forEach((r, i) => {
  console.log(`${i+1}. Guia: ${r.numero_guia_prestador}, Lote: ${r.numero_lote}, Data: ${r.data_execucao}, Itens: ${r.total_itens}, Valor: ${r.valor_faturado}`);
});

await conn.end();
