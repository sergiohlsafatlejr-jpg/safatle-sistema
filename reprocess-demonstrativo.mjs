import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== Reprocessando tabela demonstrativo para corrigir glosas ===\n');

// Atualizar registros onde situacaoItem = GLOSADO
// Mover valor de valor_pago para valor_glosa e zerar valor_pago
const [result] = await connection.execute(`
  UPDATE demonstrativo
  SET 
    valor_glosa = valor_pago,
    valor_pago = '0'
  WHERE UPPER(situacao_item) = 'GLOSADO'
    AND (valor_glosa IS NULL OR valor_glosa = '0' OR valor_glosa = '')
    AND valor_pago IS NOT NULL
    AND valor_pago != '0'
`);

console.log('Registros atualizados:', result.affectedRows);

// Verificar resultado
const [verificacao] = await connection.execute(`
  SELECT 
    estabelecimento_id,
    COUNT(*) as total,
    SUM(CASE WHEN UPPER(situacao_item) = 'GLOSADO' THEN 1 ELSE 0 END) as glosados,
    SUM(COALESCE(CAST(valor_pago AS DECIMAL(15,2)), 0)) as total_pago,
    SUM(COALESCE(CAST(valor_glosa AS DECIMAL(15,2)), 0)) as total_glosa
  FROM demonstrativo
  WHERE convenio_id = 1
  GROUP BY estabelecimento_id
`);

console.log('\nResumo após correção (Unimed):');
verificacao.forEach(r => {
  console.log(`  Estabelecimento ${r.estabelecimento_id}:`);
  console.log(`    Total: ${r.total}, Glosados: ${r.glosados}`);
  console.log(`    Valor Pago: R$ ${parseFloat(r.total_pago).toFixed(2)}`);
  console.log(`    Valor Glosa: R$ ${parseFloat(r.total_glosa).toFixed(2)}`);
});

await connection.end();
console.log('\n=== Reprocessamento concluído ===');
