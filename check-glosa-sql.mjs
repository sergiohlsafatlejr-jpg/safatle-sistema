import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar arquivos retornados da Unimed
const [arquivos] = await conn.execute(`
  SELECT a.id, a.nome, c.nome as convenio_nome, a.direcao
  FROM arquivos a
  LEFT JOIN convenios c ON a.convenio_id = c.id
  WHERE c.nome LIKE '%Unimed%' AND a.direcao = 'retornado'
  LIMIT 5
`);

console.log('=== ARQUIVOS UNIMED RETORNADOS ===');
console.log(arquivos);

if (arquivos.length > 0) {
  const arquivoId = arquivos[0].id;
  
  // Buscar procedimentos com valor glosado
  const [procs] = await conn.execute(`
    SELECT id, codigo, descricao, valor_total, valor_glosado, motivo_glosa, 
           SUBSTRING(dados_extras, 1, 300) as dados_extras_preview
    FROM procedimentos
    WHERE arquivo_id = ?
    LIMIT 10
  `, [arquivoId]);

  console.log('\n=== PROCEDIMENTOS DO ARQUIVO ===');
  for (const proc of procs) {
    console.log({
      codigo: proc.codigo,
      valorTotal: proc.valor_total,
      valorGlosado: proc.valor_glosado,
      motivoGlosa: proc.motivo_glosa,
      dadosExtras: proc.dados_extras_preview
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

// Verificar Bradesco também
const [arquivosBradesco] = await conn.execute(`
  SELECT a.id, a.nome, c.nome as convenio_nome, a.direcao
  FROM arquivos a
  LEFT JOIN convenios c ON a.convenio_id = c.id
  WHERE c.nome LIKE '%Bradesco%' AND a.direcao = 'retornado'
  LIMIT 5
`);

console.log('\n=== ARQUIVOS BRADESCO RETORNADOS ===');
console.log(arquivosBradesco);

if (arquivosBradesco.length > 0) {
  const arquivoId = arquivosBradesco[0].id;
  
  const [procs] = await conn.execute(`
    SELECT id, codigo, descricao, valor_total, valor_glosado, motivo_glosa
    FROM procedimentos
    WHERE arquivo_id = ?
    LIMIT 10
  `, [arquivoId]);

  console.log('\n=== PROCEDIMENTOS BRADESCO ===');
  for (const proc of procs) {
    console.log({
      codigo: proc.codigo,
      valorTotal: proc.valor_total,
      valorGlosado: proc.valor_glosado,
      motivoGlosa: proc.motivo_glosa
    });
  }

  const [resumo] = await conn.execute(`
    SELECT COUNT(*) as count, SUM(valor_glosado) as total_glosado
    FROM procedimentos
    WHERE arquivo_id = ? AND valor_glosado > 0
  `, [arquivoId]);

  console.log('\n=== RESUMO GLOSADOS BRADESCO ===');
  console.log(resumo[0]);
}

await conn.end();
