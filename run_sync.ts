import { db } from './server/db.ts';
import { queryConfiguracoes } from './drizzle/schema-integracao.ts';
import { eq } from 'drizzle-orm';
import { dataSyncEngine } from './server/dataSyncEngine.ts';

async function run() {
  const cnfs = await db.select().from(queryConfiguracoes).where(eq(queryConfiguracoes.id, 103));
  if (cnfs.length > 0) {
     const cfg = cnfs[0];
     try {
       // Parse conexaoConfig just like IntegradorDados router does
       let conexao = cfg.conexaoConfig;
       if (typeof conexao === 'string') {
         conexao = JSON.parse(conexao);
       }
       const fullCfg = { ...cfg, conexaoConfig: conexao };
       console.log('Iniciando sincronizacao direta via Script (limitado a 50mil)...');
       const res = await dataSyncEngine.sincronizar(fullCfg);
       console.log('Resultado completo:', res);
       
       // Verificando quantos registros ficaram no banco local:
       const [rows] = await db.execute(`SELECT count(*) as cnt FROM tasy_faturado_itens_bi`);
       console.log('Total inserido no DB local:', rows[0].cnt);

     } catch(e) {
       console.error('ERRO FATAL SCRIPT:', e);
     }
  }
}

run().then(() => process.exit(0)).catch(console.error);
