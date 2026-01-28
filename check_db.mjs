import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Verificar arquivos retornados
  const [arquivos] = await connection.execute(`
    SELECT a.id, a.nome, a.convenioId, a.direcao, a.tipoArquivo, a.estabelecimentoId 
    FROM arquivos a 
    WHERE a.direcao = 'retornado' 
    ORDER BY a.id DESC 
    LIMIT 10
  `);
  
  console.log('Arquivos retornados:');
  console.log(JSON.stringify(arquivos, null, 2));
  
  // Verificar procedimentos de arquivos retornados
  const [procs] = await connection.execute(`
    SELECT COUNT(*) as total, a.convenioId, a.nome as arquivoNome
    FROM procedimentos p
    JOIN arquivos a ON p.arquivoId = a.id
    WHERE a.direcao = 'retornado'
    GROUP BY a.id, a.convenioId, a.nome
    LIMIT 10
  `);
  
  console.log('\nProcedimentos por arquivo retornado:');
  console.log(JSON.stringify(procs, null, 2));
  
  await connection.end();
}

main().catch(console.error);
