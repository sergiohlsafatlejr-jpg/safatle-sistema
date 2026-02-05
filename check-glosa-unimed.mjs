import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar dados de glosa para Unimed (convenio_id = 1) no PSI (estabelecimento_id = 1) em Janeiro/2026
const [glosaData] = await connection.execute(`
  SELECT 
    COUNT(*) as total,
    SUM(COALESCE(valor_glosa, 0)) as total_glosa,
    SUM(COALESCE(valor_pago, 0)) as total_pago,
    SUM(COALESCE(valor_informado, 0)) as total_informado,
    COUNT(CASE WHEN COALESCE(valor_glosa, 0) > 0 THEN 1 END) as itens_glosados
  FROM demonstrativo
  WHERE estabelecimento_id = 1
    AND convenio_id = 1
    AND MONTH(data_referencia) = 1
    AND YEAR(data_referencia) = 2026
`);

console.log('Dados de glosa para Unimed no PSI em Janeiro/2026:');
console.log(glosaData[0]);

// Verificar alguns registros com glosa
const [glosados] = await connection.execute(`
  SELECT id, numero_guia, valor_glosa, valor_pago, valor_informado, codigo_glosa, data_referencia
  FROM demonstrativo
  WHERE estabelecimento_id = 1
    AND convenio_id = 1
    AND COALESCE(valor_glosa, 0) > 0
  LIMIT 10
`);

console.log('\nExemplos de itens glosados:');
glosados.forEach(r => {
  console.log(`  ID ${r.id}: Guia ${r.numero_guia}, Glosa: ${r.valor_glosa}, Data Ref: ${r.data_referencia}`);
});

await connection.end();
