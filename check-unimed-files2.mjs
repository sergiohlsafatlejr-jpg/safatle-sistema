import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar estrutura da tabela arquivos
const [cols] = await connection.execute(`DESCRIBE arquivos`);
console.log('Colunas da tabela arquivos:');
cols.forEach(c => console.log(`  ${c.Field}: ${c.Type}`));

// Buscar arquivos de demonstrativo Unimed
const [arquivos] = await connection.execute(`
  SELECT id, nome, tipo, s3_url, convenio_id, estabelecimento_id, data_referencia, status
  FROM arquivos
  WHERE convenio_id = 1
    AND tipo_arquivo = 'retornado'
  ORDER BY id DESC
  LIMIT 5
`);

console.log('\nArquivos de demonstrativo Unimed:');
arquivos.forEach(a => {
  console.log(`  ID ${a.id}: ${a.nome} (${a.tipo}) - Estab: ${a.estabelecimento_id}, Ref: ${a.data_referencia}`);
});

await connection.end();
