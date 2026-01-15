import { db } from './server/db.ts';
import { procedimentos, arquivos, convenios } from './drizzle/schema.ts';
import { eq, sql, and, isNotNull, gt } from 'drizzle-orm';

// Buscar arquivos retornados da Unimed
const arquivosUnimed = await db.select({
  id: arquivos.id,
  nome: arquivos.nome,
  convenioNome: convenios.nome,
  direcao: arquivos.direcao,
})
.from(arquivos)
.leftJoin(convenios, eq(arquivos.convenioId, convenios.id))
.where(sql`${convenios.nome} LIKE '%Unimed%' AND ${arquivos.direcao} = 'retornado'`)
.limit(5);

console.log('=== ARQUIVOS UNIMED RETORNADOS ===');
console.log(arquivosUnimed);

if (arquivosUnimed.length > 0) {
  // Buscar procedimentos do primeiro arquivo
  const procs = await db.select({
    id: procedimentos.id,
    codigo: procedimentos.codigo,
    descricao: procedimentos.descricao,
    valorTotal: procedimentos.valorTotal,
    valorGlosado: procedimentos.valorGlosado,
    motivoGlosa: procedimentos.motivoGlosa,
    dadosExtras: procedimentos.dadosExtras,
  })
  .from(procedimentos)
  .where(eq(procedimentos.arquivoId, arquivosUnimed[0].id))
  .limit(10);

  console.log('\n=== PROCEDIMENTOS DO ARQUIVO ===');
  for (const proc of procs) {
    console.log({
      codigo: proc.codigo,
      valorTotal: proc.valorTotal,
      valorGlosado: proc.valorGlosado,
      motivoGlosa: proc.motivoGlosa,
      dadosExtras: proc.dadosExtras ? JSON.stringify(proc.dadosExtras).substring(0, 200) : null
    });
  }

  // Contar glosados
  const glosados = await db.select({
    count: sql<number>`COUNT(*)`,
    totalGlosado: sql<number>`SUM(${procedimentos.valorGlosado})`,
  })
  .from(procedimentos)
  .where(and(
    eq(procedimentos.arquivoId, arquivosUnimed[0].id),
    gt(procedimentos.valorGlosado, 0)
  ));

  console.log('\n=== RESUMO GLOSADOS ===');
  console.log(glosados[0]);
}
