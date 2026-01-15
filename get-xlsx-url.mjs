import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [arquivos] = await conn.execute(
  "SELECT id, nome, s3Url, s3Key, status FROM arquivos WHERE nome LIKE '%0278119%' ORDER BY createdAt DESC LIMIT 3"
);
console.log('Arquivos encontrados:', arquivos);

await conn.end();
