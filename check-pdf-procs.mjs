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
  
  console.log('PDF:', pdf.nome, '- Status:', pdf.status);
  
  // Get procedimentos from this file
  const procs = await db.select().from(procedimentos).where(eq(procedimentos.arquivoId, pdf.id)).limit(20);
  
  console.log('\nTotal procedimentos:', procs.length);
  console.log('\nPrimeiros 10 procedimentos:');
  for (const p of procs.slice(0, 10)) {
    console.log(`- Código: ${p.codigo}, Descrição: ${p.descricao || 'N/A'}, Valor: ${p.valorTotal || 'N/A'}`);
  }
  
  await connection.end();
}

main().catch(console.error);
