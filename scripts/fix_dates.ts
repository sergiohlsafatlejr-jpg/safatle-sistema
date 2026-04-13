import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  const [rows] = await conn.query('SELECT id, DT_MESANO_REFERENCIA FROM tasy_protocolo_bi WHERE DT_MESANO_REFERENCIA NOT LIKE "%202%"');
  console.log(`Encontrados ${Array.isArray(rows) ? rows.length : 0} registros com data em formato texto do Oracle.`);
  
  const mesesMap: Record<string, string> = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
  };

  let atualizados = 0;
  for (const row of rows as any[]) {
    // Exemplo: '01-APR-25'
    const match = row.DT_MESANO_REFERENCIA.match(/^(\d{2})-([A-Z]{3})-(\d{2})$/i);
    if (match) {
      const day = match[1];
      const mon = mesesMap[match[2].toUpperCase()] || '01';
      const year = `20${match[3]}`;
      const newDateStr = `${year}-${mon}-${day} 00:00:00`;
      
      await conn.query('UPDATE tasy_protocolo_bi SET DT_MESANO_REFERENCIA = ? WHERE id = ?', [newDateStr, row.id]);
      atualizados++;
    }
  }

  console.log(`Fixo com sucesso! ${atualizados} datas consolidadas para padrão internacional YYYY-MM-DD.`);
  process.exit(0);
}

main();
