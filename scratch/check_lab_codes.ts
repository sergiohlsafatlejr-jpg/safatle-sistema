import 'dotenv/config';
import mysql from 'mysql2/promise';

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  // 1. Colunas convênio
  const [cols] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME = 'demonstrativo' AND COLUMN_NAME LIKE '%conv%'`
  );
  console.log('=== COLUNAS CONVÊNIO ===');
  console.log(cols);

  // 2. Sample de convênio
  const [sample] = await conn.execute(
    `SELECT DISTINCT convenio_id FROM demonstrativo WHERE estabelecimentoId = 1 AND convenio_id IS NOT NULL LIMIT 10`
  );
  console.log('\n=== SAMPLE CONVENIO_ID ===');
  console.log(sample);

  // 3. Lab por convênio em abril/2026
  const [labConv] = await conn.execute(
    `SELECT convenio_id,
            COUNT(*) as qtd,
            COUNT(DISTINCT codigo_item) as codigos,
            SUM(CAST(valor_pago AS DECIMAL(12,2))) as total_pago,
            SUM(CAST(valor_glosa AS DECIMAL(12,2))) as total_glosa
     FROM demonstrativo WHERE estabelecimentoId = 1
     AND MONTH(data_referencia) = 4 AND YEAR(data_referencia) = 2026
     AND (codigo_item LIKE '402%' OR codigo_item LIKE '403%')
     GROUP BY convenio_id ORDER BY total_pago DESC`
  );
  console.log('\n=== LAB POR CONVÊNIO ABRIL/2026 ===');
  console.table(labConv);

  // 4. Todos os códigos LAB distintos (402/403) no PS
  const [allLabCodes] = await conn.execute(
    `SELECT DISTINCT codigo_item
     FROM demonstrativo WHERE estabelecimentoId = 1
     AND (codigo_item LIKE '402%' OR codigo_item LIKE '403%')
     ORDER BY codigo_item`
  );
  console.log('\n=== TOTAL CÓDIGOS LAB DISTINTOS ===');
  console.log('Total:', (allLabCodes as any[]).length);

  // 5. Verificar se existe tabela de convênios
  const [tables] = await conn.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_NAME LIKE '%convenio%' AND TABLE_SCHEMA = DATABASE()`
  );
  console.log('\n=== TABELAS CONVÊNIO ===');
  console.log(tables);

  // 6. Colunas tipo text que possam conter nome do convênio
  const [textCols] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME = 'demonstrativo' 
     AND COLUMN_NAME IN ('nome_operadora', 'operadora', 'convenio', 'descricao_convenio', 'registro_ans', 'nome_prestador')`
  );
  console.log('\n=== COLUNAS TEXT POSSÍVEIS ===');
  console.log(textCols);

  // 7. Todas as colunas da tabela demonstrativo
  const [allCols] = await conn.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME = 'demonstrativo' ORDER BY ORDINAL_POSITION`
  );
  console.log('\n=== TODAS AS COLUNAS ===');
  console.log((allCols as any[]).map((c: any) => c.COLUMN_NAME).join(', '));

  await conn.end();
  process.exit(0);
})();
