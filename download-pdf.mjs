import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { arquivos } from "./drizzle/schema.js";
import { desc, eq } from "drizzle-orm";
import { storageGet } from "./server/storage.ts";
import * as fs from "fs";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  // Get latest PDF file
  const [pdf] = await db.select().from(arquivos).where(eq(arquivos.tipoArquivo, 'pdf')).orderBy(desc(arquivos.id)).limit(1);
  
  if (!pdf) {
    console.log('No PDF found');
    await connection.end();
    return;
  }
  
  console.log('PDF:', pdf.nome);
  console.log('S3 Key:', pdf.s3Key);
  
  // Get presigned URL
  const { url } = await storageGet(pdf.s3Key);
  console.log('Presigned URL:', url);
  
  // Download the file
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  
  fs.writeFileSync('downloaded-pdf.pdf', buffer);
  console.log('Downloaded to downloaded-pdf.pdf, size:', buffer.length);
  
  await connection.end();
}

main().catch(console.error);
