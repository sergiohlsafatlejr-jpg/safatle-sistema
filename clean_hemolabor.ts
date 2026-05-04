import "dotenv/config";
import { getDb } from "./server/db.js";

async function run() {
  const db = await getDb();
  if (!db) return;

  const estabId = 6; // Hemolabor
  
  console.log(`Limpando tasy_faturado_itens_bi para estabelecimentoId = ${estabId} (Hemolabor)...`);
  
  const [result] = await db.execute(
    `DELETE FROM tasy_faturado_itens_bi WHERE estabelecimentoId = ${estabId}`
  );
  
  console.log(`Deletados: ${(result as any)?.affectedRows || 0} registros`);
  
  // Verificar se ficou limpo
  const [check] = await db.execute(
    `SELECT COUNT(*) as total FROM tasy_faturado_itens_bi WHERE estabelecimentoId = ${estabId}`
  );
  console.log('Restantes:', JSON.stringify(check));
  
  console.log('Done!');
  process.exit(0);
}
run();
