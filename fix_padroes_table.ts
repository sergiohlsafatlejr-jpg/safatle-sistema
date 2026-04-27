import 'dotenv/config';
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("DB null"); process.exit(1); }

  // 1. Check current state
  const [rows] = await db.execute(sql.raw('SELECT id, COUNT(*) as cnt FROM padroesCobranca GROUP BY id ORDER BY cnt DESC LIMIT 20'));
  console.log("Current ID distribution:", JSON.stringify(rows));

  // 2. Check total count
  const [total] = await db.execute(sql.raw('SELECT COUNT(*) as total FROM padroesCobranca'));
  console.log("Total rows:", JSON.stringify(total));

  // 3. Assign unique IDs to rows with id=0
  // First, add a temporary auto_increment column, copy its value, then drop it
  // Or simply: update each row with a unique ID using a variable
  
  // Check if there's existing data worth keeping
  const [sample] = await db.execute(sql.raw('SELECT * FROM padroesCobranca LIMIT 3'));
  console.log("Sample data:", JSON.stringify((sample as any[]).map(r => ({
    id: r.id, 
    codigo: r.codigoProcedimentoPrincipal, 
    desc: r.descricaoProcedimentoPrincipal,
    ocorrencias: r.totalOcorrencias,
    isGabarito: r.isGabarito
  }))));

  // 4. Fix: Assign unique IDs using MySQL user variable
  console.log("\nFixing IDs...");
  await db.execute(sql.raw('SET @row_num = 0'));
  await db.execute(sql.raw(`
    UPDATE padroesCobranca 
    SET id = (@row_num := @row_num + 1)
    ORDER BY createdAt ASC
  `));
  console.log("IDs assigned successfully");

  // 5. Now add PRIMARY KEY and AUTO_INCREMENT
  console.log("Adding PRIMARY KEY...");
  await db.execute(sql.raw('ALTER TABLE padroesCobranca ADD PRIMARY KEY (id)'));
  console.log("PRIMARY KEY added");

  console.log("Adding AUTO_INCREMENT...");
  await db.execute(sql.raw('ALTER TABLE padroesCobranca MODIFY id INT NOT NULL AUTO_INCREMENT'));
  console.log("AUTO_INCREMENT added");

  // 6. Verify
  const [verify] = await db.execute(sql.raw('SHOW CREATE TABLE padroesCobranca'));
  const createTable = (verify as any[])[0]['Create Table'];
  const hasAutoIncrement = createTable.includes('AUTO_INCREMENT');
  console.log(`\nVerification: AUTO_INCREMENT = ${hasAutoIncrement}`);
  
  console.log("\n✅ Tabela padroesCobranca corrigida com sucesso!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
