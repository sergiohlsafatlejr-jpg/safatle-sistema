import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

async function main() {
  console.log("=== Verificando registros sem estabelecimento ===\n");

  // Verificar estabelecimentos existentes
  const estabelecimentos = await db.execute(sql`SELECT id, nome FROM estabelecimentos ORDER BY id`);
  console.log("Estabelecimentos cadastrados:");
  for (const est of estabelecimentos[0]) {
    console.log(`  - ID ${est.id}: ${est.nome}`);
  }
  console.log("");

  // Verificar arquivos sem estabelecimento
  const arquivosSemEst = await db.execute(sql`
    SELECT COUNT(*) as total FROM arquivos WHERE estabelecimentoId IS NULL
  `);
  console.log(`Arquivos sem estabelecimento: ${arquivosSemEst[0][0].total}`);

  // Verificar convênios sem estabelecimento
  const conveniosSemEst = await db.execute(sql`
    SELECT COUNT(*) as total FROM convenios WHERE estabelecimentoId IS NULL
  `);
  console.log(`Convênios sem estabelecimento: ${conveniosSemEst[0][0].total}`);

  // Verificar tabelas de preço sem estabelecimento
  const tabelasSemEst = await db.execute(sql`
    SELECT COUNT(*) as total FROM tabelasPreco WHERE estabelecimentoId IS NULL
  `);
  console.log(`Tabelas de preço sem estabelecimento: ${tabelasSemEst[0][0].total}`);

  // Verificar regras de negócio sem estabelecimento
  const regrasSemEst = await db.execute(sql`
    SELECT COUNT(*) as total FROM regrasNegocio WHERE estabelecimentoId IS NULL
  `);
  console.log(`Regras de negócio sem estabelecimento: ${regrasSemEst[0][0].total}`);

  console.log("\n=== Atualizando registros ===\n");

  // Se houver apenas um estabelecimento, associar todos os registros a ele
  if (estabelecimentos[0].length === 1) {
    const estabelecimentoId = estabelecimentos[0][0].id;
    console.log(`Associando todos os registros ao estabelecimento ID ${estabelecimentoId} (${estabelecimentos[0][0].nome})`);

    // Atualizar arquivos
    const arquivosUpdate = await db.execute(sql`
      UPDATE arquivos SET estabelecimentoId = ${estabelecimentoId} WHERE estabelecimentoId IS NULL
    `);
    console.log(`  - Arquivos atualizados: ${arquivosUpdate[0].affectedRows || 0}`);

    // Atualizar convênios
    const conveniosUpdate = await db.execute(sql`
      UPDATE convenios SET estabelecimentoId = ${estabelecimentoId} WHERE estabelecimentoId IS NULL
    `);
    console.log(`  - Convênios atualizados: ${conveniosUpdate[0].affectedRows || 0}`);

    // Atualizar tabelas de preço
    const tabelasUpdate = await db.execute(sql`
      UPDATE tabelasPreco SET estabelecimentoId = ${estabelecimentoId} WHERE estabelecimentoId IS NULL
    `);
    console.log(`  - Tabelas de preço atualizadas: ${tabelasUpdate[0].affectedRows || 0}`);

    // Atualizar regras de negócio
    const regrasUpdate = await db.execute(sql`
      UPDATE regrasNegocio SET estabelecimentoId = ${estabelecimentoId} WHERE estabelecimentoId IS NULL
    `);
    console.log(`  - Regras de negócio atualizadas: ${regrasUpdate[0].affectedRows || 0}`);

  } else if (estabelecimentos[0].length > 1) {
    // Se houver mais de um estabelecimento, precisamos de uma estratégia
    console.log("Múltiplos estabelecimentos encontrados. Associando ao primeiro estabelecimento (ID 1)...");
    
    const estabelecimentoId = estabelecimentos[0][0].id;

    // Atualizar arquivos
    const arquivosUpdate = await db.execute(sql`
      UPDATE arquivos SET estabelecimentoId = ${estabelecimentoId} WHERE estabelecimentoId IS NULL
    `);
    console.log(`  - Arquivos atualizados: ${arquivosUpdate[0].affectedRows || 0}`);

    // Atualizar convênios
    const conveniosUpdate = await db.execute(sql`
      UPDATE convenios SET estabelecimentoId = ${estabelecimentoId} WHERE estabelecimentoId IS NULL
    `);
    console.log(`  - Convênios atualizados: ${conveniosUpdate[0].affectedRows || 0}`);

    // Atualizar tabelas de preço
    const tabelasUpdate = await db.execute(sql`
      UPDATE tabelasPreco SET estabelecimentoId = ${estabelecimentoId} WHERE estabelecimentoId IS NULL
    `);
    console.log(`  - Tabelas de preço atualizadas: ${tabelasUpdate[0].affectedRows || 0}`);

    // Atualizar regras de negócio
    const regrasUpdate = await db.execute(sql`
      UPDATE regrasNegocio SET estabelecimentoId = ${estabelecimentoId} WHERE estabelecimentoId IS NULL
    `);
    console.log(`  - Regras de negócio atualizadas: ${regrasUpdate[0].affectedRows || 0}`);

  } else {
    console.log("Nenhum estabelecimento cadastrado. Por favor, cadastre um estabelecimento primeiro.");
  }

  console.log("\n=== Verificação final ===\n");

  // Verificar novamente
  const arquivosFinal = await db.execute(sql`
    SELECT COUNT(*) as total FROM arquivos WHERE estabelecimentoId IS NULL
  `);
  console.log(`Arquivos sem estabelecimento: ${arquivosFinal[0][0].total}`);

  const conveniosFinal = await db.execute(sql`
    SELECT COUNT(*) as total FROM convenios WHERE estabelecimentoId IS NULL
  `);
  console.log(`Convênios sem estabelecimento: ${conveniosFinal[0][0].total}`);

  const tabelasFinal = await db.execute(sql`
    SELECT COUNT(*) as total FROM tabelasPreco WHERE estabelecimentoId IS NULL
  `);
  console.log(`Tabelas de preço sem estabelecimento: ${tabelasFinal[0][0].total}`);

  const regrasFinal = await db.execute(sql`
    SELECT COUNT(*) as total FROM regrasNegocio WHERE estabelecimentoId IS NULL
  `);
  console.log(`Regras de negócio sem estabelecimento: ${regrasFinal[0][0].total}`);

  console.log("\n=== Concluído ===");
  process.exit(0);
}

main().catch(err => {
  console.error("Erro:", err);
  process.exit(1);
});
