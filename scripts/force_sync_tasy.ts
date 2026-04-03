import 'dotenv/config';
import { getDb } from '../server/db.ts';
import { queryConfiguracoes, tasyMaternidadeElaAtendimentosStaging } from '../drizzle/schema-integracao.ts';
import { eq } from 'drizzle-orm';
import { dataSyncEngine } from '../server/dataSyncEngine.ts';
import { appRouter } from '../server/routers.ts';

async function run() {
  const db = await getDb();
  if (!db) return;

  const tasyConfigs = await db.select().from(queryConfiguracoes).where(eq(queryConfiguracoes.sistema, 'tasy'));
  if (tasyConfigs.length === 0) {
    console.log("No TASY configs found!");
    process.exit(1);
  }

  const config = tasyConfigs[0];
  console.log("Found TASY config ID:", config.id);

  console.log(">>> Phase 1: SYNCING FROM ORACLE...");
  const syncModel = {
    configId: config.id,
    sistema: config.sistema,
    tipoDados: config.tipoDados,
    estabelecimentoId: config.estabelecimentoId,
    querySql: config.querySql,
    frequencia: config.frequencia as any,
    conexaoConfig: typeof config.conexaoConfig === 'string' ? JSON.parse(config.conexaoConfig) : config.conexaoConfig
  };

  const syncRes = await dataSyncEngine.sincronizar(syncModel);
  console.log("Sync result:", syncRes);

  console.log(">>> Phase 2: CHECKING MYSQL STAGING DB...");
  const stagingCount = await db.select().from(tasyMaternidadeElaAtendimentosStaging).where(eq(tasyMaternidadeElaAtendimentosStaging.configId, config.id));
  console.log(`Staging found ${stagingCount.length} rows for configId ${config.id}`);

  console.log(">>> Phase 3: FORCING TRPC TRANSFORMATION...");
  // Create an internal TRPC caller with fake admin context
  const caller = appRouter.createCaller({ user: { id: 1, name: 'Admin', role: 'admin', permissoesGlobais: ['*'] } as any } as any);

  const transRes = await caller.integradorDados.transformarParaAtendimentos({ configId: config.id });
  console.log("Transform result:", transRes);

  process.exit(0);
}

run().catch(console.error);
