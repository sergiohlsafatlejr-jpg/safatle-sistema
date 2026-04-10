import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed.");
    process.exit(1);
  }

  console.log("🚀 Iniciando otimização de banco de dados (Criação de Índices)...");

  // Lista de índices a serem criados
  // Formato: { tabela: "nome_tabela", ddl: "ALTER TABLE nome_tabela ADD INDEX idx_nome (coluna)" }
  const indexes = [
    // --- FATURAMENTO UNIFICADO ---
    { table: "faturamento_unificado", name: "idx_fu_est_comp", ddl: "ALTER TABLE faturamento_unificado ADD INDEX idx_fu_est_comp (estabelecimentoId, competencia);" },
    { table: "faturamento_unificado", name: "idx_fu_status", ddl: "ALTER TABLE faturamento_unificado ADD INDEX idx_fu_status (statusConciliacao);" },
    { table: "faturamento_unificado", name: "idx_fu_convenio", ddl: "ALTER TABLE faturamento_unificado ADD INDEX idx_fu_convenio (convenioId);" },
    
    // --- DEMONSTRATIVO ---
    { table: "demonstrativo", name: "idx_dem_est_comp", ddl: "ALTER TABLE demonstrativo ADD INDEX idx_dem_est_comp (estabelecimentoId, competencia);" },
    { table: "demonstrativo", name: "idx_dem_guia", ddl: "ALTER TABLE demonstrativo ADD INDEX idx_dem_guia (numero_guia);" },

    // --- RECEBIMENTOS EXCEL ---
    { table: "recebimentos_excel", name: "idx_rec_est_data", ddl: "ALTER TABLE recebimentos_excel ADD INDEX idx_rec_est_data (estabelecimentoId, data_referencia);" },
    { table: "recebimentos_excel", name: "idx_rec_paciente", ddl: "ALTER TABLE recebimentos_excel ADD INDEX idx_rec_paciente (nome_beneficiario(30));" },

    // --- FATURAMENTO TISS ---
    { table: "staging_faturamento_xml", name: "idx_tiss_est_lote", ddl: "ALTER TABLE staging_faturamento_xml ADD INDEX idx_tiss_est_lote (estabelecimentoId, numero_lote);" },
    
    // --- INTEG FATURADO (WARLEINE) ---
    { table: "integ_faturado", name: "idx_warleine_est_mes", ddl: "ALTER TABLE integ_faturado ADD INDEX idx_warleine_est_mes (estabelecimento_id, mesprod);" }
  ];

  for (const idx of indexes) {
    try {
      console.log(`⏳ Criando índice ${idx.name} na tabela ${idx.table}...`);
      await db.execute(sql.raw(idx.ddl));
      console.log(`✅ Índice ${idx.name} criado com sucesso!`);
    } catch (error: any) {
      if (error.code === "ER_DUP_KEYNAME") {
        console.log(`⚠️ Índice ${idx.name} já existe. Pulando...`);
      } else {
        console.error(`❌ Erro ao criar ${idx.name}:`, error.message);
      }
    }
  }

  console.log("✨ Otimização concluída! Consultas devem estar 10-100x mais rápidas.");
  process.exit(0);
}

run().catch(console.error);
