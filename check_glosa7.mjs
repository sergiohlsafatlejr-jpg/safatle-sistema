// Script para buscar itens glosados em toda a base
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

  // Buscar itens que têm situacaoItem diferente de PAGO
  const [rows] = await conn.execute(`
    SELECT p.id, p.codigo, p.valorTotal, p.dadosExtras, a.nome as arquivo_nome, c.nome as convenio_nome
    FROM procedimentos p 
    JOIN arquivos a ON p.arquivoId = a.id 
    JOIN convenios c ON a.convenioId = c.id
    WHERE a.direcao = 'retornado' AND a.status = 'processado'
    AND JSON_EXTRACT(p.dadosExtras, '$.situacaoItem') != 'PAGO'
    LIMIT 20
  `);

  console.log("Itens com situacaoItem != PAGO:");
  for (const row of rows) {
    const extras = typeof row.dadosExtras === 'string' 
      ? JSON.parse(row.dadosExtras) 
      : (row.dadosExtras || {});
    console.log(`ID: ${row.id}, Código: ${row.codigo}, Convênio: ${row.convenio_nome}`);
    console.log(`  situacaoItem: ${extras.situacaoItem || 'N/A'}`);
    console.log(`  Situação Item: ${extras['Situação Item'] || 'N/A'}`);
    console.log(`  Erro TISS: ${extras['Erro TISS'] || 'N/A'}`);
    console.log(`  valorGlosado: ${extras.valorGlosado || 'N/A'}`);
    console.log(`  valor_glosa: ${extras.valor_glosa || 'N/A'}`);
    console.log(`  Arquivo: ${row.arquivo_nome}`);
    console.log('---');
  }

  // Contar por convênio
  console.log("\n\nContagem de itens glosados por convênio:");
  const [countByConvenio] = await conn.execute(`
    SELECT c.nome, COUNT(*) as total
    FROM procedimentos p 
    JOIN arquivos a ON p.arquivoId = a.id 
    JOIN convenios c ON a.convenioId = c.id
    WHERE a.direcao = 'retornado' AND a.status = 'processado'
    AND JSON_EXTRACT(p.dadosExtras, '$.situacaoItem') != 'PAGO'
    GROUP BY c.nome
    ORDER BY total DESC
  `);
  
  for (const row of countByConvenio) {
    console.log(`  ${row.nome}: ${row.total}`);
  }

  await conn.end();
}

main().catch(console.error);
