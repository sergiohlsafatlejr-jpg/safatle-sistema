// Script para verificar dados de glosa diretamente no banco
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

  // Verificar procedimentos com glosa da Unimed
  const [rows] = await conn.execute(`
    SELECT p.id, p.codigo, p.dadosExtras, a.nome as arquivo_nome 
    FROM procedimentos p 
    JOIN arquivos a ON p.arquivoId = a.id 
    WHERE a.convenioId = 1 AND a.direcao = 'retornado' AND a.status = 'processado'
    LIMIT 5
  `);

  console.log("Procedimentos da Unimed (retornados):");
  for (const row of rows) {
    const extras = row.dadosExtras ? JSON.parse(row.dadosExtras) : {};
    console.log(`ID: ${row.id}, Código: ${row.codigo}`);
    console.log(`  valorGlosado: ${extras.valorGlosado || 'N/A'}`);
    console.log(`  valor_glosa: ${extras.valor_glosa || 'N/A'}`);
    console.log(`  motivoGlosa: ${extras.motivoGlosa || 'N/A'}`);
    console.log(`  cod_glosa: ${extras.cod_glosa || 'N/A'}`);
    console.log(`  Arquivo: ${row.arquivo_nome}`);
    console.log('---');
  }

  // Contar itens com glosa
  const [countResult] = await conn.execute(`
    SELECT COUNT(*) as total FROM procedimentos p 
    JOIN arquivos a ON p.arquivoId = a.id 
    WHERE a.convenioId = 1 AND a.direcao = 'retornado' AND a.status = 'processado'
    AND JSON_EXTRACT(p.dadosExtras, '$.valorGlosado') IS NOT NULL 
    AND CAST(COALESCE(JSON_EXTRACT(p.dadosExtras, '$.valorGlosado'), '0') AS DECIMAL(10,2)) > 0
  `);
  console.log(`\nTotal de itens com valorGlosado > 0: ${countResult[0].total}`);

  // Verificar campos alternativos
  const [countResult2] = await conn.execute(`
    SELECT COUNT(*) as total FROM procedimentos p 
    JOIN arquivos a ON p.arquivoId = a.id 
    WHERE a.convenioId = 1 AND a.direcao = 'retornado' AND a.status = 'processado'
    AND JSON_EXTRACT(p.dadosExtras, '$.valor_glosa') IS NOT NULL 
    AND CAST(COALESCE(JSON_EXTRACT(p.dadosExtras, '$.valor_glosa'), '0') AS DECIMAL(10,2)) > 0
  `);
  console.log(`Total de itens com valor_glosa > 0: ${countResult2[0].total}`);

  await conn.end();
}

main().catch(console.error);
