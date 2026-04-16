import mysql from "mysql2/promise";
import "dotenv/config";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL as string);

  try {
    await connection.execute(`
      ALTER TABLE contratos_convenios 
      ADD COLUMN emailContato VARCHAR(255) DEFAULT NULL,
      ADD COLUMN reajusteProposto DECIMAL(5,2) DEFAULT NULL,
      ADD COLUMN modeloEmailProposta TEXT DEFAULT NULL,
      ADD COLUMN dataEnvioProposta DATE DEFAULT NULL;
    `);
    console.log("Colunas de negociação adicionadas na tabela contratos_convenios.");
    process.exit(0);
  } catch (err: any) {
    // se já existir, ignora
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("Colunas já existem.");
      process.exit(0);
    }
    console.error("Erro:", err);
    process.exit(1);
  }
}

main();
