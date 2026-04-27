import "dotenv/config";
import { dataSyncEngine } from "./server/dataSyncEngine.js";
import { getDb } from "./server/db.js";
import { queryConfiguracoes } from "./drizzle/schema-integracao.js";
import { inArray } from "drizzle-orm";

async function run() {
  try {
    const db = await getDb();
    if (!db) throw new Error("No DB");
    
    const configs = await db.select().from(queryConfiguracoes).where(inArray(queryConfiguracoes.id, [101, 104]));
    
    for (const config of configs) {
      let conexao = config.conexaoConfig;
      if (typeof conexao === "string") conexao = JSON.parse(conexao);
      
      const syncConfigModel = {
        configId: config.id,
        sistema: config.sistema,
        tipoDados: config.tipoDados,
        estabelecimentoId: config.estabelecimentoId,
        querySql: config.querySql,
        frequencia: config.frequencia as any,
        conexaoConfig: conexao as any
      };

      console.log(`Iniciando sync manual para configId ${config.id}...`);
      const res = await dataSyncEngine.sincronizar(syncConfigModel);
      console.log(`Resultado configId ${config.id}:`, res);
    }

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
