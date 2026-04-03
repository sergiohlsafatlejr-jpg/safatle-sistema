import { getDb } from "../db.js";
import { contasConvenioResumo, contasConvenioItens, prontuarioPrescricoes } from "../../drizzle/schema.js";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed");
    process.exit(1);
  }

  const estabelecimentoId = 1;
  const numeroConta = "TESTE-100";
  const convenioId = 1;

  console.log("Injetando Conta Simulada...");
  await db.insert(contasConvenioResumo).values({
    numeroConta,
    estabelecimentoId,
    origem: "XML",
    totalItens: 2,
    valorTotal: "150.00",
    statusAnalise: "pendente",
    convenioId,
  });

  console.log("Injetando Itens da Conta...");
  await db.insert(contasConvenioItens).values([
    {
      numeroConta,
      estabelecimentoId,
      origem: "XML",
      convenioId,
      tipoItem: "MEDICAMENTO",
      codigoItem: "MED01",
      descricaoItem: "DIPIRONA INJETAVEL",
      quantidade: "1",
      valorUnitario: "50.00",
      valorTotal: "50.00",
      statusAnalise: "pendente",
    },
    {
      numeroConta,
      estabelecimentoId,
      origem: "XML",
      convenioId,
      tipoItem: "MATERIAL",
      codigoItem: "MAT01",
      descricaoItem: "SERINGA 10ML",
      quantidade: "2",
      valorUnitario: "50.00",
      valorTotal: "100.00",
      statusAnalise: "pendente",
    }
  ]);

  console.log("Criando tabelas...");
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS prontuario_prescricoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      numeroConta VARCHAR(100) NOT NULL,
      estabelecimentoId INT NOT NULL,
      dataPrescricao TIMESTAMP,
      medico VARCHAR(255),
      crm VARCHAR(50),
      codigoItem VARCHAR(50),
      descricaoItem VARCHAR(255),
      quantidade DECIMAL(10,2),
      viaAdministracao VARCHAR(100),
      frequencia VARCHAR(100),
      origem VARCHAR(50) DEFAULT 'INTEGRACAO',
      criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log("Injetando Prescrições Clínicas Simuladas (Mock)...");
  await db.insert(prontuarioPrescricoes).values([
    {
      numeroConta,
      estabelecimentoId,
      dataPrescricao: new Date(),
      codigoItem: "MED01",
      descricaoItem: "DIPIRONA INJETAVEL",
      quantidade: "1",
      viaAdministracao: "EV",
      frequencia: "6/6H",
      medico: "DR SEED",
    },
    {
      numeroConta,
      estabelecimentoId,
      dataPrescricao: new Date(),
      codigoItem: "MED02",
      descricaoItem: "PARACETAMOL 750MG", // Este medicamento foi prescrito mas NÃO ESTÁ NA CONTA (PRESCRICAO_FALTANTE_NA_COBRANCA)
      quantidade: "1",
      viaAdministracao: "VO",
      frequencia: "SN",
      medico: "DR SEED",
    }
  ]);

  console.log("✔ Mock Injetado com Sucesso!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
