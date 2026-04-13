import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);
  
  // Renomear a tabela antiga se existir, ou criar a nova
  try {
    await db.execute(sql.raw(`RENAME TABLE \`Tasy_maternidadeela_atendimentos_stagion\` TO \`staging_atendimentos_tasy\``));
    console.log("✅ Tabela renomeada de Tasy_maternidadeela_atendimentos_stagion → staging_atendimentos_tasy");
  } catch (e: any) {
    if (e.message?.includes("doesn't exist")) {
      console.log("Tabela antiga não existe, criando staging_atendimentos_tasy do zero...");
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS \`staging_atendimentos_tasy\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`estabelecimentoId\` INT NOT NULL,
          \`configId\` INT,
          \`numeroAtendimento\` VARCHAR(50),
          \`tipoSaida\` VARCHAR(100),
          \`local\` VARCHAR(255),
          \`paciente\` VARCHAR(255),
          \`carater\` VARCHAR(50),
          \`dataAdmissao\` TIMESTAMP NULL,
          \`dataAlta\` TIMESTAMP NULL,
          \`tipoAtendimento\` VARCHAR(100),
          \`servico\` VARCHAR(255),
          \`procedimentoPrincipal\` VARCHAR(255),
          \`centroCusto\` VARCHAR(100),
          \`dadosBrutos\` JSON,
          \`criadoEm\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`atualizadoEm\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`convenio\` VARCHAR(255),
          \`dsCategoria\` VARCHAR(255),
          \`dsPlano\` VARCHAR(255),
          \`competencia\` VARCHAR(20),
          \`referencia\` VARCHAR(20),
          \`protTasy\` VARCHAR(50),
          \`nomeProtocolo\` VARCHAR(255),
          \`protConv\` VARCHAR(100),
          \`dtEntrega\` TIMESTAMP NULL,
          \`protStatus\` VARCHAR(50),
          \`titulo\` VARCHAR(100),
          \`dtTitulo\` TIMESTAMP NULL,
          \`dataVencimento\` TIMESTAMP NULL,
          \`dsSetorEntrada\` VARCHAR(255),
          \`dsSetorLeito\` VARCHAR(255),
          \`etapaConta\` VARCHAR(255),
          \`setorEtapa\` VARCHAR(255),
          \`dtEtapa\` TIMESTAMP NULL,
          \`userEtapa\` VARCHAR(100),
          \`motivoDevolucao\` TEXT,
          \`conta\` VARCHAR(50),
          \`autorizacao\` VARCHAR(100),
          \`matricula\` VARCHAR(100),
          \`sexo\` VARCHAR(10),
          \`idade\` VARCHAR(50),
          \`codServico\` VARCHAR(50),
          \`procedimentoPrincipal2\` VARCHAR(500),
          \`dataInicio\` VARCHAR(20),
          \`dataFim\` VARCHAR(20),
          \`dsMotivoAlta\` VARCHAR(255),
          \`medicoResp\` VARCHAR(255),
          \`crm\` VARCHAR(50),
          \`valorConta\` DECIMAL(15,2),
          INDEX \`idx_tasy_matela_estab\` (\`estabelecimentoId\`),
          INDEX \`idx_tasy_matela_config\` (\`configId\`)
        )
      `));
      console.log("✅ Tabela staging_atendimentos_tasy criada com sucesso!");
    } else {
      throw e;
    }
  }
  
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Erro:", e);
  process.exit(1);
});
