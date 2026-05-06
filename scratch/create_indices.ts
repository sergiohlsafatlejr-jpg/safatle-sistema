import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) return;

  console.log("Creating indices on tasy_faturado_itens_bi...");
  
  try {
    await db.execute(sql`CREATE INDEX idx_tasy_faturado_bi_estab ON tasy_faturado_itens_bi(estabelecimentoId)`);
    console.log("Created idx_tasy_faturado_bi_estab");
  } catch (e: any) { console.log(e.message); }

  try {
    await db.execute(sql`CREATE INDEX idx_tasy_faturado_bi_comp ON tasy_faturado_itens_bi(COMPETENCIA)`);
    console.log("Created idx_tasy_faturado_bi_comp");
  } catch (e: any) { console.log(e.message); }

  try {
    await db.execute(sql`CREATE INDEX idx_tasy_faturado_bi_conv ON tasy_faturado_itens_bi(CONVENIO(100))`);
    console.log("Created idx_tasy_faturado_bi_conv");
  } catch (e: any) { console.log(e.message); }

  try {
    await db.execute(sql`CREATE INDEX idx_tasy_faturado_bi_setor ON tasy_faturado_itens_bi(SETOR(100))`);
    console.log("Created idx_tasy_faturado_bi_setor");
  } catch (e: any) { console.log(e.message); }

  console.log("Indices creation finished.");
  process.exit(0);
}
run();
