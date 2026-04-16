import 'dotenv/config';
import fs from 'fs';
import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';
import oracledb from 'oracledb';

async function forceSync() {
  oracledb.initOracleClient({ libDir: 'C:\\\\Oracle\\\\instantclient_23_0' });
  const connection = await oracledb.getConnection({
    connectString: '192.168.0.241:1521/tasy',
    user: 'SAFATLE',
    password: 'Ro2#D7#Syd9'
  });
  
  const db = await getDb();
  if(!db) throw new Error("No DB");

  const qObj = await db.execute(sql.raw('SELECT querySql FROM query_configuracoes WHERE id = 103;'));
  const originalQ = qObj[0][0].querySql;
  const finalQ = originalQ.replace(/:last_sync_date/gi, "TIMESTAMP '1900-01-01 00:00:00'");
  
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.fetchAsString = [oracledb.DATE, oracledb.CLOB];
  
  const result = await connection.execute(finalQ, {}, { resultSet: true, prefetchRows: 2000 });
  const rs = result.resultSet;
  
  let buffer: any[] = [];
  let totalInserted = 0;
  let row;
  
  while ((row = await rs.getRow())) {
    buffer.push(row);
    if (buffer.length >= 2000) {
      const colunas = Object.keys(buffer[0]);
      const insertCols = ['`configId`', '`estabelecimentoId`', ...colunas.map(c => `\`${c}\``)].join(', ');
      const valoresLote = buffer.map(br => {
        const vals = [103, 6, ...colunas.map(c => {
          let v = br[c];
          if (v === null || v === undefined) return "NULL";
          return `'${String(v).replace(/'/g, "''")}'`;
        })];
        return `(${vals.join(", ")})`;
      }).join(",\\n");
      const sqlInsert = `REPLACE INTO \`tasy_faturado_itens_bi\` (${insertCols}) VALUES ${valoresLote}`;
      await db.execute(sql.raw(sqlInsert));
      totalInserted += buffer.length;
      console.log('Inserted: ' + totalInserted);
      buffer = [];
      if (totalInserted >= 50000) {
        process.exit(0);
      }
    }
  }
}

forceSync().catch(console.error);
