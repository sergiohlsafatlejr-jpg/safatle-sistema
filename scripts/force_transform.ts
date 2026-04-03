import 'dotenv/config';
import { getDb } from '../server/db.ts';
import { queryConfiguracoes } from '../drizzle/schema-integracao.ts';
import { eq } from 'drizzle-orm';
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
  console.log("Forcing TRPC TRANSFORMATION on configId:", config.id);

  const caller = appRouter.createCaller({ user: { id: 1, name: 'Admin', role: 'admin', permissoesGlobais: ['*'] } as any } as any);

  try {
    const transRes = await caller.integradorDados.transformarParaAtendimentos({ configId: config.id });
    console.log("Transform result:", transRes);
  } catch (err) {
    console.error("Transform error:", err);
  }

  process.exit(0);
}

run().catch(console.error);
