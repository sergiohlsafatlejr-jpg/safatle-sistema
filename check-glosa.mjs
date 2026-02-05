import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar dados de glosa na tabela demonstrativo
const [glosaData] = await connection.execute(`
  SELECT 
    estabelecimento_id,
    COUNT(*) as total,
    SUM(COALESCE(valor_glosa, 0)) as total_glosa,
    SUM(COALESCE(valor_pago, 0)) as total_pago,
    SUM(COALESCE(valor_informado, 0)) as total_informado,
    COUNT(CASE WHEN COALESCE(valor_glosa, 0) > 0 THEN 1 END) as itens_glosados
  FROM demonstrativo
  GROUP BY estabelecimento_id
  ORDER BY estabelecimento_id
`);

console.log('Dados de glosa por estabelecimento:');
glosaData.forEach(r => {
  console.log(`  Estab ${r.estabelecimento_id}: ${r.total} itens, Glosa: R$ ${r.total_glosa}, Pago: R$ ${r.total_pago}, Informado: R$ ${r.total_informado}, Itens glosados: ${r.itens_glosados}`);
});

// Verificar alguns registros com glosa
const [glosados] = await connection.execute(`
  SELECT id, estabelecimento_id, numero_guia, valor_glosa, valor_pago, valor_informado, codigo_glosa
  FROM demonstrativo
  WHERE COALESCE(valor_glosa, 0) > 0
  LIMIT 5
`);

console.log('\nExemplos de itens glosados:');
glosados.forEach(r => {
  console.log(`  ID ${r.id}: Estab ${r.estabelecimento_id}, Guia ${r.numero_guia}, Glosa: ${r.valor_glosa}, Cod: ${r.codigo_glosa}`);
});

await connection.end();
