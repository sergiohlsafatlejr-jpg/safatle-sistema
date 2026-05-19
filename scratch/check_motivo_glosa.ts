import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // Check ALL distinct MOTIVO_GLOSA codes
  const [motivos] = await conn.execute(`
    SELECT DISTINCT MOTIVO_GLOSA, COUNT(*) as cnt
    FROM tasy_faturado_itens_bi 
    WHERE CAST(VL_GLOSA AS DECIMAL(15,2)) > 0
    GROUP BY MOTIVO_GLOSA 
    ORDER BY cnt DESC
  `);
  console.log('=== ALL MOTIVO_GLOSA codes ===');
  for (const m of motivos as any[]) {
    console.log(`  code="${m.MOTIVO_GLOSA}" => ${m.cnt} registros`);
  }

  // Check if there's a DS_MOTIVO_GLOSA or similar descriptive column
  const [cols] = await conn.execute(`SHOW COLUMNS FROM tasy_faturado_itens_bi`);
  console.log('\n=== ALL COLUMNS ===');
  for (const c of cols as any[]) {
    console.log(`  ${c.Field}`);
  }

  // Check which estab this is about (user sees PSI)
  const [estab1] = await conn.execute(`
    SELECT estabelecimentoId, COUNT(*) as cnt,
      SUM(CASE WHEN MOTIVO_GLOSA = '0' THEN 1 ELSE 0 END) as code0,
      SUM(CASE WHEN MOTIVO_GLOSA != '0' AND MOTIVO_GLOSA IS NOT NULL THEN 1 ELSE 0 END) as codeNon0
    FROM tasy_faturado_itens_bi 
    WHERE CAST(VL_GLOSA AS DECIMAL(15,2)) > 0
    GROUP BY estabelecimentoId
  `);
  console.log('\n=== PER ESTAB: motivo "0" vs non-0 ===');
  for (const e of estab1 as any[]) {
    console.log(`  estab=${e.estabelecimentoId}: total=${e.cnt}, code="0"=${e.code0}, non-0=${e.codeNon0}`);
  }

  // Check if there's a separate motivos table  
  try {
    const [tables] = await conn.execute(`SHOW TABLES LIKE '%motivo%'`);
    console.log('\n=== Tables with "motivo" in name ===');
    for (const t of tables as any[]) {
      console.log(`  ${Object.values(t)[0]}`);
    }
  } catch(e) {}

  // Check DS_MOTIVO_GLOSA field exists
  try {
    const [hasDsMotivo] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tasy_faturado_itens_bi' 
      AND COLUMN_NAME LIKE '%MOTIVO%'
    `);
    console.log('\n=== Columns matching "MOTIVO" ===');
    for (const c of hasDsMotivo as any[]) {
      console.log(`  ${c.COLUMN_NAME}`);
    }
  } catch(e) {}

  await conn.end();
}

main().catch(console.error);
