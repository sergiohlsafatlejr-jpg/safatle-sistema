import { drizzle } from 'drizzle-orm/mysql2';

const db = drizzle(process.env.DATABASE_URL);

async function main() {
  const [r1] = await db.execute('SELECT configId, estabelecimentoId, COUNT(*) as total FROM warleine_atendimentos_staging GROUP BY configId, estabelecimentoId ORDER BY total DESC');
  console.log('=== warleine_atendimentos_staging por configId ===');
  console.table(r1);

  const [r2] = await db.execute('SELECT id, estabelecimentoId, sistema, tipoDados, descricao FROM query_configuracoes');
  console.log('\n=== query_configuracoes ===');
  console.table(r2);

  const [r3] = await db.execute('SELECT origemSistema, origemId, COUNT(*) as total FROM atendimentos_unificados WHERE origemSistema = "WARLEINE" GROUP BY origemSistema, LEFT(origemId, LOCATE("-", origemId) - 1)');
  console.log('\n=== atendimentos_unificados WARLEINE por configId (prefixo origemId) ===');
  console.table(r3);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
