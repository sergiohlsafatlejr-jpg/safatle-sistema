import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [tables] = await conn.query("SHOW TABLES LIKE '%drizzle%'");
  console.log('Drizzle tables:', tables);
  const [journal] = await conn.query("SELECT * FROM __drizzle_migrations ORDER BY id DESC LIMIT 10");
  console.log('Last migrations:');
  for (const m of journal) {
    console.log(`  ${m.id}: ${m.hash} - created_at: ${m.created_at}`);
  }
} catch (e) {
  console.log('No drizzle migrations table found');
}
await conn.end();
