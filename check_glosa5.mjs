// Script para verificar todos os campos de dadosExtras
import { createConnection } from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("DATABASE_URL não encontrada");
    return;
  }
  
  const url = new URL(dbUrl);
  const conn = await createConnection({
    host: url.hostname,
    port: parseInt(url.port || '4000'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false }
  });

  // Verificar procedimentos da Unimed com todos os campos
  const [rows] = await conn.execute(`
    SELECT p.id, p.codigo, p.valorTotal, p.dadosExtras, a.nome as arquivo_nome 
    FROM procedimentos p 
    JOIN arquivos a ON p.arquivoId = a.id 
    WHERE a.convenioId = 1 AND a.direcao = 'retornado' AND a.status = 'processado'
    LIMIT 3
  `);

  console.log("Procedimentos da Unimed (retornados) - TODOS OS CAMPOS:");
  for (const row of rows) {
    const extras = typeof row.dadosExtras === 'string' 
      ? JSON.parse(row.dadosExtras) 
      : (row.dadosExtras || {});
    console.log(`\nID: ${row.id}, Código: ${row.codigo}, valorTotal: ${row.valorTotal}`);
    console.log(`Arquivo: ${row.arquivo_nome}`);
    console.log(`dadosExtras completo:`, JSON.stringify(extras, null, 2));
    console.log('---');
  }

  // Verificar como os dados de glosa aparecem no Demonstrativo
  // Buscar um item que sabemos que é glosado (pelo status no Demonstrativo)
  const [glosados] = await conn.execute(`
    SELECT p.id, p.codigo, p.valorTotal, p.dadosExtras, a.nome as arquivo_nome 
    FROM procedimentos p 
    JOIN arquivos a ON p.arquivoId = a.id 
    WHERE a.convenioId = 1 AND a.direcao = 'retornado' AND a.status = 'processado'
    AND (
      JSON_EXTRACT(p.dadosExtras, '$.situacao') LIKE '%glos%'
      OR JSON_EXTRACT(p.dadosExtras, '$.status') LIKE '%glos%'
      OR JSON_EXTRACT(p.dadosExtras, '$.ERRO TISS') IS NOT NULL
    )
    LIMIT 5
  `);

  console.log("\n\nProcedimentos GLOSADOS (por situacao/status/ERRO TISS):");
  for (const row of glosados) {
    const extras = typeof row.dadosExtras === 'string' 
      ? JSON.parse(row.dadosExtras) 
      : (row.dadosExtras || {});
    console.log(`\nID: ${row.id}, Código: ${row.codigo}, valorTotal: ${row.valorTotal}`);
    console.log(`Arquivo: ${row.arquivo_nome}`);
    console.log(`dadosExtras:`, JSON.stringify(extras, null, 2));
    console.log('---');
  }

  await conn.end();
}

main().catch(console.error);
