import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { procedimentos, arquivos } from "./drizzle/schema.js";
import { desc, eq } from "drizzle-orm";

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
  console.log('S3 URL:', pdf.s3Url);
  console.log('S3 Key:', pdf.s3Key);
  
  // Get all procedimentos with dadosExtras
  const procs = await db.select().from(procedimentos).where(eq(procedimentos.arquivoId, pdf.id)).limit(5);
  
  console.log('\nProcedimentos com dadosExtras:');
  for (const p of procs) {
    console.log(`Código: ${p.codigo}`);
    console.log(`dadosExtras:`, JSON.stringify(p.dadosExtras, null, 2));
    console.log('---');
  }
  
  await connection.end();
}

main().catch(console.error);
