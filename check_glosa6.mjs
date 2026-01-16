// Script para verificar itens glosados
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

  // Buscar itens que têm "Situação Item" diferente de "PAGO"
  const [rows] = await conn.execute(`
    SELECT p.id, p.codigo, p.valorTotal, p.dadosExtras, a.nome as arquivo_nome 
    FROM procedimentos p 
    JOIN arquivos a ON p.arquivoId = a.id 
    WHERE a.convenioId = 1 AND a.direcao = 'retornado' AND a.status = 'processado'
    LIMIT 100
  `);

  console.log("Analisando 100 procedimentos da Unimed...\n");
  
  let pagos = 0;
  let glosados = 0;
  let outros = 0;
  const glosadosList = [];

  for (const row of rows) {
    const extras = typeof row.dadosExtras === 'string' 
      ? JSON.parse(row.dadosExtras) 
      : (row.dadosExtras || {});
    
    const situacaoItem = extras['Situação Item'] || extras['situacaoItem'] || extras['situacao'] || '';
    
    if (situacaoItem.toUpperCase() === 'PAGO') {
      pagos++;
    } else if (situacaoItem.toUpperCase().includes('GLOS') || situacaoItem.toUpperCase() === 'NEGADO') {
      glosados++;
      glosadosList.push({
        id: row.id,
        codigo: row.codigo,
        situacao: situacaoItem,
        erroTiss: extras['Erro TISS'] || extras['ERRO TISS'] || 'N/A',
        valorTotal: row.valorTotal
      });
    } else {
      outros++;
      console.log(`Situação desconhecida: "${situacaoItem}" - ID: ${row.id}`);
    }
  }

  console.log(`\nResumo:`);
  console.log(`  Pagos: ${pagos}`);
  console.log(`  Glosados: ${glosados}`);
  console.log(`  Outros: ${outros}`);

  if (glosadosList.length > 0) {
    console.log(`\nPrimeiros 5 itens glosados:`);
    for (const item of glosadosList.slice(0, 5)) {
      console.log(`  ID: ${item.id}, Código: ${item.codigo}, Situação: ${item.situacao}, Erro TISS: ${item.erroTiss}, Valor: ${item.valorTotal}`);
    }
  }

  // Verificar total de itens glosados no banco
  const [allRows] = await conn.execute(`
    SELECT COUNT(*) as total FROM procedimentos p 
    JOIN arquivos a ON p.arquivoId = a.id 
    WHERE a.convenioId = 1 AND a.direcao = 'retornado' AND a.status = 'processado'
  `);
  console.log(`\nTotal de procedimentos da Unimed (retornados): ${allRows[0].total}`);

  await conn.end();
}

main().catch(console.error);
