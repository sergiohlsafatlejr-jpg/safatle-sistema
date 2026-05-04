import "dotenv/config";
import { getDb } from "./server/db.js";

async function run() {
  const db = await getDb();
  if (!db) return;

  // Verificar tamanho das tabelas envolvidas
  const tables = ['staging_faturamento_xml', 'demonstrativo', 'faturamento_unificado', 'conciliados_automatico'];
  for (const t of tables) {
    try {
      const [rows] = await db.execute(`SELECT COUNT(*) as total FROM ${t} WHERE estabelecimentoId = 6`);
      console.log(`${t}: ${(rows as any[])[0].total} rows`);
    } catch { console.log(`${t}: N/A`); }
  }

  // Verificar índices existentes
  for (const t of ['staging_faturamento_xml', 'demonstrativo']) {
    try {
      const [idx] = await db.execute(`SHOW INDEX FROM ${t}`);
      const indices = (idx as any[]).map(i => `${i.Key_name}(${i.Column_name})`);
      console.log(`\nÍndices ${t}:`, [...new Set(indices)].join(', '));
    } catch { }
  }

  // Criar índices otimizados
  const indices = [
    { table: 'staging_faturamento_xml', name: 'idx_sfx_estab_lote', cols: 'estabelecimentoId, numero_lote' },
    { table: 'staging_faturamento_xml', name: 'idx_sfx_estab_conv_lote', cols: 'estabelecimentoId, convenioId, numero_lote' },
    { table: 'demonstrativo', name: 'idx_demo_estab_lote', cols: 'estabelecimentoId, lote_prestador, protocolo' },
    { table: 'demonstrativo', name: 'idx_demo_estab_conv_lote', cols: 'estabelecimentoId, convenio_id, lote_prestador' },
    { table: 'conciliados_automatico', name: 'idx_ca_estab_comp_status', cols: 'estabelecimentoId, competencia, statusConciliacao' },
  ];

  for (const idx of indices) {
    try {
      await db.execute(`CREATE INDEX ${idx.name} ON ${idx.table} (${idx.cols})`);
      console.log(`✅ Índice ${idx.name} criado em ${idx.table}`);
    } catch (e: any) {
      if (e.message?.includes('Duplicate')) {
        console.log(`⏭️ Índice ${idx.name} já existe`);
      } else {
        console.log(`❌ Erro ${idx.name}: ${e.message?.substring(0, 80)}`);
      }
    }
  }

  process.exit(0);
}
run();
