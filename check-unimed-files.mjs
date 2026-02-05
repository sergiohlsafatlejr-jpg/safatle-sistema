import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar arquivos de demonstrativo Unimed
const [arquivos] = await connection.execute(`
  SELECT id, nome, tipo, s3_url, convenio_id, estabelecimento_id, data_referencia, status
  FROM arquivos
  WHERE convenio_id = 1
    AND tipo_arquivo = 'retornado'
  ORDER BY created_at DESC
  LIMIT 10
`);

console.log('Arquivos de demonstrativo Unimed:');
arquivos.forEach(a => {
  console.log(`  ID ${a.id}: ${a.nome} (${a.tipo}) - Estab: ${a.estabelecimento_id}, Ref: ${a.data_referencia}`);
  console.log(`    URL: ${a.s3_url?.substring(0, 80)}...`);
});

await connection.end();
