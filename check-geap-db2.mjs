import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check arquivo GEAP
const [arquivos] = await conn.execute(
  "SELECT id, nome, status FROM arquivos WHERE nome LIKE '%geap%' ORDER BY createdAt DESC LIMIT 3"
);
console.log('Arquivos GEAP:', arquivos);

// Check procedimentos count
const [procs] = await conn.execute(
  "SELECT a.id, a.nome, COUNT(p.id) as total FROM arquivos a LEFT JOIN procedimentos p ON p.arquivoId = a.id WHERE a.nome LIKE '%geap%' GROUP BY a.id"
);
console.log('Procedimentos por arquivo:', procs);

await conn.end();
