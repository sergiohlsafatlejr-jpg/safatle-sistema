import "dotenv/config";
import { getDb } from "./server/db.js";

async function run() {
  const db = await getDb();
  if (!db) return;

  // 1. Fix: converter todos os divergentes com diferenca > 0 para glosado
  console.log('=== CORRIGINDO DIVERGENTES COM DIFERENÇA > 0 ===');
  
  // Primeiro mostrar quantos existem
  const [antes] = await db.execute(`
    SELECT COUNT(*) as total, ROUND(SUM(diferenca),2) as somaDiferenca
    FROM conciliados_automatico 
    WHERE statusConciliacao = 'divergente' AND diferenca > 0
  `);
  console.log('Antes:', JSON.stringify(antes));

  // Corrigir: converter divergente -> glosado quando diferenca > 0
  // Também atribuir código 5007 quando não há motivo de glosa
  const [result] = await db.execute(`
    UPDATE conciliados_automatico 
    SET statusConciliacao = 'glosado',
        valorGlosa = diferenca,
        codigoGlosa = CASE WHEN codigoGlosa IS NULL AND motivoGlosa IS NULL THEN '5007' ELSE codigoGlosa END,
        motivoGlosa = CASE WHEN codigoGlosa IS NULL AND motivoGlosa IS NULL THEN 'Glosa Automática - Valor divergente sem motivo no demonstrativo' ELSE motivoGlosa END
    WHERE statusConciliacao = 'divergente' AND diferenca > 0
  `);
  console.log('Atualizados:', (result as any)?.affectedRows || 0);

  // Verificar depois
  const [depois] = await db.execute(`
    SELECT COUNT(*) as total
    FROM conciliados_automatico 
    WHERE statusConciliacao = 'divergente' AND diferenca > 0
  `);
  console.log('Depois:', JSON.stringify(depois));

  // 2. Refresh fato_conciliacao_guias para TODAS as guias afetadas
  console.log('\n=== REFRESHING FATO_CONCILIACAO_GUIAS ===');
  
  // Buscar estabelecimentos e competências afetados
  const [estabs] = await db.execute(`
    SELECT DISTINCT estabelecimentoId, competencia FROM conciliados_automatico
    WHERE statusConciliacao = 'glosado' AND metodoConciliacao IS NOT NULL
  `);
  
  for (const row of estabs as any[]) {
    const estId = row.estabelecimentoId;
    const comp = row.competencia;
    console.log(`Refreshing estab=${estId}, comp=${comp}...`);
    
    const compWhere = comp ? `AND competencia = '${comp}'` : '';
    
    // Deletar fato antiga
    await db.execute(`
      DELETE FROM fato_conciliacao_guias 
      WHERE estabelecimentoId = ${estId} ${compWhere}
    `);
    
    // Reinserir
    await db.execute(`
      INSERT INTO fato_conciliacao_guias (
        estabelecimentoId, competencia, convenioId, convenio, guia, pacienteNome,
        valorFaturado, valorPago, valorGlosa, diferenca, statusGuia,
        totalItens, itensConciliados, itensDivergentes, itensGlosados, itensNaoRecebidos, itensTerceiros
      )
      SELECT
        estabelecimentoId, MAX(competencia), MAX(convenioId), MAX(convenio),
        COALESCE(numeroGuia, contaNumero) as guia, MAX(pacienteNome),
        COALESCE(SUM(valorFaturado), 0), COALESCE(SUM(valorPago), 0), COALESCE(SUM(valorGlosa), 0), COALESCE(SUM(diferenca), 0),
        CASE
          WHEN SUM(CASE WHEN statusConciliacao IN ('nao_recebido', 'divergente') THEN 1 ELSE 0 END) = 0 THEN 'conciliado'
          WHEN SUM(CASE WHEN statusConciliacao = 'divergente' THEN 1 ELSE 0 END) > 0 THEN 'divergente'
          WHEN SUM(CASE WHEN statusConciliacao = 'nao_recebido' THEN 1 ELSE 0 END) > 0 THEN 'nao_recebido'
          WHEN SUM(CASE WHEN statusConciliacao = 'terceiro' THEN 1 ELSE 0 END) > 0 AND SUM(CASE WHEN statusConciliacao != 'terceiro' THEN 1 ELSE 0 END) = 0 THEN 'terceiro'
          ELSE 'glosado'
        END as statusGuia,
        COUNT(*),
        SUM(CASE WHEN statusConciliacao = 'conciliado' THEN 1 ELSE 0 END),
        SUM(CASE WHEN statusConciliacao = 'divergente' THEN 1 ELSE 0 END),
        SUM(CASE WHEN statusConciliacao = 'glosado' THEN 1 ELSE 0 END),
        SUM(CASE WHEN statusConciliacao = 'nao_recebido' THEN 1 ELSE 0 END),
        SUM(CASE WHEN statusConciliacao = 'terceiro' THEN 1 ELSE 0 END)
      FROM conciliados_automatico
      WHERE estabelecimentoId = ${estId} ${compWhere}
      GROUP BY COALESCE(numeroGuia, contaNumero), numeroGuia, contaNumero, estabelecimentoId
    `);
    console.log(`  Done.`);
  }

  // 3. Verificar guia 67445568
  console.log('\n=== VERIFICAÇÃO GUIA 67445568 ===');
  const [fato] = await db.execute(`
    SELECT guia, valorFaturado, valorPago, valorGlosa, diferenca, statusGuia, totalItens, itensGlosados, itensDivergentes
    FROM fato_conciliacao_guias WHERE guia = '67445568'
  `);
  console.log('FATO:', JSON.stringify(fato));

  const [soma] = await db.execute(`
    SELECT ROUND(SUM(valorPago),2) as somaPago, ROUND(SUM(valorGlosa),2) as somaGlosa, ROUND(SUM(diferenca),2) as somaDif,
           SUM(CASE WHEN statusConciliacao='glosado' THEN 1 ELSE 0 END) as glosados,
           SUM(CASE WHEN statusConciliacao='divergente' THEN 1 ELSE 0 END) as divergentes
    FROM conciliados_automatico WHERE numeroGuia = '67445568' OR contaNumero = '67445568'
  `);
  console.log('ITENS:', JSON.stringify(soma));

  const fatoRow = (fato as any[])[0];
  const somaRow = (soma as any[])[0];
  if (fatoRow && somaRow) {
    const match = Math.abs(Number(fatoRow.valorPago) - Number(somaRow.somaPago)) < 0.01;
    console.log(`\nRecebido: Header=${fatoRow.valorPago} | Itens=${somaRow.somaPago} | ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
    const matchG = Math.abs(Number(fatoRow.valorGlosa) - Number(somaRow.somaGlosa)) < 0.01;
    console.log(`Glosado:  Header=${fatoRow.valorGlosa} | Itens=${somaRow.somaGlosa} | ${matchG ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log(`Status: ${fatoRow.statusGuia} | Divergentes: ${somaRow.divergentes} | Glosados: ${somaRow.glosados}`);
  }

  process.exit(0);
}
run();
