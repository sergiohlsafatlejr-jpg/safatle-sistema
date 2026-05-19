import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

async function main() {
  const db = await getDb();
  
  console.log("Alterando enum tipoArquivo...");
  await db.execute(sql`ALTER TABLE arquivos MODIFY COLUMN tipoArquivo ENUM('xml', 'excel', 'pdf', 'csv', 'rh_folha') NOT NULL`);
  
  console.log("Alterando enum direcao...");
  await db.execute(sql`ALTER TABLE arquivos MODIFY COLUMN direcao ENUM('enviado', 'retornado', 'rh') NOT NULL`);
  
  console.log("Criando tabela rh_folha_pagamento...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rh_folha_pagamento (
      id int AUTO_INCREMENT PRIMARY KEY,
      arquivoId int NOT NULL,
      estabelecimentoId int NOT NULL,
      competencia varchar(20),
      colaboradorNome varchar(255),
      colaboradorEmail varchar(255),
      dataAdmissao timestamp,
      sexo varchar(20),
      filhos varchar(10),
      tipoContrato varchar(50),
      empresa varchar(255),
      cnpj varchar(50),
      unidade varchar(255),
      cpf varchar(50),
      dataNascimento timestamp,
      cargo varchar(255),
      salarioBruto decimal(12,2),
      diasUteis int,
      correcao decimal(12,2),
      valorPagar decimal(12,2),
      vt decimal(12,2),
      combustivel decimal(12,2),
      alimentacao decimal(12,2),
      ajudaCusto decimal(12,2),
      sobreAviso decimal(12,2),
      academia decimal(12,2),
      somaBeneficios decimal(12,2),
      descontoFixo decimal(12,2),
      descontosVariaveis decimal(12,2),
      descontoUniforme decimal(12,2),
      unimed decimal(12,2),
      coparticipacao decimal(12,2),
      cargoConfianca varchar(255),
      pontualidade varchar(255),
      createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
  
  console.log("Finalizado!");
  process.exit(0);
}

main().catch(console.error);
