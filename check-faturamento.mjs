import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const url = new URL(DATABASE_URL);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1).split('?')[0],
    ssl: { rejectUnauthorized: false }
  });

  console.log('\n=== DISTRIBUIÇÃO DE DADOS POR ESTABELECIMENTO E DATA ===\n');
  
  const [rows] = await connection.execute(`
    SELECT 
      estabelecimento_id, 
      MONTH(data_referencia) as mes, 
      YEAR(data_referencia) as ano, 
      COUNT(*) as total
    FROM faturamento_tiss 
    GROUP BY estabelecimento_id, YEAR(data_referencia), MONTH(data_referencia)
    ORDER BY estabelecimento_id, ano DESC, mes DESC
    LIMIT 20
  `);
  
  console.log('Estabelecimento | Mês | Ano | Total');
  console.log('----------------|-----|-----|------');
  rows.forEach(row => {
    console.log(`${row.estabelecimento_id || 'NULL'} | ${row.mes || 'NULL'} | ${row.ano || 'NULL'} | ${row.total}`);
  });

  console.log('\n=== ESTABELECIMENTOS ===\n');
  
  const [estabs] = await connection.execute(`SELECT id, nome FROM estabelecimentos ORDER BY id`);
  
  estabs.forEach(row => {
    console.log(`ID: ${row.id} - ${row.nome}`);
  });

  console.log('\n=== VERIFICAR DADOS PARA ESTABELECIMENTO 1 + JANEIRO/2026 ===\n');
  
  const [check] = await connection.execute(`
    SELECT COUNT(*) as total
    FROM faturamento_tiss 
    WHERE estabelecimento_id = 1 
    AND MONTH(data_referencia) = 1 
    AND YEAR(data_referencia) = 2026
  `);
  
  console.log('Total de registros para Estabelecimento 1 + Janeiro/2026:', check[0].total);

  await connection.end();
}

main().catch(console.error);

// Testar a query diretamente
async function testQuery() {
  const url = new URL(DATABASE_URL);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1).split('?')[0],
    ssl: { rejectUnauthorized: false }
  });

  console.log('\n=== TESTE DA QUERY SEM FILTRO DE ESTABELECIMENTO ===\n');
  
  const [rows] = await connection.execute(`
    SELECT COUNT(*) as total
    FROM faturamento_tiss 
    WHERE MONTH(data_referencia) = 1 
    AND YEAR(data_referencia) = 2026
  `);
  
  console.log('Total de registros para Janeiro/2026 (sem filtro de estabelecimento):', rows[0].total);

  await connection.end();
}

testQuery().catch(console.error);
