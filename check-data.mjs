import { createClient } from "@libsql/client";

const db = createClient({ url: process.env.DATABASE_URL });

async function main() {
  // atendimentos_unificados por estabelecimento
  const r1 = await db.execute("SELECT estabelecimentoId, origemSistema, COUNT(*) as total FROM atendimentos_unificados GROUP BY estabelecimentoId, origemSistema ORDER BY estabelecimentoId");
  console.log("=== atendimentos_unificados por estabelecimento ===");
  console.table(r1.rows);

  // atendimentos_sem_conta por estabelecimento
  const r2 = await db.execute("SELECT estabelecimentoId, origemSistema, COUNT(*) as total FROM atendimentos_sem_conta GROUP BY estabelecimentoId, origemSistema ORDER BY estabelecimentoId");
  console.log("\n=== atendimentos_sem_conta por estabelecimento ===");
  console.table(r2.rows);

  // atendimentos_a_faturar por estabelecimento
  const r3 = await db.execute("SELECT estabelecimentoId, origemSistema, COUNT(*) as total FROM atendimentos_a_faturar GROUP BY estabelecimentoId, origemSistema ORDER BY estabelecimentoId");
  console.log("\n=== atendimentos_a_faturar por estabelecimento ===");
  console.table(r3.rows);

  // warleine_atendimentos_staging por estabelecimento
  const r4 = await db.execute("SELECT estabelecimentoId, COUNT(*) as total FROM warleine_atendimentos_staging GROUP BY estabelecimentoId ORDER BY estabelecimentoId");
  console.log("\n=== warleine_atendimentos_staging por estabelecimento ===");
  console.table(r4.rows);

  // estabelecimentos
  const r5 = await db.execute("SELECT id, nome, cnpj FROM estabelecimentos ORDER BY id");
  console.log("\n=== estabelecimentos ===");
  console.table(r5.rows);

  // Verificar a procedure: de onde a tela Atendimentos busca dados
  console.log("\n=== FLUXO DE DADOS ===");
  console.log("Tela Atendimentos -> procedure atendimentos.listar -> tabela atendimentos_sem_conta (filtrado por estabelecimentoId)");
  console.log("Tela Atendimentos a Faturar -> procedure atendimentosFaturar.listar -> tabela atendimentos_a_faturar (filtrado por estabelecimentoId)");
  console.log("\nA tela NÃO consulta atendimentos_unificados. Consulta diretamente as tabelas staging.");
}

main().catch(console.error);
