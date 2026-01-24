import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar estabelecimentos
const [estabs] = await conn.query('SELECT id, nome FROM estabelecimentos LIMIT 5');
console.log('Estabelecimentos:', estabs);

// Verificar dados do Tasy por estabelecimento
const [dados] = await conn.query(`
  SELECT estabelecimentoId, COUNT(*) as total, 
         MIN(dataFaturado) as minData, MAX(dataFaturado) as maxData
  FROM dadosTasy 
  GROUP BY estabelecimentoId
`);
console.log('Dados Tasy por estabelecimento:', dados);

// Verificar dados do Tasy para o Pronto Socorro Infantil (estabelecimento 1)
const [dadosPSI] = await conn.query(`
  SELECT COUNT(*) as total, 
         DATE_FORMAT(dataFaturado, '%Y-%m') as mesAno
  FROM dadosTasy 
  WHERE estabelecimentoId = 1
  GROUP BY DATE_FORMAT(dataFaturado, '%Y-%m')
  ORDER BY mesAno DESC
  LIMIT 10
`);
console.log('Dados Tasy PSI por mês:', dadosPSI);

await conn.end();
