import mysql from 'mysql2/promise';

async function run() {
  const c = await mysql.createConnection('mysql://root:@localhost:3306/safatle_sistema?timezone=Z');
  
  // Get ID 103
  const [rows] = await c.query('SELECT querySql FROM query_configuracoes WHERE id = 103;');
  if (!rows || rows.length === 0) {
    console.log("ID 103 not found.");
    c.end();
    return;
  }
  
  let q = rows[0].querySql;
  console.log("Original Ends With:", q.substring(q.length - 100));
  
  q = q.replace(/WHERE ENTRADA >= :last_sync_date/g, "WHERE DT_ATUALIZACAO >= :last_sync_date AND DT_ATUALIZACAO >= TO_DATE('01/01/2024','DD/MM/YYYY')");
  
  await c.query('UPDATE query_configuracoes SET querySql = ? WHERE id = 103', [q]);
  console.log('Fixed query WHERE clause in DB. New Ends With:', q.substring(q.length - 100));
  
  c.end();
}

run().catch(console.error);
