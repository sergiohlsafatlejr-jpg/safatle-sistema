import 'dotenv/config';
import mysql from 'mysql2/promise';

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // Colunas disponíveis
  const [cols] = await conn.execute(`SHOW COLUMNS FROM tasy_faturado_itens_bi`);
  console.log('\n=== COLUNAS DA TABELA ===');
  console.table(cols);

  // Dados por estabelecimento
  const [rows] = await conn.execute(
    `SELECT estabelecimentoId, COUNT(*) as total
     FROM tasy_faturado_itens_bi 
     GROUP BY estabelecimentoId ORDER BY estabelecimentoId`
  );
  console.log('\n=== DADOS POR ESTABELECIMENTO ===');
  console.table(rows);

  // Estabelecimentos Maternidade
  const [estabs] = await conn.execute(
    `SELECT id, nome FROM estabelecimentos WHERE nome LIKE '%Maternidade%' OR nome LIKE '%Ela%'`
  );
  console.log('\n=== ESTABELECIMENTOS MATERNIDADE ===');
  console.table(estabs);

  // Sample de dados recentes
  const [sample] = await conn.execute(
    `SELECT estabelecimentoId, conta, sequencia, descricao, valorTotal
     FROM tasy_faturado_itens_bi 
     ORDER BY id DESC
     LIMIT 10`
  );
  console.log('\n=== ÚLTIMOS 10 REGISTROS ===');
  console.table(sample);

  await conn.end();
  process.exit(0);
})();
