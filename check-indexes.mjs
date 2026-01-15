import { getDb } from './server/_core/db.js';
import { sql } from 'drizzle-orm';

const db = await getDb();

// Verificar índices nas tabelas principais
const tables = ['procedimentos', 'arquivos', 'divergencias', 'recursosGlosa', 'comparacoes'];

for (const table of tables) {
  console.log(`\n=== Índices da tabela ${table} ===`);
  try {
    const result = await db.execute(sql.raw(`SHOW INDEX FROM ${table}`));
    console.log(result[0]);
  } catch (e) {
    console.log('Erro:', e.message);
  }
}

// Verificar quantidade de registros
console.log('\n=== Quantidade de registros ===');
for (const table of tables) {
  try {
    const result = await db.execute(sql.raw(`SELECT COUNT(*) as total FROM ${table}`));
    console.log(`${table}: ${result[0][0].total} registros`);
  } catch (e) {
    console.log(`${table}: Erro - ${e.message}`);
  }
}

process.exit(0);
