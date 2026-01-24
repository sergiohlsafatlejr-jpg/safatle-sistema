import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar qual é o estabelecimento 60011
const [estab60011] = await conn.query('SELECT * FROM estabelecimentos WHERE id = 60011');
console.log('Estabelecimento 60011:', estab60011);

// Verificar todas as importações do Tasy
const [importacoes] = await conn.query(`
  SELECT id, estabelecimentoId, nomeArquivo, totalRegistros, createdAt 
  FROM importacoesTasy 
  ORDER BY id DESC 
  LIMIT 5
`);
console.log('Últimas importações Tasy:', importacoes);

// Verificar se o estabelecimento 60011 existe
if (estab60011.length === 0) {
  console.log('Estabelecimento 60011 não existe! Os dados foram importados para um estabelecimento inexistente.');
  console.log('Vou atualizar os dados para o estabelecimento 1 (Pronto Socorro Infantil)...');
  
  // Atualizar dadosTasy
  const [result1] = await conn.query('UPDATE dadosTasy SET estabelecimentoId = 1 WHERE estabelecimentoId = 60011');
  console.log('dadosTasy atualizados:', result1.affectedRows);
  
  // Atualizar contasPagasTasy
  const [result2] = await conn.query('UPDATE contasPagasTasy SET estabelecimentoId = 1 WHERE estabelecimentoId = 60011');
  console.log('contasPagasTasy atualizados:', result2.affectedRows);
  
  // Atualizar itensPagosTasy
  const [result3] = await conn.query('UPDATE itensPagosTasy SET estabelecimentoId = 1 WHERE estabelecimentoId = 60011');
  console.log('itensPagosTasy atualizados:', result3.affectedRows);
  
  // Atualizar importacoesTasy
  const [result4] = await conn.query('UPDATE importacoesTasy SET estabelecimentoId = 1 WHERE estabelecimentoId = 60011');
  console.log('importacoesTasy atualizados:', result4.affectedRows);
}

await conn.end();
