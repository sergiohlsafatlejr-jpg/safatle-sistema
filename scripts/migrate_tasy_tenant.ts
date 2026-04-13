import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log("Adicionando estabelecimentoId na tabela tasy_protocolo_bi...");
  try {
    await conn.execute("ALTER TABLE tasy_protocolo_bi ADD COLUMN estabelecimentoId INT DEFAULT NULL AFTER configId;");
    console.log("Coluna adicionada com sucesso!");
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("A coluna estabelecimentoId já existe.");
    } else {
      console.error("Erro ao alterar tabela:", err);
    }
  }

  // Opcional: Popular com base na configId
  try {
    await conn.execute(`
      UPDATE tasy_protocolo_bi t 
      JOIN integracao_conexoes c ON t.configId = c.id 
      SET t.estabelecimentoId = c.estabelecimentoId 
      WHERE t.estabelecimentoId IS NULL;
    `);
    console.log("Registros órfãos associados aos seus hospitais com sucesso!");
  } catch (err: any) {
    console.error("Erro ao popular histórico:", err);
  }

  process.exit(0);
}
main();
