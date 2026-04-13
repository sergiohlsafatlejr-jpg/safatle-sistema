import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.query(`
    SELECT competencia, SUM(CAST(vlProduzido AS DECIMAL(15,2))) as total
    FROM tasy_relatorio_financeiro_staging
    WHERE convenio LIKE '%Ipasgo%'
    GROUP BY competencia
  `);
  console.table(rows);
  process.exit(0);
}
main();
