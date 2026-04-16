import 'dotenv/config';
import fs from 'fs';
import mysql from 'mysql2/promise';

async function run() {
  const c = await mysql.createConnection('mysql://root:@localhost:3306/safatle_sistema?timezone=Z');
  const [rows] = await c.query('SELECT querySql, conexaoConfig FROM query_configuracoes WHERE id=103;');
  
  // Restore JSON
  let conf = rows[0].conexaoConfig;
  if(typeof conf === 'string') conf = JSON.parse(conf);
  conf.tabelaDestinoBi = "tasy_faturado_itens_bi";
  const jsonStr = JSON.stringify(conf);

  await c.query('UPDATE query_configuracoes SET conexaoConfig = ? WHERE id = 103;', [jsonStr]);
  console.log('UPDATE DONE');
  c.end();
}

run().catch(console.error);
