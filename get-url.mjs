import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [arquivos] = await connection.execute(`
  SELECT id, nome, s3Url
  FROM arquivos
  WHERE id = 690002
`);

console.log('URL completa:');
console.log(arquivos[0].s3Url);

await connection.end();
