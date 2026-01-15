import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Ver estrutura da tabela arquivos
const [cols] = await conn.execute(`DESCRIBE arquivos`);
console.log('=== COLUNAS DA TABELA ARQUIVOS ===');
cols.forEach(c => console.log(c.Field));

// Buscar arquivos retornados
const [arquivos] = await conn.execute(`
  SELECT id, nome, direcao, status
  FROM arquivos
  WHERE direcao = 'retornado'
  LIMIT 5
`);

console.log('\n=== ARQUIVOS RETORNADOS ===');
console.log(arquivos);

if (arquivos.length > 0) {
  const arquivoId = arquivos[0].id;
  
  // Buscar procedimentos com valor glosado
  const [procs] = await conn.execute(`
    SELECT id, codigo, descricao, valor_total, valor_glosado, motivo_glosa
    FROM procedimentos
    WHERE arquivo_id = ?
    LIMIT 10
  `, [arquivoId]);

  console.log('\n=== PROCEDIMENTOS DO ARQUIVO ' + arquivos[0].nome + ' ===');
  for (const proc of procs) {
    console.log({
      codigo: proc.codigo,
      valorTotal: proc.valor_total,
      valorGlosado: proc.valor_glosado,
      motivoGlosa: proc.motivo_glosa
    });
  }

  // Contar glosados
  const [resumo] = await conn.execute(`
    SELECT COUNT(*) as count, SUM(valor_glosado) as total_glosado
    FROM procedimentos
    WHERE arquivo_id = ? AND valor_glosado > 0
  `, [arquivoId]);

  console.log('\n=== RESUMO GLOSADOS ===');
  console.log(resumo[0]);
}

await conn.end();
