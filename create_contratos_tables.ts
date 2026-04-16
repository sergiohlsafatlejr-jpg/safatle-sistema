import mysql from "mysql2/promise";
import "dotenv/config";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL as string);

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contratos_convenios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        estabelecimentoId INT NOT NULL,
        convenioId INT NOT NULL,
        numeroContrato VARCHAR(50),
        dataInicio DATE,
        dataFim DATE,
        diasAvisoVencimento INT DEFAULT 45,
        status ENUM('ativo', 'vencendo', 'vencido', 'inativo', 'renovado') DEFAULT 'ativo',
        observacoes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log("Tabela contratos_convenios criada.");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contratos_tabelas_fechadas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contratoId INT NOT NULL,
        nomeTabela VARCHAR(255) NOT NULL,
        tipoItem VARCHAR(100),
        arquivoUrl TEXT,
        observacoes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log("Tabela contratos_tabelas_fechadas criada.");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contratos_tabelas_valores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tabelaId INT NOT NULL,
        codigoProcedimento VARCHAR(50),
        nomeProcedimento VARCHAR(255),
        valorAcordado DECIMAL(10, 2),
        codigoPorte VARCHAR(50),
        ativo BOOLEAN DEFAULT true
      );
    `);
    console.log("Tabela contratos_tabelas_valores criada.");

    process.exit(0);

  } catch (err) {
    console.error("Erro:", err);
    process.exit(1);
  }
}

main();
