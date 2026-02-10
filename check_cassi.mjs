import { createConnection } from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await createConnection(dbUrl);

const [files] = await conn.execute(`
  SELECT a.id, a.nome, a.totalItens, a.itensProcessados, a.status
  FROM arquivos a 
  WHERE a.id IN (1020280, 1020281, 1020282, 1020283, 1020284, 1020285)
  ORDER BY a.id
`);
console.log('\n=== ARQUIVOS CASSI ===');
console.table(files);

const [demoCounts] = await conn.execute(`
  SELECT arquivo_id, COUNT(*) as total_itens, 
    ROUND(SUM(CAST(valor_pago AS DECIMAL(12,2))),2) as total_pago,
    ROUND(SUM(CAST(valor_glosa AS DECIMAL(12,2))),2) as total_glosa,
    ROUND(SUM(CAST(valor_informado AS DECIMAL(12,2))),2) as total_informado
  FROM demonstrativo 
  WHERE arquivo_id IN (1020280, 1020281, 1020282, 1020283, 1020284, 1020285) 
  GROUP BY arquivo_id ORDER BY arquivo_id
`);
console.log('\n=== DEMONSTRATIVO POR ARQUIVO ===');
console.table(demoCounts);

const [recebCounts] = await conn.execute(`
  SELECT arquivo_id, COUNT(*) as total
  FROM recebimento_tiss 
  WHERE arquivo_id IN (1020280, 1020281, 1020282, 1020283, 1020284, 1020285) 
  GROUP BY arquivo_id ORDER BY arquivo_id
`);
console.log('\n=== RECEBIMENTO_TISS POR ARQUIVO ===');
console.table(recebCounts);

try {
  const [retornoCounts] = await conn.execute(`
    SELECT arquivo_id, COUNT(*) as total
    FROM retorno_tiss_unificado 
    WHERE arquivo_id IN (1020280, 1020281, 1020282, 1020283, 1020284, 1020285) 
    GROUP BY arquivo_id ORDER BY arquivo_id
  `);
  console.log('\n=== RETORNO_TISS_UNIFICADO POR ARQUIVO ===');
  console.table(retornoCounts);
} catch(e) { console.log('retorno_tiss_unificado: tabela não encontrada ou vazia'); }

await conn.end();
