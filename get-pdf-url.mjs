import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { arquivos } from "./drizzle/schema.js";
import { desc, eq } from "drizzle-orm";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  const pdfs = await db.select().from(arquivos).where(eq(arquivos.tipoArquivo, 'pdf')).orderBy(desc(arquivos.id)).limit(5);
  
  for (const pdf of pdfs) {
    console.log('ID:', pdf.id);
    console.log('Nome:', pdf.nome);
    console.log('Status:', pdf.status);
    console.log('S3 URL:', pdf.s3Url);
    console.log('---');
  }
  
  await connection.end();
}

main().catch(console.error);
