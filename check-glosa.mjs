import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

const [cols] = await conn.execute("SHOW COLUMNS FROM recebimentos_excel WHERE Field LIKE '%glosa%'");
console.log('Colunas com glosa:', cols);

const [sample] = await conn.execute("SELECT codigo_glosa, valor_glosa FROM recebimentos_excel WHERE codigo_glosa IS NOT NULL AND codigo_glosa != '' LIMIT 5");
console.log('Amostras com codigo_glosa:', sample);

// Verificar se existe dicionario_glosas
try {
  const [dict] = await conn.execute("SHOW TABLES LIKE '%glosa%'");
  console.log('Tabelas com glosa:', dict);
} catch(e) {}

await conn.end();
