import "dotenv/config";
import { getDb } from "./server/db.js";

async function run() {
  const db = await getDb();
  if (!db) return;

  // Descobrir o ID do Hemolabor
  const [estabs] = await db.execute(`
    SELECT id, nome FROM estabelecimentos WHERE nome LIKE '%hemolabor%' OR nome LIKE '%Hemolabor%'
  `);
  console.log('Estabelecimentos Hemolabor:', JSON.stringify(estabs, null, 2));

  // Verificar quantos registros existem por estabelecimento
  const [counts] = await db.execute(`
    SELECT estabelecimentoId, COUNT(*) as total 
    FROM tasy_faturado_itens_bi 
    GROUP BY estabelecimentoId
  `);
  console.log('\nRegistros por estabelecimento:', JSON.stringify(counts, null, 2));

  process.exit(0);
}
run();
