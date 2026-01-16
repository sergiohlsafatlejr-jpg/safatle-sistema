import { getDb } from "./server/db";
import { procedimentos, arquivos, convenios } from "./drizzle/schema";
import { eq, like, and, sql } from "drizzle-orm";

async function check() {
  const db = await getDb();
  if (!db) {
    console.log("DB not connected");
    return;
  }
  
  // Find Saude Caixa files
  const saudeCaixaFiles = await db
    .select({
      id: arquivos.id,
      nome: arquivos.nome,
      convenioId: arquivos.convenioId,
      convenioNome: convenios.nome,
      status: arquivos.status,
    })
    .from(arquivos)
    .leftJoin(convenios, eq(arquivos.convenioId, convenios.id))
    .where(like(arquivos.nome, "%saude%caixa%"));
  
  console.log("Arquivos Saúde Caixa:", saudeCaixaFiles);
  
  // Check procedures for these files
  for (const file of saudeCaixaFiles) {
    const procs = await db
      .select({
        total: sql<number>`count(*)`,
        comGlosa: sql<number>`SUM(CASE WHEN valor_glosado IS NOT NULL AND valor_glosado != '' AND valor_glosado != '0' THEN 1 ELSE 0 END)`,
        comMotivo: sql<number>`SUM(CASE WHEN motivo_glosa IS NOT NULL AND motivo_glosa != '' THEN 1 ELSE 0 END)`,
        totalGlosado: sql<number>`SUM(CAST(COALESCE(valor_glosado, 0) AS DECIMAL(12,2)))`,
      })
      .from(procedimentos)
      .where(eq(procedimentos.arquivoId, file.id));
    
    console.log(`\nArquivo ${file.nome} (ID: ${file.id}):`);
    console.log(`  Total: ${procs[0]?.total}, Com Glosa: ${procs[0]?.comGlosa}, Com Motivo: ${procs[0]?.comMotivo}`);
    console.log(`  Total Glosado: R$ ${procs[0]?.totalGlosado}`);
    
    // Show first 3 procedures
    const sample = await db
      .select({
        codigo: procedimentos.codigo,
        descricao: procedimentos.descricao,
        valorTotal: procedimentos.valorTotal,
        valorGlosado: procedimentos.valorGlosado,
        motivoGlosa: procedimentos.motivoGlosa,
      })
      .from(procedimentos)
      .where(eq(procedimentos.arquivoId, file.id))
      .limit(3);
    
    console.log("  Amostra:");
    sample.forEach(p => {
      console.log(`    ${p.codigo}: valorTotal=${p.valorTotal}, valorGlosado=${p.valorGlosado}, motivo=${p.motivoGlosa}`);
    });
  }
}

check().catch(console.error);
