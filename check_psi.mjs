import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar dados do Tasy para o Pronto Socorro Infantil (estabelecimento 1)
const [dadosPSI] = await conn.query(`
  SELECT COUNT(*) as total
  FROM dadosTasy 
  WHERE estabelecimentoId = 1
`);
console.log('Total dados Tasy PSI:', dadosPSI);

// Verificar dados do Tasy para Maternidade Ela (estabelecimento 60011)
const [dadosMaternidade] = await conn.query(`
  SELECT COUNT(*) as total,
         DATE_FORMAT(dataFaturado, '%Y-%m') as mesAno
  FROM dadosTasy 
  WHERE estabelecimentoId = 60011
  GROUP BY DATE_FORMAT(dataFaturado, '%Y-%m')
  ORDER BY mesAno DESC
  LIMIT 10
`);
console.log('Dados Tasy Maternidade Ela por mês:', dadosMaternidade);

// Verificar contasPagasTasy
const [contasPagas] = await conn.query(`
  SELECT estabelecimentoId, COUNT(*) as total
  FROM contasPagasTasy 
  GROUP BY estabelecimentoId
`);
console.log('Contas Pagas por estabelecimento:', contasPagas);

// Verificar itensPagosTasy
const [itensPagos] = await conn.query(`
  SELECT estabelecimentoId, COUNT(*) as total
  FROM itensPagosTasy 
  GROUP BY estabelecimentoId
`);
console.log('Itens Pagos por estabelecimento:', itensPagos);

await conn.end();
