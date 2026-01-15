import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, nome, s3Url, s3Key, status, tipoArquivo FROM arquivos WHERE nome LIKE '%geap%' OR nome LIKE '%GEAP%' ORDER BY createdAt DESC LIMIT 5"
);
console.log('Arquivos GEAP:', JSON.stringify(rows, null, 2));
await conn.end();
