import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Ver estrutura da tabela procedimentos
const [cols] = await conn.execute(`DESCRIBE procedimentos`);
console.log('=== COLUNAS DA TABELA PROCEDIMENTOS ===');
cols.forEach(c => console.log(c.Field));

// Buscar procedimentos com glosa
const [procs] = await conn.execute(`
  SELECT id, codigo, descricao, valorTotal, valorGlosado, motivoGlosa, arquivoId
  FROM procedimentos
  WHERE valorGlosado > 0
  LIMIT 10
`);

console.log('\n=== PROCEDIMENTOS COM GLOSA ===');
for (const proc of procs) {
  console.log({
    codigo: proc.codigo,
    valorTotal: proc.valorTotal,
    valorGlosado: proc.valorGlosado,
    motivoGlosa: proc.motivoGlosa,
    arquivoId: proc.arquivoId
  });
}

// Contar total de glosados
const [resumo] = await conn.execute(`
  SELECT COUNT(*) as count, SUM(valorGlosado) as total_glosado
  FROM procedimentos
  WHERE valorGlosado > 0
`);

console.log('\n=== RESUMO TOTAL DE GLOSADOS ===');
console.log(resumo[0]);

await conn.end();
