import fs from 'fs';
import mysql from 'mysql2/promise';

async function run() {
  const c = await mysql.createConnection('mysql://root:@localhost:3306/safatle_sistema?timezone=Z');
  const [rows] = await c.query('SELECT querySql FROM query_configuracoes WHERE id=103;');
  let q = rows[0].querySql;
  
  if (q.endsWith("'))")) {
      q = q.slice(0, -1);
  } else if (q.endsWith("))")) {
      q = q.slice(0, -1);
  }

  await c.query('UPDATE query_configuracoes SET querySql = ? WHERE id = 103;', [q]);
  console.log('UPDATE DONE');
  console.log(q.substring(q.length - 150));
  c.end();
}

run().catch(console.error);
