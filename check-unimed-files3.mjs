import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar arquivos de demonstrativo Unimed (convenioId = 1)
const [arquivos] = await connection.execute(`
  SELECT id, nome, tipoArquivo, s3Url, convenioId, estabelecimentoId, dataReferencia, status
  FROM arquivos
  WHERE convenioId = 1
    AND direcao = 'retornado'
  ORDER BY id DESC
  LIMIT 5
`);

console.log('Arquivos de demonstrativo Unimed:');
arquivos.forEach(a => {
  console.log(`  ID ${a.id}: ${a.nome} (${a.tipoArquivo}) - Estab: ${a.estabelecimentoId}, Ref: ${a.dataReferencia}`);
  console.log(`    URL: ${a.s3Url?.substring(0, 100)}...`);
});

// Verificar um arquivo específico para ver os dados
if (arquivos.length > 0) {
  const arquivoId = arquivos[0].id;
  const [dados] = await connection.execute(`
    SELECT COUNT(*) as total,
           SUM(COALESCE(valor_glosa, 0)) as total_glosa,
           SUM(COALESCE(valor_pago, 0)) as total_pago,
           COUNT(CASE WHEN COALESCE(valor_glosa, 0) > 0 THEN 1 END) as itens_glosados
    FROM demonstrativo
    WHERE arquivo_id = ?
  `, [arquivoId]);
  
  console.log(`\nDados do arquivo ID ${arquivoId}:`);
  console.log(dados[0]);
}

await connection.end();
