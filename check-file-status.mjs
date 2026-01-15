import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar arquivo
const [arquivos] = await connection.execute(
  `SELECT id, nome, status, tamanho, createdAt FROM arquivos WHERE nome LIKE '%0278119%' ORDER BY createdAt DESC LIMIT 5`
);
console.log('Arquivos encontrados:');
console.log(arquivos);

// Verificar procedimentos do arquivo
if (arquivos.length > 0) {
  const arquivoId = arquivos[0].id;
  const [procs] = await connection.execute(
    `SELECT COUNT(*) as total FROM procedimentos WHERE arquivoId = ?`,
    [arquivoId]
  );
  console.log(`\nProcedimentos do arquivo ${arquivoId}:`, procs[0].total);
}

await connection.end();
