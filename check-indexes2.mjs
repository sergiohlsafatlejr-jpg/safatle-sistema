import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar índices nas tabelas principais
const tables = ['procedimentos', 'arquivos', 'divergencias', 'recursosGlosa', 'comparacoes'];

for (const table of tables) {
  console.log(`\n=== Índices da tabela ${table} ===`);
  try {
    const [rows] = await connection.execute(`SHOW INDEX FROM ${table}`);
    rows.forEach(r => console.log(`  ${r.Key_name}: ${r.Column_name} (${r.Index_type})`));
  } catch (e) {
    console.log('Erro:', e.message);
  }
}

// Verificar quantidade de registros
console.log('\n=== Quantidade de registros ===');
for (const table of tables) {
  try {
    const [rows] = await connection.execute(`SELECT COUNT(*) as total FROM ${table}`);
    console.log(`${table}: ${rows[0].total} registros`);
  } catch (e) {
    console.log(`${table}: Erro - ${e.message}`);
  }
}

await connection.end();
