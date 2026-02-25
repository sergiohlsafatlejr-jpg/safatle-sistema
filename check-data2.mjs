import { drizzle } from 'drizzle-orm/mysql2';

const db = drizzle(process.env.DATABASE_URL);

async function main() {
  const [result] = await db.execute('SELECT estabelecimentoId, origemSistema, descricao_atendimento, COUNT(*) as total FROM atendimentos_unificados GROUP BY estabelecimentoId, origemSistema, descricao_atendimento ORDER BY total DESC');
  console.log('=== atendimentos_unificados ===');
  console.table(result);

  const [result2] = await db.execute('SELECT estabelecimentoId, COUNT(*) as total FROM warleine_atendimentos_staging GROUP BY estabelecimentoId');
  console.log('\n=== warleine_atendimentos_staging ===');
  console.table(result2);

  const [result3] = await db.execute('SELECT estabelecimentoId, origemSistema, COUNT(*) as total FROM atendimentos_sem_conta GROUP BY estabelecimentoId, origemSistema');
  console.log('\n=== atendimentos_sem_conta ===');
  console.table(result3);

  const [result4] = await db.execute('SELECT estabelecimentoId, origemSistema, COUNT(*) as total FROM atendimentos_a_faturar GROUP BY estabelecimentoId, origemSistema');
  console.log('\n=== atendimentos_a_faturar ===');
  console.table(result4);

  const [result5] = await db.execute('SELECT id, nome FROM estabelecimentos ORDER BY id');
  console.log('\n=== estabelecimentos ===');
  console.table(result5);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
