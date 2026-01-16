import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { like, desc, sql } from "drizzle-orm";
import * as schema from "./drizzle/schema.ts";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: "default" });

// Buscar procedimentos da Unimed com glosa
const procs = await db.execute(sql`
  SELECT p.id, p.codigo, LEFT(p.descricao, 30) as descricao, 
         p.valorTotal, p.valorGlosado, LEFT(p.motivoGlosa, 50) as motivoGlosa, 
         a.nome as arquivo
  FROM procedimentos p
  JOIN arquivos a ON p.arquivoId = a.id
  WHERE a.nome LIKE '%0278119%' OR a.nome LIKE '%unimed%'
  ORDER BY p.valorGlosado DESC
  LIMIT 20
`);

console.log('=== Procedimentos Unimed com maior glosa ===');
console.log(procs[0]);

// Contar total de procedimentos com glosa
const stats = await db.execute(sql`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN p.valorGlosado > 0 THEN 1 ELSE 0 END) as comGlosa,
    SUM(CASE WHEN p.motivoGlosa IS NOT NULL AND p.motivoGlosa != '' THEN 1 ELSE 0 END) as comMotivo,
    SUM(p.valorGlosado) as totalGlosado
  FROM procedimentos p
  JOIN arquivos a ON p.arquivoId = a.id
  WHERE a.nome LIKE '%0278119%' OR a.nome LIKE '%unimed%'
`);

console.log('\n=== Estatísticas ===');
console.log(stats[0]);

await connection.end();
