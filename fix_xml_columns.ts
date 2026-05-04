import "dotenv/config";
import { getDb } from "./server/db.js";

async function run() {
  const db = await getDb();
  if (!db) return;

  try {
    await db.execute(`
      ALTER TABLE conciliados_automatico 
      ADD COLUMN xmlRecursoGerado TINYINT(1) DEFAULT 0,
      ADD COLUMN xmlRecursoData DATETIME DEFAULT NULL,
      ADD COLUMN xmlRecursoLoteId INT DEFAULT NULL
    `);
    console.log("Colunas adicionadas com sucesso!");
  } catch (e: any) {
    if (e.message?.includes("Duplicate column")) {
      console.log("Colunas já existem, OK!");
    } else {
      console.error("Erro:", e.message);
    }
  }

  // Verificar se a tabela xml_recursos_gerados existe
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS xml_recursos_gerados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        estabelecimentoId INT NOT NULL,
        convenioId INT,
        convenioNome VARCHAR(255),
        competencia VARCHAR(20),
        guiasIncluidas TEXT,
        totalGuias INT DEFAULT 0,
        totalItens INT DEFAULT 0,
        valorTotalGlosado DECIMAL(15,4) DEFAULT 0,
        xmlUrl TEXT,
        xmlKey VARCHAR(500),
        nomeArquivo VARCHAR(255),
        tipo VARCHAR(50) DEFAULT 'individual',
        userId INT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Tabela xml_recursos_gerados OK!");
  } catch (e: any) {
    console.error("Erro tabela:", e.message);
  }

  process.exit(0);
}
run();
